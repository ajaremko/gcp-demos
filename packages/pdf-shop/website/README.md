# pdf-shop-website

A Next.js app implementing the pdf-shop demo flow: describe a document, pay
for it with a Stripe sandbox account, and download the generated PDF once
it's ready. It's a thin UI/routing layer over `@org/pdf-shop-application` —
every page and API route constructs a handler from that package and calls
it; documents and payments are persisted to the filesystem under `PDF_SHOP_DATA_DIR`.

Document _generation_ itself happens outside this app, asynchronously, once
an order is placed — this app only polls for and serves the result once it
exists.

## Pages and routes

| Path                                   | Purpose                                        |
| -------------------------------------- | ---------------------------------------------- |
| `/`                                    | Landing page                                   |
| `/create`                              | Document spec form (color scheme, title, body) |
| `/purchase?doc=`                       | Stripe payment form for a specific document    |
| `/download?doc=`                       | Polls readiness, then offers the download      |
| `/api/documents/[documentId]/status`   | Polled by the download page                    |
| `/api/documents/[documentId]/download` | Streams the generated file                     |

## Local setup

Environment variables (see `.env`, which already has working sandbox
defaults):

| Variable                             | Purpose                                                                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `PDF_SHOP_DATA_DIR`                  | Filesystem root for document/payment records                                                                                          |
| `STRIPE_SECRET_KEY`                  | Stripe sandbox secret key (server-side)                                                                                               |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe sandbox publishable key (client-side)                                                                                          |
| `NODE_ENV`                           | By default, `production` for structured JSON logs and anything else for pretty-printed dev logs — see `PRETTY_PRINT_LOGS` to override |
| `LOG_LEVEL`                          | Overrides the default log level (`info` in production, `trace` otherwise)                                                             |
| `PRETTY_PRINT_LOGS`                  | `true`/`false`; overrides whether logs are pretty-printed. Defaults to `true` outside production, `false` in production               |

Outside production, `PDF_SHOP_DATA_DIR` defaults to `/tmp/pdf-shop-data` if
unset — the same default `worker` uses, so both point at the same
directory locally without needing `.env`. In production, a request that
needs `PDF_SHOP_DATA_DIR` throws instead of silently resolving to `''`.

Start the dev server with:

```
nx dev pdf-shop-website
```

This serves on port `4000`.

## Testing payments

The purchase page is wired to a Stripe **sandbox** account — no real charges
occur. The page itself lists usable test card numbers (a succeeding card, a
declined card, and one that requires 3-D Secure authentication); any future
expiry date, any 3-digit CVC, and any ZIP work with them.

## Manually testing the full flow

There is no automated test suite for this package. To exercise it
end-to-end:

1. `nx dev pdf-shop-website` and walk through `/create` → `/purchase` →
   `/download` in a browser, using a test card above.
2. Generation happens outside this app — to actually see a document become
   downloadable, something must process the order record this app writes to
   `PDF_SHOP_DATA_DIR` (see the `worker` package, which does this for local/manual
   testing via its own Postman collection). Point `worker` at the same
   `PDF_SHOP_DATA_DIR` this app is using so both see the same files.
3. Once generation has written its output, the download page's poller will
   pick it up automatically and the download button will appear.

For known dev-only quirks (e.g. a harmless console error on the purchase
page), see [`known-issues.md`](./known-issues.md).

## Building

```
nx build pdf-shop-website
```

Container image (used for deployment):

```
nx docker:build pdf-shop-website
```
