# pdf-shop-application

The business-logic layer for a document ordering, payment, generation, and
download lifecycle. Every exported function is a factory that takes an explicit
`env` object (a Stripe client, a data root directory, a logger) and returns
an async function that does the work.

Documents are stored as JSON records on disk under a single `dataRoot`
directory, one subdirectory per document id.

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
