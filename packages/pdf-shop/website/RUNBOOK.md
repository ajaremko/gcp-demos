# pdf-shop-website runbook

Operational reference for running `website` in production: environment
configuration, reading its logs, and debugging problems.

## Configuring the environment

| Variable                             | Purpose                                                | Type                           | Visibility | Notes                                                                        |
| ------------------------------------ | ------------------------------------------------------ | ------------------------------ | ---------- | ---------------------------------------------------------------------------- |
| `DATA_ROOT`                          | Filesystem location of document/payment records        | `string` (path)                | private    | Should point at the same storage the rest of the system reads and writes to. |
| `STRIPE_SECRET_KEY`                  | Stripe secret key, server-side                         | `string`                       | secret     | Throws if unset at runtime                                                   |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key, client-side                    | `string`                       | public     | Required for Stripe Elements integration                                     |
| `NODE_ENV`                           | Controls log format/verbosity, and Next's runtime mode | `string`                       | private    |                                                                              |
| `PORT`                               | Port the server listens on                             | `number`                       | private    |                                                                              |
| `LOG_LEVEL`                          | Overrides the default pino level                       | `enum`                         | private    | Defaults to `true` outside production                                        |
| `PRETTY_PRINT_LOGS`                  | Whether logs are pretty-printed vs. JSON               | `boolean` (`"true"`/`"false"`) | private    | Defaults to `true` outside production                                        |

There is no other application-level configuration surface.

## Interpreting logs

All backend logging — `@org/pdf-shop-application` handler internals as well
as this app's own pages, server actions, and API routes — goes through
`pinoLogger`; nothing on the backend logs to `console.*`.

By default, output is pretty-printed outside production and JSON in
production; `PRETTY_PRINT_LOGS` overrides this independently of `NODE_ENV`
(e.g. `PRETTY_PRINT_LOGS=false` for JSON output locally, or `=true` to get
pretty output even with `NODE_ENV=production`).

pino's level is a threshold: setting it to a given level shows that level
and everything more severe. By default (`src/lib/pino.ts`) this app runs at
one of two thresholds — `trace` in dev (`NODE_ENV` unset), `info` in
production — unless `LOG_LEVEL` is set, which takes precedence over both.
The table below shows what's visible at **the default** production level;
if `LOG_LEVEL` is set, apply the same threshold rule directly against
whatever level it's configured to instead:

| Level   | Shown in production? | Emitted by                                                                                                                                            |
| ------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trace` | No                   | `@org/pdf-shop-application` handler internals — Stripe calls, file reads/writes, and similar step-by-step detail                                      |
| `debug` | No                   | `purchase/page.tsx`, `download/page.tsx`, `status/route.ts`, `download/route.ts` — a failure loading payment context, checking status, or downloading |
| `info`  | Yes                  | _(nothing currently logs at this level)_                                                                                                              |
| `warn`  | Yes                  | `create/actions.ts`, `purchase/actions.ts` — a failure creating a document or confirming a payment                                                    |
| `error` | Yes                  | _(nothing currently logs at this level)_                                                                                                              |

Browser-side (client component) code may log warnings and errors directly to the console.

## Debugging problems

Each page/route that calls into `@org/pdf-shop-application` handles a
handler failure differently — worth knowing which failure mode you're
looking at before assuming the worst:

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
  message literally; check `DATA_ROOT` directly for the document in
  question rather than trusting the response.

When investigating a report of a stuck or failed document, the most direct
approach is usually to check the document's records under `DATA_ROOT`
directly (does `created.json` exist? `generated.json`? `paid.json`?) rather
than relying on this app's logs alone, since several of its failure paths
are intentionally quiet toward the end user.

## What's not covered

There is no automated test suite (unit or end-to-end) for this package.
Confidence in a change relies on manual verification of the flow described
in the [README](./README.md), plus `@org/pdf-shop-application`'s own test
suite for the underlying business logic.
