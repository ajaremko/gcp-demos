# pdf-shop

[View the live demo](https://pdf-shop.alfredyoung.com)

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

## Releasing

New Docker images for `pdf-shop-*` projects are cut via the root
`release` npm script, which wraps Nx's release feature for the
`pdf-shop` release group (`nx.json`'s `release.groups.pdf-shop` - every
`pdf-shop-*` project versioned independently). It requires
[`shared/infra`](../shared/infra)'s `staging` Pulumi stack to already be
deployed - the setup step reads that stack's outputs (GCP project,
Artifact Registry URI) to know where to push images and to authenticate
Docker against it.

From the repo root:

```
npm run release -- --group=pdf-shop --dockerVersionScheme=<scheme>
```

`<scheme>` is one of `nx.json`'s configured `release.docker.versionSchemes`:

| Scheme    | Tag format                                       | Use for                               |
| --------- | ------------------------------------------------ | ------------------------------------- |
| `staging` | `{currentDate\|YYMM.DD}.{shortCommitSha}`        | Regular releases to staging           |
| `hotfix`  | `{currentDate\|YYMM.DD}.{shortCommitSha}-hotfix` | Urgent fixes outside the normal cycle |

Add `--dry-run` (or `-d`) to see what would happen without actually
building, tagging, or pushing anything. Building every `pdf-shop-*`
image (`nx run-many --target=docker:build`) happens automatically as
part of the release - there's no separate manual build step.

Each project is git-tagged as `release/{projectName}/{version}`
(`nx.json`'s `releaseTag.pattern`), and its image is pushed to the
shared Artifact Registry under that same version.

## Deploying a new release

Cutting a release (above) publishes new images - it doesn't deploy
them. To roll a new version out:

1. Note the version tag the release produced for `pdf-shop-website`
   and/or `pdf-shop-worker` (printed by the release script, or visible
   as a new `release/pdf-shop-website/<version>` /
   `release/pdf-shop-worker/<version>` git tag).
2. Update `infra/Pulumi.staging.yml`'s `websiteImageTag`/`workerImageTag`
   to that version.
3. Deploy:

```
nx deploy pdf-shop-infra --stack=staging
```

See [`infra`](./infra/README.md) for everything this provisions, and
its [runbook](./infra/RUNBOOK.md) for troubleshooting a failed deploy.
