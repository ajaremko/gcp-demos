# pdf-shop-application

The business-logic layer for a document ordering, payment, generation, and
download lifecycle. Every exported function is a factory that takes an explicit
`env` object (a Stripe client, a data root directory, a logger) and returns
an async function that does the work.

Documents are stored as JSON records on disk under a single `dataRoot`
directory, one subdirectory per record type (`created/`, `paid/`,
`generated/`), with one file per document id inside it — e.g.
`<dataRoot>/created/<documentId>.json`. This lets a storage-change
notification's prefix filter (`created/`) distinguish an order being
placed from a payment being confirmed or a document being generated,
which isn't possible when all three share a per-document directory.

## Lifecycle

A document moves through four stages, each driven by one or more handlers:

```
place an order ──▶ confirm payment ──▶ generate content ──▶ download
      │                    ▲                   │                 ▲
      │                    │                   │                 │
      ▼                    │                   ▼                 │
 GetPaymentContextHandler ─┘          CheckOrderStatusHandler ───┘
 (fetch what's needed to pay)          (poll until ready)
```

Ordering and payment are two separate steps: placing an order reserves a
document id and opens payment, but doesn't itself produce content. Generation
is triggered once an order record becomes durably stored, not by whoever
placed the order. Only once both generation and payment have completed
can a document be downloaded.

## API surface

### `OrderDocumentHandler(env)`

Places an order for a new document: captures the requested content and
styling, opens payment for the fixed price, and reserves the order under a
newly assigned document id, pending payment and generation.

- **env**: `{ stripe, dataRoot, logger }`
- **input**: `{ colorScheme: 'light' | 'dark', title: string, body: string }`
- **resolves to**: the newly written order record (`id`, `createdAt`, `spec`, `payment`)

### `GetPaymentContextHandler(env)`

Assembles what a customer needs to complete a document's payment: the
document's content spec and a Stripe client secret for authorizing the
outstanding charge.

- **env**: `{ dataRoot, stripe, logger }`
- **input**: `{ documentId: string }`
- **resolves to**: `{ documentId, clientSecret, spec }`

### `PurchaseDocumentHandler(env)`

Confirms that a document's order has been paid for: verifies the outcome of
the customer's Stripe payment and records the purchase against the document.

- **env**: `{ stripe, dataRoot, logger }`
- **input**: `{ documentId: string, paymentIntentId: string }`
- **resolves to**: `{ documentId }`

### `GenerateDocumentHandler(env)`

Produces a document's actual content once its order has been finalized — the
fulfillment step of the lifecycle, triggered by the order becoming durable in
storage rather than by a direct request.

- **env**: `{ dataRoot, logger }`
- **input**: `{ path: string }` — the storage location of the order record
- **resolves to**: the written generation record (`documentId`, `path`, `filename`, `contentType`, `timestamp`)

### `CheckOrderStatusHandler(env)`

Reports whether a document's order has reached "ready": its content has been
generated and its payment confirmed.

- **env**: `{ dataRoot, logger }`
- **input**: `{ documentId: string }`
- **resolves to**: `true` (rejects otherwise — see [Error handling](#error-handling))

### `DownloadDocumentHandler(env)`

Delivers a document's content to a customer — the final step in a document's
lifecycle, available only once both generation and payment have completed.

- **env**: `{ dataRoot, logger }`
- **input**: `{ documentId: string }`
- **resolves to**: `{ stream, size, filename, contentType }`

## Error handling

Error thrown by handlers extend `ApplicationError`. Caught exceptions can be narrowed
with `isApplicationError`. Switch on the `tag` to determine what went wrong.

The original underlying error is preserved on the standard `cause` property for logging
or additional handling.

```ts
import {
  isApplicationError,
  PurchaseDocumentHandler,
} from '@org/pdf-shop-application'

try {
  await PurchaseDocumentHandler(env)({ documentId, paymentIntentId })
} catch (err) {
  if (isApplicationError(err)) {
    switch (err.tag) {
      case 'PaymentIntentNotFound':
      case 'PaymentIntentInvalid':
        // the payment itself didn't go through — tell the customer
        break
      default:
        // an ApplicationError this caller doesn't handle specially
        console.error({ error: err }) // err.cause carries the original error
    }
  } else {
    throw err
  }
}
```

## Logging

Every handler and internal function takes a `logger` (a `pino` `Logger`)
via `env`. Each factory creates a child logger scoped to that operation
(`env.logger.child({ method: 'orderDocument' })`), and follows the same
pattern throughout:

- **`trace`** — one line per operation, right before it happens (a Stripe
  call, a file read/write), with identifying context (`documentId`, the
  path involved, etc.).
- **`debug`** — one line per failure, right before the corresponding
  `ApplicationError` subclass is thrown. The message matches that error
  class's own constructor message; the fields are whatever identifying
  context is available at that point — never the raw error itself.
- Nothing is logged at `info`/`warn`/`error`/`fatal` levels. Consumers can
  determine severity.

The error object is not logged directly by this package. Instead its
preserved on the thrown `ApplicationError`'s `cause` property (see
[Error handling](#error-handling)) for the caller to log, at whatever
level fits their context.

## Usage examples

**Order a document and confirm payment:**

```ts
import {
  OrderDocumentHandler,
  PurchaseDocumentHandler,
} from '@org/pdf-shop-application'

const env = { stripe, dataRoot, logger }

const order = await OrderDocumentHandler(env)({
  colorScheme: 'light',
  title: 'Q3 Report',
  body: 'Contents go here',
})

// ...customer completes payment on the client using order.payment.paymentIntentId...

await PurchaseDocumentHandler(env)({
  documentId: order.id,
  paymentIntentId: order.payment.paymentIntentId,
})
```

**Trigger generation and wait until a document is ready to download:**

```ts
import {
  GenerateDocumentHandler,
  CheckOrderStatusHandler,
  DownloadDocumentHandler,
} from '@org/pdf-shop-application'

const env = { dataRoot, logger }

await GenerateDocumentHandler(env)({ path: orderRecordPath })

// poll until both generation and payment have completed
await CheckOrderStatusHandler(env)({ documentId })

const { stream, size, filename, contentType } = await DownloadDocumentHandler(
  env,
)({
  documentId,
})
```

## Building

Run `nx build pdf-shop-application` to build the library.

## Testing

Run `nx test pdf-shop-application` to run unit tests for the library.
