# pdf-shop-infra

Pulumi IaC (TypeScript, GCP) provisioning the infrastructure `pdf-shop`
runs on: two Cloud Run services (`website`, `worker`), the shared data
bucket they both read and write, the Cloud Storage → Pub/Sub
notification pipeline that triggers generation, and the IAM bindings
tying it all together.

This project depends on the [separately-managed, shared Pulumi stack](../../shared/infra).
A shared Artifact Registry holds the Docker images that are used by
this stack.

## Deploying

This calls `pulumi up` under the hood.

```
nx deploy pdf-shop-infra --stack=staging
```

```
nx preview pdf-shop-infra --stack=staging
```

```
nx destroy pdf-shop-infra --stack=staging
```

See the full [runbook](./RUNBOOK.md) for stack configuration and
troubleshooting a failed deploy.

## What this provisions

### Enabled APIs

Compute, Resource Manager, Artifact Registry, Cloud Run, Domains, DNS,
Site Verification, Storage, Pub/Sub, Secret Manager, and reCAPTCHA
Enterprise (`src/services.ts`). Domains/DNS/Site Verification are
enabled but no domain-mapping resource is defined anywhere in this
stack - the live custom domain
([pdf-shop.alfredyoung.com](https://pdf-shop.alfredyoung.com), per the
root [README](../README.md)) is evidently mapped outside Pulumi.

### Shared data & order notifications (`src/data/`)

- **Data bucket** - the single GCS bucket both `website` and `worker`
  read/write document records to and from, mounted into both Cloud Run
  services as a GCS FUSE volume at `/tmp/data`.
- **Document-orders topic** - a Pub/Sub topic the bucket publishes
  `OBJECT_FINALIZE` notifications to, scoped to `created/` object names
  only (`objectNamePrefix`) - the same order-placed trigger described in
  the root README and `worker`'s own docs.

### Dead-letter handling (`src/deadletter/`)

A separate GCS bucket, plus IAM bindings letting the Pub/Sub service
account write to it. `worker`'s own subscription (below) points its
dead-letter policy at a topic that archives into this bucket once
delivery keeps failing.

### Website resources (`src/website/`)

- A Cloud Run v2 service running the `pdf-shop-website` image, with its
  own service account (storage object create/view on the data bucket,
  Secret Manager access), public invoker access, and the data bucket
  mounted at `/tmp/data`.
- A Secret Manager secret holding the Stripe secret key, mounted into
  the container as `STRIPE_SECRET_KEY` only when
  `stripeSecretKeySecretVersion` is configured.

### Worker resources (`src/worker/`)

- A Cloud Run v2 service running the `pdf-shop-worker` image, its own
  service account (storage object create/view on the data bucket), and
  the data bucket mounted the same way - no public invoker access.
- A Pub/Sub push subscription on the document-orders topic, delivering
  to the worker's own URL via a dedicated invoker service account
  (OIDC-authenticated push, not public), with a dead-letter policy (5
  delivery attempts) pointing at the dead-letter topic/bucket above.
