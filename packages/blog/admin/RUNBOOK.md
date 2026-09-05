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

## Cold starts

Most of what looks unusual about this container's startup is there to make cold
starts shorter, so it's worth stating plainly why they matter here:

- The service runs `minInstanceCount: 0` / `maxInstanceCount: 1`
  (`packages/blog/infra/src/service.ts`). Every idle period ends in a full cold
  start, and there is never a second, already-warm instance to answer the
  request while a new one boots.
- The `gateway` container - the only one bound to the service port - starts
  only after both other containers' startup probes have passed (`dependsOns`),
  and this container is much the heavier of the two - a restore, a migrate
  decision, then a full Next + Payload boot, against the website's single Node
  process. **In practice this container's boot time is the service's
  time-to-first-byte**, which is why a backend detail is directly user-visible
  and why the work below is worth doing at all.

### What's been done about it

| Optimization                            | Lives in                                          | What it buys                                          |
| --------------------------------------- | ------------------------------------------------- | ----------------------------------------------------- |
| Prebuilt config + `--disable-transpile` | `build-config.mjs`, `PAYLOAD_CONFIG_PATH`, step 3 | 11-23s, median ~14s - **measured**                    |
| `needs-migrate.mjs` guard               | `scripts/needs-migrate.mjs`, step 2               | A whole Payload boot, on starts with nothing to apply |
| `/healthz` startup probe                | `src/app/healthz/route.ts`, the `startupProbe`    | Payload's init moves out of the user's first request  |
| `[startup] +Ns` markers                 | the `stage()` helper in `run.sh`                  | Not an optimization - how the other three get judged  |

Each is explained where it happens: the first two under "Startup sequence"
below, the probe under "Readiness vs. liveness".

### Measuring a cold start

Let the service scale to zero, then time two requests back to back:

```
curl -s -o /dev/null -w 'cold: %{time_total}s\n' <service-url>/
curl -s -o /dev/null -w 'warm: %{time_total}s\n' <service-url>/
```

The **gap between them** is the useful number. It is work that Cloud Run
already considered "ready" - something still initialising lazily inside the
first request, which means a startup probe isn't covering it. That is the exact
failure the `/healthz` probe was introduced to fix, so a large gap means it has
regressed or something new has started initialising late.

To apportion the boot itself, read the `[startup] +Ns` markers in the admin
container's log: they bracket restore, the migrate decision, migrate itself,
and handing off to the server. The `+Ns` deltas are whole seconds because
BusyBox's `date` silently ignores `%N` - for finer resolution use the Cloud
Logging timestamps on the marker lines rather than trying to make the shell
produce milliseconds.

Two Cloud Run metrics are worth pulling alongside them:

- `container/startup_latencies`, per container - separates image pull time from
  anything `run.sh` does. The markers can't see the pull; this can.
- `container/memory/utilization` on `admin` - measured at 26-34% peak, so this
  is a box to tick rather than a lead. See "Measured vs. assumed" below.

### Measured vs. assumed

Worth keeping straight, because the numbers above are easy to read as more
settled than they are:

- **Measured:** the transpile fix's 11-23s (median ~14s), and the guard's own
  cost - ~27ms median in `node:22-alpine`, against seconds for the Payload boot
  it stands in front of. That figure is from a dev machine, so treat it as an
  order of magnitude rather than what Cloud Run's throttled CPU will do.
- **Reported, not instrumented:** the ~22s that prompted the `/healthz` and
  guard work. It came from timing requests by hand, not from the markers.
- **Measured, from revision `00014` (a scale-to-zero start, 2026-09-05):** the
  whole cold start apportioned, instance-start to ready in 8.77s -

  | Stage                                       | Duration |
  | ------------------------------------------- | -------- |
  | Instance start -> admin process running     | 0.32s    |
  | `litestream restore`                        | 2.33s    |
  | `needs-migrate` guard                       | 0.17s    |
  | Next boot -> port 3000 bound                | 1.52s    |
  | Payload init (port bound -> `/healthz` 200) | 3.31s    |
  | gateway nginx + probe                       | 1.01s    |

  The guard costs 0.17s in production against ~27ms on a dev machine - the
  throttled-CPU gap is real, but still trivial next to the Payload boot it
  replaces.

- **Ruled out - memory.** Peak `container/memory/utilization` is 26-34%,
  including on revisions that ran `512Mi`. This was previously written up here
  as the leading suspicion; it was wrong. Raising the limit to `1Gi` changed
  startup latency by nothing, exactly as the metric predicts, and it has since
  been reverted to `512Mi`. Don't spend on memory without re-checking that
  number first.
- **Ruled out - image pull.** 0.32s from instance start to the container's
  first log line. Shrinking the image would buy essentially nothing, so the
  `node_modules` work that was deferred for this reason is not worth doing for
  cold starts.
- **Ruled out - more CPU.** Only the Next boot and the real part of Payload's
  init are CPU-bound, and both are single-threaded module evaluation that
  doesn't scale with extra cores. Restore is network-bound and the probe gaps
  are pure polling latency.
- **Addressed - restore fetch list.** A restore pulls the newest L9 snapshot
  plus every increment written since. On litestream's 24h default that had
  grown to 1 snapshot + 14 increments. Timed against the production bucket from
  a dev machine: snapshot-only restore ~2.3s (indistinguishable from a
  no-fetch dry run), full restore ~5.1s - so **the increments were ~2.8s and
  the snapshot itself was near-free**. `snapshot.interval` is now `1h` in the
  generated `litestream.yml` to keep that tail short. Expect the production
  2.33s to fall, but not to zero: a chunk of it is auth plus listing the
  replica, which no amount of snapshotting removes.

## Startup sequence

The `admin` container's entrypoint (`commands`/`args` in
`packages/blog/infra/src/service.ts`, overriding the Dockerfile's own
`CMD`) copies a generated `run.sh` from a mounted secret and runs it:

1. `mkdir -p /data`, then `litestream restore -if-replica-exists` from the
   GCS data bucket - populates `/data/blog.sqlite` from the last replica,
   if one exists.
2. `scripts/needs-migrate.mjs` - decides whether step 3 has to run at all,
   by reading `payload_migrations` directly with `node:sqlite` and comparing
   it against the files in `dist/migrations/`. A bare Node boot (~27ms
   measured in `node:22-alpine`) standing in front of a full Payload boot
   (seconds). **It reports "migrate" on every path it can't establish** -
   missing DB, missing table, unexpected schema, any thrown error - so a
   pending migration is never skipped; the worst case is that it costs what
   step 3 always used to.
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

Each stage prints a `[startup] +Ns <stage>` marker, so a stuck or failing
startup is almost always whichever stage printed last. See "Measuring a cold
start" above for reading them as timings.

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
- the **`payload` CLI** (`node node_modules/payload/bin.js migrate`) - step 3
  of the startup sequence above, then exits. Not once per container start:
  `needs-migrate.mjs` skips it whenever there is nothing pending, which is
  every start but the first after a migration ships

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
- **A migration doesn't seem to have applied** - check the
  `[needs-migrate]` line in the container log before suspecting the
  migration itself. The guard prints its decision _and_ its reason on every
  start (`skip: all N migration(s) already applied`, `migrate: pending: ...`,
  or `migrate: <why the check couldn't be trusted>`), so it says outright
  whether step 3 ran. A migration that's in `src/migrations/` but not in the
  image's `dist/migrations/` is invisible to both the guard and payload -
  that's a missing rebuild, not a guard bug.
- **`litestream restore` looks like it's doing nothing - it isn't.** It prints
  no output on success, and the `replicate` step that follows immediately logs
  `detected database behind replica  db_txid=0000000000000000`. That `db_txid`
  is **not** evidence the restore failed: a freshly restored file is a plain
  SQLite database carrying no litestream position marker, so replicate
  re-establishes position by fetching the latest L0 file (~40ms). The restore
  itself is real work - a level-9 snapshot plus the level-2 increments since,
  ~2.3s against the production bucket - and it genuinely populates the
  database. The `[needs-migrate] skip: all N migration(s) already applied` line
  right after it is the cheap confirmation: the guard can only print that
  having opened a populated database.

  **Do not "optimise" the restore step away.** `litestream replicate` does not
  restore a missing database - verified directly against a file replica: delete
  the db, run `replicate -exec`, and it never comes back. Without the restore,
  a cold start would find `/data` empty, Payload would build a fresh database,
  `payload migrate` would replay every migration, and litestream would then
  replicate that empty database over the replica.

- **Cold starts got slow again** - don't guess at it; the markers and the
  cold/warm request gap under "Cold starts" above will say which stage grew.
  Check that the `/healthz` probe is still an `httpGet` in `service.ts`
  (reverting it to a `tcpSocket` check silently pushes Payload's init back
  into the user's first request, which shows up as a large cold/warm gap
  while time-to-ready looks fine).

## What's not covered

No automated test suite (unit or end-to-end) for this package -
confidence in a change relies on the manual verification steps in the
[README](./README.md).
