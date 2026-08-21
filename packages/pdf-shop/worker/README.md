# pdf-shop-worker

An Express service that generates ordered pdf documents asynchronously. The server is
designed to receive Cloud Storage change notifications via a Pub/Sub push subscription.

When an order record is finalized in storage, `worker` reads it, generates the
document's content and writes a record containing metadata about the generated file.

## Building

```
nx build pdf-shop-worker
```

## Serve (Hot reload)

```
nx serve pdf-shop-worker
```

## Containerize

```
nx docker:build pdf-shop-worker
```

See the full [runbook](./RUNBOOK.md) for more details about operation.

## Routes

| Path          | Purpose                                                      |
| ------------- | ------------------------------------------------------------ |
| `POST /`      | Receives Cloud Storage change notifications via Pub/Sub push |
| `GET /health` | Health check                                                 |

## Local setup

Configuration is entirely via environment variables:

| Variable            | Purpose                                                                                                                            | Default outside production |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `PDF_SHOP_DATA_DIR` | Directory where document records live                                                                                              | `/tmp/pdf-shop-data`       |
| `PORT`              | Port the server listens on                                                                                                         | `3333`                     |
| `NODE_ENV`          | By default, `production` for structured JSON logs, anything else for pretty-printed dev logs - see `PRETTY_PRINT_LOGS` to override | unset (dev logs)           |
| `LOG_LEVEL`         | Overrides the default log level (`info` in production, `trace` otherwise)                                                          | unset                      |
| `PRETTY_PRINT_LOGS` | `true`/`false`; overrides whether logs are pretty-printed. Defaults to `true` outside production, `false` in production            | unset (`true`)             |

`PDF_SHOP_DATA_DIR` defaults to `/tmp/pdf-shop-data` automatically outside of
production - the same path `worker-e2e`'s tests expect - so no `.env` is
required to get started. Nx will automatically load `.env` files. Start the server with:

```
nx serve pdf-shop-worker
```

## Manually testing with Postman

`.postman/pdf-shop-worker.postman_collection.json` contains one request,
"Simulate Cloud Storage document-created notification," which `POST`s a
realistic Pub/Sub push envelope to `POST /`.

To use it:

1. Start the server (`nx serve pdf-shop-worker`).
2. Create a document elsewhere in the system to get a real document id, so
   there's a `created/<documentId>.json` for the worker to read.
3. Set the collection's `documentId` variable to that id.
4. Send the request. A `201` response means the notification was accepted;
   check `PDF_SHOP_DATA_DIR/generated/` for the newly written
   `<documentId>.txt`/`<documentId>.json`.

If importing the collection into the Postman VS Code extension fails, see
[`known-issues.md`](./known-issues.md) for a workaround.

## Automated tests

End-to-end tests for this service live in `worker-e2e`, not here - they run
against a really-served instance rather than calling handlers directly (unit
tests for the underlying document-generation logic live in
`@org/pdf-shop-application` itself):

```
nx test pdf-shop-worker-e2e
```

This builds and serves `worker`, then exercises `POST /` for three cases: a
full happy-path generation, a notification for an object the route should
ignore, and a notification referencing a document that doesn't exist.
