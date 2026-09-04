# Snip Bundle (generated)

This branch contains **generated release output** — a self-contained,
single-process build of the Snip backend + frontend suitable for deployment
(e.g. Railway, Docker).

**Do not hand-edit files on this branch.** All content here is produced by
`scripts/build-bundle.mjs` on the `main` branch. To update this branch, run
that script from a checkout of `main` with submodules initialized.

## Run locally

```sh
bun start
# Snip running on http://localhost:3000 (serving API + built UI)
```

## Deploy

- **Docker**: `docker build -t snip . && docker run -p 3000:3000 snip`
- **Railway**: `railway.json` selects the Dockerfile builder.
