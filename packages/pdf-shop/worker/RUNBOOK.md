# pdf-shop-worker runbook

Operational reference for running `pdf-shop-worker`: environment
configuration, reading its logs, and debugging problems.

## Configuring the environment

| Variable            | Type      | Purpose                                  | Visibility | Notes                                                                        |
| ------------------- | --------- | ---------------------------------------- | ---------- | ---------------------------------------------------------------------------- |
| `PDF_SHOP_DATA_DIR` | `string`  | Filesystem location of document records  | private    | Should point at the same storage the rest of the system reads and writes to. |
| `PORT`              | `number`  | Port the server listens on               | private    | Defaults to `3333`                                                           |
| `NODE_ENV`          | `string`  | Controls log format and verbosity        | private    |                                                                              |
| `LOG_LEVEL`         | `enum`    | Overrides the default pino level         | private    | Defaults to `trace` outside production                                       |
| `PRETTY_PRINT_LOGS` | `boolean` | Whether logs are pretty-printed vs. JSON | private    | Defaults to `true` outside production                                        |

There is no other configuration surface — no config file, no CLI flags.

## Logging Levels

pino's level is a threshold: whatever `LOG_LEVEL` is set to (see the table
above) shows that level and everything more severe. Here's what's emitted
at each level:

| Level   | Events logged                                                    |
| ------- | ---------------------------------------------------------------- |
| `trace` | Internal application details                                     |
| `debug` | Internal application failures                                    |
| `info`  | Express server messages                                          |
| `warn`  | Request doesn't match the expected shape (ex. wrong `eventType`) |
| `error` | Caught application errors                                        |
| `fatal` | Express server errors; configuration errors                      |

Application errors carry a `tag` (which specific error occurred — see below) and `cause`
(the underlying error, e.g. a filesystem error). See `@org/pdf-shop-application`'s
own README for full logging and exception handling strategy.

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
     record isn't present or isn't readable yet at `PDF_SHOP_DATA_DIR`. This can
     happen if the notification arrived before the write it describes is
     fully visible from `worker`'s point of view (a storage-sync race) — a
     retry may resolve it on its own.
   - `GeneratedDocumentDirectoryFailed` / `GeneratedDocumentWriteFailed` /
     `GenerationRecordWriteFailed` — writing the generated output failed.
     Check that `PDF_SHOP_DATA_DIR` is writable, has free space, and that the
     process has the permissions it needs.
3. Check `err.cause` for the underlying error (filesystem error, etc.) for
   further detail.

To reproduce a failure locally: serve `worker`, then send a request from
`.postman/pdf-shop-worker.postman_collection.json` (see the
[README](./README.md)) with `documentId` set to a document that's missing or
malformed at `PDF_SHOP_DATA_DIR`, and confirm the response and log line match what
was observed.

## Notes

`GET /health` is a plain liveness check — it confirms the process is up
and listening. Doesn't guarantee notifications will succeed.

See [`known-issues.md`](./known-issues.md)
