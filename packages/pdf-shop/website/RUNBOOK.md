# pdf-shop-website runbook

Operational reference for running `website` in production: environment
configuration, reading its logs, and debugging problems.

## Configuring the environment

| Variable                             | Type      | Purpose                                                | Visibility | Notes                                                                        |
| ------------------------------------ | --------- | ------------------------------------------------------ | ---------- | ---------------------------------------------------------------------------- |
| `PDF_SHOP_DATA_DIR`                  | `string`  | Filesystem location of document/payment records        | private    | Should point at the same storage the rest of the system reads and writes to. |
| `STRIPE_SECRET_KEY`                  | `string`  | Stripe secret key, server-side                         | secret     | Throws if unset at runtime                                                   |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `string`  | Stripe publishable key, client-side                    | public     | Required for Stripe Elements integration                                     |
| `NODE_ENV`                           | `string`  | Controls log format/verbosity, and Next's runtime mode | private    |                                                                              |
| `PORT`                               | `number`  | Port the server listens on                             | private    |                                                                              |
| `LOG_LEVEL`                          | `enum`    | Overrides the default pino level                       | private    | Defaults to `trace` outside production                                       |
| `PRETTY_PRINT_LOGS`                  | `boolean` | Whether logs are pretty-printed vs. JSON               | private    | Defaults to `true` outside production                                        |

There is no other application-level configuration surface.

## Logging

pino's level is a threshold: whatever `LOG_LEVEL` is set to (see the table
above) shows that level and everything more severe. Here's what's emitted
at each level:

| Level   | Events logged                                                                                                                                                                  |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `trace` | Application internals details                                                                                                                                                  |
| `debug` | Failure loading payment context, checking order status, or downloading; `@org/pdf-shop-application` failure context, logged immediately before it throws an `ApplicationError` |
| `info`  | _(nothing currently logs at this level)_                                                                                                                                       |
| `warn`  | Failure creating a document or confirming a payment                                                                                                                            |
| `error` | _(nothing currently logs at this level)_                                                                                                                                       |
| `fatal` | Missing required configuration (`PDF_SHOP_DATA_DIR`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`)                                                                |

Application level failures carry a `tag` (which specific error occurred —
see below) and `cause` (the underlying error, e.g. a filesystem error).
See `@org/pdf-shop-application`'s own README for its full logging strategy.

Browser-side (client component) code may log warnings and errors directly
to the console.

## Debugging problems

The various page/route that call into `@org/pdf-shop-application` may each handle failure differently.

- **Creating a document** (`/create`'s server action): a thrown
  `ApplicationError` is logged at `warn` — visible in production — and the
  user sees a generic retry message. A validation failure returns
  field-level errors instead and isn't logged at all (it's normal user
  input rejection, not a system problem).
- **Loading the purchase page** (`/purchase`): any failure fetching payment
  context — including the order simply not existing yet, or Stripe being
  unreachable — is logged at `debug` (**not visible in production by
  default**) and the page redirects the visitor back to `/create` to start
  over.
- **Confirming a payment** (`/purchase`'s server action): failures are
  logged at `warn` (visible in production) — this is the one call site with
  the most diagnosable logging of the six, since the message also includes
  the specific `ApplicationError` tag (payment not found, invalid, or the
  confirmation record failing to write).
- **Polling status** (`/api/documents/[documentId]/status`): an
  `ApplicationError` is logged at `debug` before folding into the same
  `{ ready: false }` response as "not ready yet" — so it's not silent, but
  it also isn't visible in production by default. A document that is
  permanently broken still looks identical, from the response alone, to one
  that's still processing.
- **Downloading** (`/api/documents/[documentId]/download`): an
  `ApplicationError` is logged at `debug`; any other error (a validation
  failure, something unexpected) is not logged at all. Both collapse to the
  same generic `404 File not found` response either way. Don't take that
  message literally; check `PDF_SHOP_DATA_DIR` directly for the document in
  question rather than trusting the response.

When investigating a report of a stuck or failed document, the most direct
approach is usually to check the document's records under `PDF_SHOP_DATA_DIR`
directly (does `created.json` exist? `generated.json`? `paid.json`?) rather
than relying on this app's logs alone, since several of its failure paths
are intentionally quiet toward the end user.

## What's not covered

There is no automated test suite (unit or end-to-end) for this package.
Confidence in a change relies on manual verification of the flow described
in the [README](./README.md).

See [`known-issues.md`](./known-issues.md) for a known gap in
`PRETTY_PRINT_LOGS` misconfiguration logging.
