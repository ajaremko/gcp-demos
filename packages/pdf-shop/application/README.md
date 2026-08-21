# pdf-shop-application

The business-logic layer for a document ordering, payment, generation, and
download lifecycle. Every exported function is a factory that takes an explicit
`env` object (a Stripe client, a data root directory, a logger) and returns
an async function that does the work.

Documents are stored as JSON records on disk - see
[Persistence](#persistence) for the record shapes and path scheme.

## Building

Run `nx build pdf-shop-application` to build the library.

## Testing

Run `nx test pdf-shop-application` to run unit tests for the library.

## Document Lifecycle

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

Produces a document's actual content once its order has been finalized - the
fulfillment step of the lifecycle, triggered by the order becoming durable in
storage rather than by a direct request.

- **env**: `{ dataRoot, logger, pdfGenerator }`
- **input**: `{ path: string }` - the storage location of the order record
- **resolves to**: the written generation record (`documentId`, `path`, `filename`, `contentType`, `timestamp`)

### `CheckOrderStatusHandler(env)`

Reports whether a document has been paid for and whether its content has
been generated - the two are independent, since generation is triggered
by the order becoming durable in storage, not by payment.

- **env**: `{ dataRoot, logger }`
- **input**: `{ documentId: string }`
- **resolves to**: `{ paid: boolean, generated: boolean }` (rejects only on
  a corrupt record - see [Error handling](#error-handling))

### `DownloadDocumentHandler(env)`

Delivers a document's content to a customer - the final step in a document's
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
        // the payment itself didn't go through - tell the customer
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

- **`trace`** - one line per operation, right before it happens (a Stripe
  call, a file read/write), with identifying context (`documentId`, the
  path involved, etc.).
- **`debug`** - one line per failure, right before the corresponding
  `ApplicationError` subclass is thrown. The message matches that error
  class's own constructor message; the fields are whatever identifying
  context is available at that point - never the raw error itself.
- Nothing is logged at `info`/`warn`/`error`/`fatal` levels. Consumers can
  determine severity.

The error object is not logged directly by this package. Instead its
preserved on the thrown `ApplicationError`'s `cause` property (see
[Error handling](#error-handling)) for the caller to log, at whatever
level fits their context.

## Persistence

Every stage of a document's lifecycle durably records its outcome as a
JSON file on disk under a single `dataRoot` directory - there's no
database; the filesystem is the record store, and each record's presence
is what the rest of the system uses to determine a document's state.

### Path scheme

Records are organized one subdirectory per record type, with one file per
document id inside it:

```
<dataRoot>/created/<documentId>.json
<dataRoot>/paid/<documentId>.json
<dataRoot>/generated/<documentId>.json
<dataRoot>/generated/<documentId>.pdf
```

This groups by record type rather than by document
(`<dataRoot>/<documentId>/<recordType>.json`) specifically so a
storage-change notification's `objectNamePrefix` filter (`created/`) can
distinguish an order being placed from a payment being confirmed or a
document being generated - impossible if all three shared a per-document
directory, since GCS notification prefix filters are literal string
matches, not globs. `internal/recordPath.ts`'s `recordDir`/`buildRecordPath`
are the shared helpers every read/write function routes through to
construct these paths.

### Records

**Order record** (`created/<documentId>.json`) - written by
`orderDocument` when a document is ordered.

```ts
{
  id: string // uuid - the canonical documentId, threading
  // through the rest of the lifecycle
  createdAt: string // ISO datetime
  spec: {
    colorScheme: 'light' | 'dark'
    title: string // max 120 chars
    body: string // max 20,000 chars
  }
  payment: {
    paymentIntentId: string
    amount: number // integer, positive
    currency: string
  }
}
```

Writing this file is the event that triggers async generation, via a
storage-change notification to `worker`.

**Payment record** (`paid/<documentId>.json`) - written by
`purchaseDocument` once a document's Stripe payment intent has succeeded.

```ts
{
  documentId: string // uuid
  stripePaymentIntentId: string
  amount: number // integer, positive
  currency: string
  confirmedAt: string // ISO datetime
}
```

Its presence is what gates access to the generated document.

**Generation record** (`generated/<documentId>.json`) - written by
`generateDocument` after a document's content has been generated.

```ts
{
  documentId: string    // uuid
  path: string             // absolute path to the sibling .pdf content file
  filename?: string
  contentType?: string
  timestamp: string        // ISO datetime
}
```

**Generated content** (`generated/<documentId>.pdf`) - the document's
actual rendered PDF content, written alongside its generation record in the
same call to `generateDocument`, and referenced by that record's own
`path` field.

No record is ever mutated after it's written - each stage writes a new
file rather than updating an earlier one.

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
let status: { paid: boolean; generated: boolean }
do {
  status = await CheckOrderStatusHandler(env)({ documentId })
} while (!status.paid || !status.generated)

const { stream, size, filename, contentType } = await DownloadDocumentHandler(
  env,
)({
  documentId,
})
```
