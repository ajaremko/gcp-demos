# pdf-shop-worker-e2e

End-to-end tests for `pdf-shop-worker`. Unlike `@org/pdf-shop-application`'s
unit tests, these run against a real, live-served `worker` instance
(`nx test` builds and serves `pdf-shop-worker` first) and drive it over
HTTP, the same way a real GCS Pub/Sub push notification would.

## Running

`nx test pdf-shop-worker-e2e`

## What's tested

`src/pdf-shop-worker/pubsub-push.spec.ts` POSTs simulated Pub/Sub push
notifications to `worker`'s `POST /` and asserts on the real response and
real filesystem output:

- A valid `created/<documentId>.json` notification triggers real document
  generation - asserts the response is `201` and that
  `generated/<documentId>.pdf`/`.json` are actually written.
- A notification for an object outside `created/*.json` is acknowledged
  but ignored (`201`, no generation attempted).
- A notification referencing a document with no order record on disk
  returns `500`.
