# pdf-shop

[Live demo](./application/README.md)

A demo shop where users order a customized document, pay for it via
Stripe, and download it once it's ready. Generation happens
asynchronously: placing an order makes it durable in storage, which
triggers a background worker (via a GCP Cloud Storage → Pub/Sub
notification) to produce the file - entirely decoupled from the payment
flow.

## Projects

| Project                                  | Description                                                                                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`application`](./application/README.md) | The shared business-logic layer - order, payment, generation, and download handlers, plus the on-disk record persistence they all use.                  |
| [`website`](./website/README.md)         | The Next.js customer-facing app: the spec form, Stripe checkout, and download.                                                                          |
| [`worker`](./worker/README.md)           | The Express service that generates documents asynchronously, triggered by Cloud Storage notifications via Pub/Sub.                                      |
| [`worker-e2e`](./worker-e2e/README.md)   | End-to-end tests for `worker`, run against a real, live-served instance.                                                                                |
| [`infra`](./infra/README.md)             | Pulumi IaC deploying the system to GCP - Cloud Run services for `website`/`worker`, the shared data bucket, the Pub/Sub notification pipeline, and IAM. |
