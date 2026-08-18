# pdf-shop-worker runbook

Operational reference for running `worker` in production: environment
configuration, reading its logs, and debugging problems.

## Configuring the environment

| Variable | Purpose | Notes |
| --- | --- | --- |
| `DATA_ROOT` | Filesystem location of document records (`created.json`, `generated.txt`, `generated.json`, `paid.json`) | Must point at the same storage location the rest of the system reads and writes to. If unset, it resolves to `''`, which means paths are read relative to the process's working directory — effectively broken; always set this explicitly. |
| `PORT` | Port the server listens on | Defaults to `3333` if unset. |
| `NODE_ENV` | Controls log format and verbosity | Set to `production` in production. |

There is no other configuration surface — no config file, no CLI flags.

## Interpreting logs

With `NODE_ENV=production`, logs are single-line JSON at `info` level (via
pino). Without it, logs are pretty-printed and colorized at `trace` level —
appropriate for local development, not for production log ingestion.

**Important**: the only log line `worker` itself emits is on failure —
`{ err, objectId }` with the message `'Failed to generate document'`, written
just before a `500` response. Successful generations are logged by
`@org/pdf-shop-application`'s internal functions at `trace` level, which
`info`-level production logging does not surface. In other words: **a quiet
worker is a healthy worker** — don't expect a log line per successful
notification. If you need visibility into successful generations too,
temporarily run with `NODE_ENV` unset (or otherwise lower the log level) to
get `trace`-level output.

On the one failure log line, `err` carries the full thrown error, including
its `tag` (which specific error occurred — see below) and `cause` (the
underlying error, e.g. a filesystem error). `objectId` is the Cloud Storage
object path from the triggering notification, which is what to use to find
the document in question.

## Debugging problems

**A `500` response is expected, retryable behavior, not necessarily an
outage.** Pub/Sub redelivers on any non-2xx response, so a `500` for a
single notification that later succeeds on redelivery is normal — only a
notification that keeps failing across multiple redeliveries indicates a
real problem.

To investigate a specific failure:

1. Find the failure log line and read its `objectId` — this identifies the
   document (and, from the Cloud Storage object path, the document id).
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
