# pdf-shop-worker runbook

Operational reference for running `worker` in production: environment
configuration, reading its logs, and debugging problems.

## Configuring the environment

| Variable            | Type      | Purpose                                  | Visibility | Notes                                                                        |
| ------------------- | --------- | ----------------------------------------- | ---------- | ---------------------------------------------------------------------------- |
| `DATA_ROOT`         | `string`  | Filesystem location of document records  | private    | Should point at the same storage the rest of the system reads and writes to. |
| `PORT`              | `number`  | Port the server listens on               | private    | Defaults to `3333`                                                           |
| `NODE_ENV`          | `string`  | Controls log format and verbosity        | private    |                                                                              |
| `LOG_LEVEL`         | `enum`    | Overrides the default pino level         | private    | Defaults to `true` outside production                                        |
| `PRETTY_PRINT_LOGS` | `boolean` | Whether logs are pretty-printed vs. JSON | private    | Defaults to `true` outside production                                        |

There is no other configuration surface — no config file, no CLI flags.

## Interpreting logs

Every log line carries `service: 'pdf-shop-worker'` (`pinoLogger` is a
`pino` child logger), for when logs are aggregated alongside `website`'s.

By default, output is pretty-printed outside production and JSON in
production; `PRETTY_PRINT_LOGS` overrides this independently of `NODE_ENV`
(e.g. `PRETTY_PRINT_LOGS=false` for JSON output locally, or `=true` to get
pretty output even with `NODE_ENV=production`).

pino's level is a threshold: setting it to a given level shows that level
and everything more severe. By default (`src/main.ts`) `worker` runs at one
of two thresholds — `trace` in dev (`NODE_ENV` unset), `info` in
production — unless `LOG_LEVEL` is set, which takes precedence over both.
The table below shows what's visible at **the default** production level;
if `LOG_LEVEL` is set, apply the same threshold rule directly against
whatever level it's configured to instead:

| Level   | Shown in production? | Emitted by                                                                                                                                                          |
| ------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trace` | No                   | `@org/pdf-shop-application` handler internals — file reads/writes and similar step-by-step detail during generation                                                 |
| `debug` | No                   | Startup: the resolved `DATA_ROOT` value                                                                                                                             |
| `info`  | Yes                  | Startup: the port the server is listening on                                                                                                                        |
| `warn`  | Yes                  | A push notification that doesn't match the expected shape (wrong `eventType`, or an `objectId` not ending in `/created.json`) — acknowledged with `201` but ignored |
| `error` | Yes                  | A failure generating a document — the one case that also produces a `500` response                                                                                  |

On the `error`-level failure line, `err` carries the full thrown error,
including its `tag` (which specific error occurred — see below) and `cause`
(the underlying error, e.g. a filesystem error). `objectId` is the Cloud
Storage object path from the triggering notification, which is what to use
to find the document in question.

One exception to all of the above: a fatal error binding the server's port
(`server.on('error', ...)`) is logged with plain `console.error`, not
pino — this only fires if the process fails to start listening at all.

## Debugging problems

**A `500` response is expected, retryable behavior, not necessarily an
outage.** Pub/Sub redelivers on any non-2xx response, so a `500` for a
single notification that later succeeds on redelivery is normal — only a
notification that keeps failing across multiple redeliveries indicates a
real problem.

To investigate a specific failure:

1. Find the `error`-level failure log line and read its `objectId` — this
   identifies the document (and, from the Cloud Storage object path, the
   document id).
2. Check `err.tag` to narrow down what went wrong:
   - `DocumentOrderNotFound` / `DocumentOrderInvalid` — the referenced order
     record isn't present or isn't readable yet at `DATA_ROOT`. This can
     happen if the notification arrived before the write it describes is
     fully visible from `worker`'s point of view (a storage-sync race) — a
     retry may resolve it on its own.
   - `GeneratedDocumentDirectoryFailed` / `GeneratedDocumentWriteFailed` /
     `GenerationRecordWriteFailed` — writing the generated output failed.
     Check that `DATA_ROOT` is writable, has free space, and that the
     process has the permissions it needs.
3. Check `err.cause` for the underlying error (filesystem error, etc.) for
   further detail.

To reproduce a failure locally: serve `worker`, then send a request from
`.postman/pdf-shop-worker.postman_collection.json` (see the
[README](./README.md)) with `documentId` set to a document that's missing or
malformed at `DATA_ROOT`, and confirm the response and log line match what
was observed.

## What's not covered

There is no dedicated health or readiness endpoint today — only `POST /` and
a static `GET /assets`. Liveness currently has to be inferred from whether
the process is running and listening, not from a request/response check.
