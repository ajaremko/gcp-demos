# pdf-shop-worker

An Express service that receives Cloud Storage change notifications via a
Pub/Sub push subscription and triggers document generation in response. When
a `created.json` order record is finalized in storage, `worker` reads it and
generates the document's content using `@org/pdf-shop-application`'s
`GenerateDocumentHandler`.

## Local setup

Configuration is entirely via environment variables:

| Variable    | Purpose                                                                          | Default outside production  |
| ----------- | -------------------------------------------------------------------------------- | --------------------------- |
| `DATA_ROOT` | Directory where document records live                                            | `/tmp/pdf-shop-worker-data` |
| `PORT`      | Port the server listens on                                                       | `3333`                      |
| `NODE_ENV`  | `production` for structured JSON logs; anything else for pretty-printed dev logs | unset (dev logs)            |

`DATA_ROOT` defaults to `/tmp/pdf-shop-worker-data` automatically outside of
production — the same path `worker-e2e`'s tests expect — so no `.env` is
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
   there's a `created.json` for the worker to read.
3. Set the collection's `documentId` variable to that id.
4. Send the request. A `201` response means the notification was accepted;
   check `DATA_ROOT` for the newly written `generated.txt`/`generated.json`
   under that document's directory.

If importing the collection into the Postman VS Code extension fails, see
[`known-issues.md`](./known-issues.md) for a workaround.

## Automated tests

End-to-end tests for this service live in `worker-e2e`, not here — they run
against a really-served instance rather than calling handlers directly (unit
tests for the underlying document-generation logic live in
`@org/pdf-shop-application` itself):

```
nx test pdf-shop-worker-e2e
```

This builds and serves `worker`, then exercises `POST /` for three cases: a
full happy-path generation, a notification for an object the route should
ignore, and a notification referencing a document that doesn't exist.

## Building

```
nx build pdf-shop-worker
```
