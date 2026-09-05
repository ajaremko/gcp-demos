# blog-admin runbook

Operational reference for running `blog-admin` in production: environment
configuration, reading its logs, and debugging problems.

## Configuring the environment

| Variable              | Type      | Purpose                                                                                     | Visibility | Notes                                                                                                                                                                                                                     |
| --------------------- | --------- | ------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DB_PATH`             | `string`  | SQLite file path (`/data/blog.sqlite` in production)                                        | private    | Throws at startup if unset (not during `next build` - see [`known-issues.md`](./known-issues.md))                                                                                                                         |
| `PAYLOAD_SECRET`      | `string`  | Session/token signing secret                                                                | secret     | Throws at startup if unset                                                                                                                                                                                                |
| `GCS_MEDIA_BUCKET`    | `string`  | Bucket for Payload's upload/media storage                                                   | private    | Throws at startup if unset (outside `NODE_ENV=development`)                                                                                                                                                               |
| `GCS_DATA_BUCKET`     | `string`  | Set on the container, but read only by litestream's generated config, not by Payload itself | private    | Don't expect changing it at runtime to do anything - `litestream.yml` bakes the bucket name in at deploy time                                                                                                             |
| `PORT`                | `number`  | Port the server listens on (`3000`)                                                         | private    |                                                                                                                                                                                                                           |
| `PAYLOAD_CONFIG_PATH` | `string`  | Absolute path to the prebuilt `dist/payload.config.js`, baked into the image                | private    | Set in the Dockerfile, not `service.ts`. Only the `payload` CLI reads it - the server has its own bundled copy. Must stay set to _something_: unset, `findConfig()` falls back to a tsconfig lookup that throws in `/app` |
| `LOG_LEVEL`           | `enum`    | Overrides the default pino level                                                            | private    | Defaults to `info` in production, `trace` otherwise                                                                                                                                                                       |
| `PRETTY_PRINT_LOGS`   | `boolean` | Whether logs are pretty-printed vs. JSON                                                    | private    | Defaults to `true` outside production, `false` in it                                                                                                                                                                      |

## Logging

Server-side logging goes through [pino](https://getpino.io/). A pino instance is passed to Payload and used for it's own internal logging. Payload's own code never logs at `trace` or `fatal` itself, so both are free for this project's own use without colliding with anything loggeed by Payload. Logs from Payload are annotated with a `module: 'payload'` property.

The provided `LOG_LEVEL` is a threshold - logs are emitted for that level as well as everything more severe. Here's what's logged at each level:

| Level   | Events logged                                                              |
| ------- | -------------------------------------------------------------------------- |
| `trace` | Step-by-step internal execution details                                    |
| `debug` | Problems handled internally that didn't change the outcome the caller sees |
| `info`  | Expected events and outcomes                                               |
| `warn`  | Fallbacks and expected/recoverable failures                                |
| `error` | Failures that are unexpected but recoverable                               |
| `fatal` | Missing configuration; startup failure.                                    |

## Startup sequence

The `admin` container's entrypoint (`commands`/`args` in
`packages/blog/infra/src/service.ts`, overriding the Dockerfile's own
`CMD`) copies a generated `run.sh` from a mounted secret and runs it:

1. `mkdir -p /data`, then `litestream restore -if-replica-exists` from the
   GCS data bucket - populates `/data/blog.sqlite` from the last replica,
   if one exists.
2. `scripts/needs-migrate.mjs` - decides whether step 3 has to run at all,
   by reading `payload_migrations` directly with `node:sqlite` and comparing
   it against the files in `dist/migrations/`. This is a bare Node boot
   (~100ms) standing in front of a full Payload boot (seconds). **It reports
   "migrate" on every path it can't establish** - missing DB, missing table,
   unexpected schema, any thrown error - so a pending migration is never
   skipped; the worst case is that it costs what step 3 always used to.
3. `payload migrate --disable-transpile` - **only when step 2 says so.**
   Applies pending migrations, run against the prebuilt
   `dist/payload.config.js` and `dist/migrations/` (produced by
   `scripts/build-config.mjs` during `npm run build`) rather than the raw TS
   source. Payload's CLI otherwise loads the config through tsx's async
   worker-thread path and transpiles the config, every collection and every
   migration on each start - that measured 11-23s (median ~14s) of a ~19s
   cold start, while applying nothing. If you change `payload.config.ts`, a
   collection, or add a migration, the compiled copy only refreshes on a
   rebuild.
4. `exec litestream replicate -exec "node packages/blog/admin/server.js"` -
   starts continuous replication, execing the real Next.js server as its
   subprocess for the life of the container.

Each stage prints a `[startup] +Ns <stage>` marker, so the container log
apportions the cold start directly; a stuck or failing startup is almost
always whichever stage printed last. The `+Ns` deltas are whole seconds
because BusyBox's `date` silently ignores `%N` - for finer resolution use
the Cloud Logging timestamps on the marker lines rather than trying to make
the shell produce milliseconds.

## Readiness vs. liveness

The container's startup probe is an **HTTP GET on `/healthz`
(port 3000), not a TCP check** - see `packages/blog/infra/src/service.ts`.
This matters more than it looks: Next's standalone server binds port 3000
before it has loaded a single route module, so a TCP probe passes while
Payload is still entirely uninitialised. Cloud Run would then call the
instance ready and the first real request would pay for the route module
load, the drizzle schema build and the SQLite open - outside the startup
window, so without `startupCpuBoost`.

`src/app/healthz/route.ts` awaits `getPayload()` for exactly that reason.
`getPayload()` memoises on `globalThis`, so this warms the same instance the
server later serves `/api` from rather than building a second one.

`/healthz` is not reachable from outside: nginx answers its own `/healthz`
for the gateway's probe and only proxies `/admin`, `/api` and `/_next`
through to this container.

## What's in the image

The image serves **two processes with disjoint file needs**, and that's the
only reason its `COPY` lines look redundant:

- the **Next server** (`node packages/blog/admin/server.js`) - long-running,
  serves `/admin`, `/api` and `/_next`
- the **`payload` CLI** (`node node_modules/payload/bin.js migrate`) -
  runs once per container start, step 2 of the startup sequence above,
  then exits

Next's output-file-tracing only follows the _server's_ static import graph.
The CLI is a separate entrypoint in a separate process, so it needs to be copied separately.

| Path in image                  | Built by                   | Consumed by | Notes                                                                                                                                                |
| ------------------------------ | -------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server.js`, `.next/server/**` | `next build`               | Next server | `payload.config.ts` **and** `src/app/admin/importMap.js` are compiled into these chunks - neither is read from disk                                  |
| `.next/static`                 | `next build`               | Next server | Client JS/CSS. Omitted from the standalone output by design; served at `/_next`                                                                      |
| `public/`                      | -                          | Next server | Static web-root files, also absent from the standalone output                                                                                        |
| `dist/payload.config.js`       | `scripts/build-config.mjs` | payload CLI | What `--disable-transpile` loads; `PAYLOAD_CONFIG_PATH` points here                                                                                  |
| `dist/migrations/*.js`         | `scripts/build-config.mjs` | payload CLI | Must sit beside the config - `migrationDir` resolves relative to it                                                                                  |
| `scripts/needs-migrate.mjs`    | -                          | run.sh      | Copied on its own line, **not** via `dist/` - `build-config.mjs` does `rmSync(outDir)` on every build, so it cannot live in there                    |
| `node_modules/`                | `npm install` (deps stage) | **both**    | Overwrites the traced copy so native binaries (sharp/libvips) match Alpine; also the only source of `payload/bin.js`, which the server never imports |

`src/` is deliberately **not** in the image. Both the config and the admin
importMap are bundled into the server chunks, and the CLI reads `dist/`, so
nothing reads the TypeScript source at runtime. The `src` paths that do
appear inside the standalone bundle are `[project]/`-prefixed Turbopack
module identifiers, not filesystem paths.

Two consequences worth knowing:

- **`nx build blog-admin` must run before `docker build`.** Nothing in
  `nx.json` makes `docker:build` depend on `build`, and the Dockerfile only
  copies prebuilt artifacts. A missing `dist/` fails the build outright,
  which is the intended behaviour - better than shipping a stale config.
- **Config and migration changes only reach production via a rebuild**,
  since the CLI reads the compiled copy rather than the source.

## Debugging problems

- **Missing env var at startup** - one of the three guards in
  `payload.config.ts` logs at `fatal` and throws immediately (`<VAR>
environment variable is not set`). Check `service.ts`'s `admin` container
  `envs` against the table above.
- **`/admin` or any request returns 500 in the deployed image but works in
  `nx dev`** - check [`known-issues.md`](./known-issues.md) first
  (sharp/libvips and `next/constants` are both exactly this symptom).
- **Litestream restore/replicate failures** - check the container logs for
  the exact `litestream` error; common causes are the service account
  lacking GCS permissions on the data bucket, or `litestream.yml`'s
  content not matching what's mounted (`cat`'d at the top of `run.sh`'s
  output on every start).
- **Migration failures** - `payload migrate` runs before the server
  starts, so a failing migration blocks startup entirely rather than
  surfacing as a runtime error later.

## What's not covered

No automated test suite (unit or end-to-end) for this package -
confidence in a change relies on the manual verification steps in the
[README](./README.md).
