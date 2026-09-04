# Snip

A tiny URL shortener demonstrating **one backend, two clients**: a single
zero-dependency API server backs both a web frontend and a CLI. Each layer
lives on its own git branch in this repository and is mounted here as a
submodule, so the pieces can be developed, versioned, and deployed
independently while still being cloneable as one project.

## Architecture

```
                     ┌─────────────┐
                     │   backend   │  Bun HTTP server, in-memory store
                     │ (branch)    │  POST /api/links, GET /api/links,
                     └──────┬──────┘  GET /:code (redirect + hit count)
                            │
              ┌─────────────┼─────────────┐
              │                           │
      ┌───────▼───────┐           ┌───────▼───────┐
      │   frontend     │           │      cli       │
      │   (branch)     │           │   (branch)     │
      │ Angular 19 app │           │  Node CLI      │
      └────────────────┘           └────────────────┘
```

Both clients talk to the same backend over plain HTTP/JSON — the frontend
via `HttpClient` in the browser, the CLI via Node's global `fetch`.

## API contract

| Method | Path          | Body / Params      | Response                                                              |
|--------|---------------|---------------------|------------------------------------------------------------------------|
| POST   | `/api/links`  | `{ "url": string }` | `201 { code, url, shortUrl, hits, createdAt }` or `400 { error }`      |
| GET    | `/api/links`  | —                   | `200 [{ code, url, shortUrl, hits, createdAt }, ...]`                  |
| GET    | `/:code`      | —                   | `302` redirect to the original URL (increments `hits`), `404` if unknown |

Base URL defaults to `http://localhost:3000` (backend: `PORT`/`BASE_URL` env
vars; frontend: hardcoded in `snip.service.ts`; CLI: `SNIP_API` env var).

## Branch-per-layer + submodule layout

| Branch     | Path (as submodule) | Contents                                      |
|------------|----------------------|------------------------------------------------|
| `backend`  | `backend/`           | `server.js`, `package.json`, `README.md`       |
| `frontend` | `frontend/`          | Angular 19 app (`snip-frontend`)               |
| `cli`      | `cli/`               | `cli.js`, `package.json`, wrapper scripts       |
| `main`     | (superproject root)  | `.gitmodules`, this README                     |

Each branch is an independent, orphaned history — it has no shared ancestry
with `main` or the other branches. `main` only tracks *which commit* of each
branch is currently mounted, via the submodule gitlink.

## Cloning

Plain `git clone` leaves submodule folders **empty** (only gitlinks are
recorded in the superproject). Always clone with `--recurse-submodules`:

```sh
git clone --recurse-submodules https://github.com/jacky969123/Day1Workshop.git
cd Day1Workshop
```

If you already cloned without it:

```sh
git submodule update --init --recursive
```

## Running all three pieces

**Backend** (from `backend/`):

```sh
bun start   # or: bun server.js
# Snip backend running on http://localhost:3000
```

**Frontend** (from `frontend/`):

```sh
npm install
npx ng serve
# open http://localhost:4200
```

**CLI** (from `cli/`):

```sh
node cli.js help
node cli.js add https://example.com/some/long/path
node cli.js ls
node cli.js open <code>
```

## Update workflow

Submodules are independent checkouts of their branch — changes are made and
pushed from *inside* the submodule folder, then the superproject's pointer
to that commit is bumped separately:

```sh
# 1. Make changes inside the submodule and push them on its own branch
cd backend
git add -A
git commit -m "Fix hit counter race"
git push origin backend

# 2. Back in the superproject root, pull the latest commit for that submodule
cd ..
git submodule update --remote backend

# 3. Stage and commit the pointer bump
git add backend
git commit -m "Bump backend submodule"
git push origin main
```

Repeat the same three steps for `frontend` and `cli` as needed.
