#!/usr/bin/env node
'use strict';

const { spawn } = require('child_process');

const BASE_URL = (process.env.SNIP_API || 'http://localhost:3000').replace(/\/+$/, '');

function usage() {
  return [
    'Usage: snip <command> [args]',
    '',
    'Commands:',
    '  add <url>    Shorten a URL',
    '  ls           List all links',
    '  open <code>  Open the target of a short code in your browser',
    '  help         Show this help text',
    '',
    'Environment:',
    `  SNIP_API     Backend base URL (default: http://localhost:3000)`,
  ].join('\n');
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function cmdAdd(url) {
  if (!url) {
    fail('Error: missing <url>.\n\n' + usage());
    return;
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}/api/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
  } catch (err) {
    fail(`Error: could not reach backend at ${BASE_URL} (${err.message})`);
    return;
  }

  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const message = (body && body.error) || `HTTP ${res.status}`;
    fail(`Error: ${message}`);
    return;
  }

  console.log(body.shortUrl);
}

async function cmdLs() {
  let res;
  try {
    res = await fetch(`${BASE_URL}/api/links`);
  } catch (err) {
    fail(`Error: could not reach backend at ${BASE_URL} (${err.message})`);
    return;
  }

  if (!res.ok) {
    fail(`Error: HTTP ${res.status}`);
    return;
  }

  const links = await res.json();

  if (!Array.isArray(links) || links.length === 0) {
    console.log('No links yet.');
    return;
  }

  const codeWidth = Math.max(4, ...links.map((l) => String(l.code).length));
  const hitsWidth = Math.max(4, ...links.map((l) => String(l.hits).length));

  const header = `${'CODE'.padEnd(codeWidth)}  ${'HITS'.padEnd(hitsWidth)}  URL`;
  console.log(header);

  for (const link of links) {
    const code = String(link.code).padEnd(codeWidth);
    const hits = String(link.hits).padEnd(hitsWidth);
    console.log(`${code}  ${hits}  ${link.url}`);
  }
}

function openInBrowser(target) {
  const platform = process.platform;
  let command;
  let args;

  if (platform === 'win32') {
    command = 'cmd';
    args = ['/c', 'start', '""', target];
  } else if (platform === 'darwin') {
    command = 'open';
    args = [target];
  } else {
    command = 'xdg-open';
    args = [target];
  }

  const child = spawn(command, args, { stdio: 'ignore', detached: true });
  child.unref();
}

async function cmdOpen(code) {
  if (!code) {
    fail('Error: missing <code>.\n\n' + usage());
    return;
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}/${code}`, { redirect: 'manual' });
  } catch (err) {
    fail(`Error: could not reach backend at ${BASE_URL} (${err.message})`);
    return;
  }

  const location = res.headers.get('location');

  if (res.status < 300 || res.status >= 400 || !location) {
    fail(`Error: unknown code '${code}'`);
    return;
  }

  console.log(location);
  openInBrowser(location);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case 'add':
      await cmdAdd(args[0]);
      break;
    case 'ls':
      await cmdLs();
      break;
    case 'open':
      await cmdOpen(args[0]);
      break;
    case 'help':
    case '--help':
    case '-h':
      console.log(usage());
      break;
    case undefined:
      console.log(usage());
      break;
    default:
      fail(`Error: unknown command '${command}'\n\n${usage()}`);
  }
}

main().catch((err) => {
  fail(`Error: ${err.message}`);
});
