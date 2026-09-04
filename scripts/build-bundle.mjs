#!/usr/bin/env node
// scripts/build-bundle.mjs
//
// Assembles the `bundle` submodule: a self-contained, single-process build of
// the Snip backend + frontend suitable for deployment (Railway, Docker, etc).
//
// Usage:
//   node scripts/build-bundle.mjs          # assemble locally, do not push
//   node scripts/build-bundle.mjs --push   # assemble, commit, and push
//
// Safe to run repeatedly: if nothing changed, it is a no-op (no empty commits,
// no pushes).

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, cpSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BACKEND_DIR = path.join(ROOT, 'backend');
const FRONTEND_DIR = path.join(ROOT, 'frontend');
const CLI_DIR = path.join(ROOT, 'cli');
const BUNDLE_DIR = path.join(ROOT, 'bundle');
const FRONTEND_DIST = path.join(FRONTEND_DIR, 'dist', 'snip-frontend', 'browser');

const PUSH = process.argv.includes('--push');
const SHELL = process.platform === 'win32' ? 'cmd.exe' : 'bash';

function run(command, cwd) {
  console.log(`\n$ ${command}${cwd ? `  (in ${path.relative(ROOT, cwd) || '.'})` : ''}`);
  execSync(command, { cwd: cwd || ROOT, stdio: 'inherit', shell: SHELL });
}

function runCapture(command, cwd) {
  return execSync(command, { cwd: cwd || ROOT, shell: SHELL }).toString().trim();
}

function fail(message) {
  console.error(`\nERROR: ${message}`);
  process.exit(1);
}

console.log('== Step 1: update backend/frontend/cli submodules to their branch tips ==');
run('git submodule update --init --remote backend frontend cli');

console.log('\n== Step 2: build the frontend ==');
run('npm install', FRONTEND_DIR);
run('npx ng build', FRONTEND_DIR);

const frontendIndex = path.join(FRONTEND_DIST, 'index.html');
if (!existsSync(frontendIndex)) {
  fail(
    `Expected frontend build output at ${path.relative(ROOT, frontendIndex)} but it is missing. ` +
      'Check the Angular build output path / project name has not changed.'
  );
}
console.log(`Frontend build output verified at ${path.relative(ROOT, frontendIndex)}`);

console.log('\n== Step 3: assemble bundle/ ==');

const backendServerSrc = path.join(BACKEND_DIR, 'server.js');
const cliSrc = path.join(CLI_DIR, 'cli.js');

if (!existsSync(backendServerSrc)) fail(`Missing ${backendServerSrc}`);
if (!existsSync(cliSrc)) fail(`Missing ${cliSrc}`);

cpSync(backendServerSrc, path.join(BUNDLE_DIR, 'server.js'));
cpSync(cliSrc, path.join(BUNDLE_DIR, 'cli.js'));

const bundlePublic = path.join(BUNDLE_DIR, 'public');
rmSync(bundlePublic, { recursive: true, force: true });
mkdirSync(bundlePublic, { recursive: true });
cpSync(FRONTEND_DIST, bundlePublic, { recursive: true });

writeFileSync(path.join(BUNDLE_DIR, '.env'), 'PUBLIC_DIR=./public\n');

// No "type" field: cli.js must keep running under plain CommonJS `node`.
const bundlePackageJson = {
  name: 'snip-bundle',
  version: '1.0.0',
  private: true,
  description: 'Generated Snip release bundle (backend + built frontend, single process)',
  scripts: {
    start: 'bun server.js',
  },
  engines: {
    bun: '>=1.0.0',
  },
};
writeFileSync(path.join(BUNDLE_DIR, 'package.json'), JSON.stringify(bundlePackageJson, null, 2) + '\n');

const dockerfile = `FROM oven/bun:1-alpine
WORKDIR /app
COPY . .
ENV PORT=3000
EXPOSE 3000
CMD ["bun", "server.js"]
`;
writeFileSync(path.join(BUNDLE_DIR, 'Dockerfile'), dockerfile);

const dockerignore = `node_modules
.git
.env
*.log
`;
writeFileSync(path.join(BUNDLE_DIR, '.dockerignore'), dockerignore);

const railwayJson = {
  $schema: 'https://railway.app/railway.schema.json',
  build: {
    builder: 'DOCKERFILE',
    dockerfilePath: 'Dockerfile',
  },
  deploy: {
    startCommand: 'bun server.js',
    restartPolicyType: 'ON_FAILURE',
    restartPolicyMaxRetries: 10,
  },
};
writeFileSync(path.join(BUNDLE_DIR, 'railway.json'), JSON.stringify(railwayJson, null, 2) + '\n');

const bundleReadme = `# Snip Bundle (generated)

This branch contains **generated release output** — a self-contained,
single-process build of the Snip backend + frontend suitable for deployment
(e.g. Railway, Docker).

**Do not hand-edit files on this branch.** All content here is produced by
\`scripts/build-bundle.mjs\` on the \`main\` branch. To update this branch, run
that script from a checkout of \`main\` with submodules initialized.

## Run locally

\`\`\`sh
bun start
# Snip running on http://localhost:3000 (serving API + built UI)
\`\`\`

## Deploy

- **Docker**: \`docker build -t snip . && docker run -p 3000:3000 snip\`
- **Railway**: \`railway.json\` selects the Dockerfile builder.
`;
writeFileSync(path.join(BUNDLE_DIR, 'README.md'), bundleReadme);

console.log('Bundle assembled.');

console.log('\n== Step 4: commit inside bundle/ (only if something changed) ==');
run('git add -A', BUNDLE_DIR);
const bundleStaged = runCapture('git diff --cached --name-only', BUNDLE_DIR);

let bundleChanged = false;
if (bundleStaged.length === 0) {
  console.log('Bundle unchanged. Nothing to commit.');
} else {
  bundleChanged = true;
  console.log(`Bundle changed:\n${bundleStaged}`);
  run('git commit -m "Rebuild bundle from backend/frontend/cli"', BUNDLE_DIR);
}

console.log('\n== Step 5: bump submodule pointers in the superproject (only if changed) ==');
run('git add backend frontend cli bundle');
const rootStaged = runCapture('git diff --cached --name-only');

let rootChanged = false;
if (rootStaged.length === 0) {
  console.log('Superproject submodule pointers unchanged. Nothing to commit.');
} else {
  rootChanged = true;
  console.log(`Superproject changes:\n${rootStaged}`);
  run('git commit -m "Bump backend/frontend/cli/bundle submodule pointers"');
}

if (!PUSH) {
  console.log('\nDone (local only). Re-run with --push to push bundle and main.');
  process.exit(0);
}

console.log('\n== Step 6: push (--push was passed) ==');

// Check for commits not yet on the remote branch, not just commits made in
// *this* invocation — a prior run without --push may have already committed
// locally. Submodule checkouts are often in a detached HEAD state, so push
// HEAD explicitly to the named branch ref on the remote rather than relying
// on an upstream tracking branch.
function hasUnpushedCommits(cwd, branch) {
  try {
    execSync(`git fetch origin ${branch}`, { cwd, shell: SHELL, stdio: 'pipe' });
  } catch {
    // Remote branch may not exist yet; treat as "everything is unpushed".
    return true;
  }
  const ahead = runCapture(`git rev-list origin/${branch}..HEAD --count`, cwd);
  return ahead !== '0';
}

if (bundleChanged || hasUnpushedCommits(BUNDLE_DIR, 'bundle')) {
  run('git push origin HEAD:bundle', BUNDLE_DIR);
} else {
  console.log('No bundle commit to push.');
}

if (rootChanged || hasUnpushedCommits(ROOT, 'main')) {
  run('git push origin HEAD:main');
} else {
  console.log('No main commit to push.');
}

console.log('\nAll done.');
