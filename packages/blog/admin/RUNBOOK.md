# blog-admin runbook

Operational reference for running `blog-admin` in production: environment
configuration, reading its logs, and debugging problems.

## Configuring the environment

| Variable              | Type      | Purpose                                                                                     | Visibility | Notes                                                                                                                         |
| --------------------- | --------- | ------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `DB_PATH`             | `string`  | SQLite file path (`/data/blog.sqlite` in production)                                        | private    | Throws at startup if unset (not during `next build` - see [`known-issues.md`](./known-issues.md))                             |
| `PAYLOAD_SECRET`      | `string`  | Session/token signing secret                                                                | secret     | Throws at startup if unset; generated via Pulumi (`packages/blog/infra/src/payload.ts`)                                       |
| `GCS_MEDIA_BUCKET`    | `string`  | Bucket for Payload's upload/media storage                                                   | private    | Throws at startup if unset (outside `NODE_ENV=development`)                                                                   |
| `GCS_DATA_BUCKET`     | `string`  | Set on the container, but read only by litestream's generated config, not by Payload itself | private    | Don't expect changing it at runtime to do anything - `litestream.yml` bakes the bucket name in at deploy time                 |
| `PORT`                | `number`  | Port the server listens on (`3000`)                                                         | private    |                                                                                                                               |
| `PAYLOAD_CONFIG_PATH` | `string`  | Absolute path to `payload.config.ts`, baked into the image                                  | private    | Set in the Dockerfile, not `service.ts` - see [`known-issues.md`](./known-issues.md) for why this must stay a raw-source path |
| `LOG_LEVEL`           | `enum`    | Overrides the default pino level                                                            | private    | Defaults to `info` in production, `trace` otherwise                                                                           |
| `PRETTY_PRINT_LOGS`   | `boolean` | Whether logs are pretty-printed vs. JSON                                                    | private    | Defaults to `true` outside production, `false` in it                                                                          |

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

The `cms` container's entrypoint (`commands`/`args` in
`packages/blog/infra/src/service.ts`, overriding the Dockerfile's own
`CMD`) copies a generated `run.sh` from a mounted secret and runs it:

1. `mkdir -p /data`, then `litestream restore -if-replica-exists` from the
   GCS data bucket - populates `/data/blog.sqlite` from the last replica,
   if one exists.
2. `npx payload migrate` - applies pending migrations (`src/migrations/`,
   shipped as raw source in the image).
3. `exec litestream replicate -exec "node packages/blog/admin/server.js"` -
   starts continuous replication, execing the real Next.js server as its
   subprocess for the life of the container.

A stuck/failing startup is almost always one of these three steps - check
container logs for which of "Running litestream restore"/"Running payload
migrate"/"Running litestream replicate" was the last line printed.

## Debugging problems

- **Missing env var at startup** - one of the three guards in
  `payload.config.ts` logs at `fatal` and throws immediately (`<VAR>
environment variable is not set`). Check `service.ts`'s `cms` container
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
