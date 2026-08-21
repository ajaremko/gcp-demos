# pdf-shop-infra runbook

Operational reference for deploying and maintaining `pdf-shop-infra`:
stack configuration, what each command does, and how to diagnose a
failed deploy.

## Configuring the stack

Configuration lives in `Pulumi.<stack>.yml`. `staging` is the only
stack currently configured (`Pulumi.staging.yml`):

| Key                            | Purpose                                                                                                         |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `project`                      | GCP project id                                                                                                  |
| `region`                       | GCP region                                                                                                      |
| `sharedStackName`              | Pulumi org/project reference to the external shared-infra stack this stack pulls Artifact Registry details from |
| `websiteImageTag`              | Image tag deployed for `pdf-shop-website`                                                                       |
| `workerImageTag`               | Image tag deployed for `pdf-shop-worker`                                                                        |
| `deletionProtection`           | Whether the Cloud Run services block destructive updates/`destroy`                                              |
| `stripeSecretKeySecretVersion` | Secret Manager version mounted as `STRIPE_SECRET_KEY`; if unset, no such env var is mounted at all              |

Image tags aren't built or published by this package - see `website`'s
and `worker`'s own READMEs for how each image gets built
(`nx docker:build`). This package only consumes an already-published
tag: update `websiteImageTag`/`workerImageTag` here to match before
deploying. If a tag is left unset, `getImageUrl.ts` falls back to a
public sample image (`gcr.io/google-samples/hello-app:1.0`) rather than
failing - fine for a first-time apply, but worth checking if a deploy
"succeeds" yet the service is serving the wrong thing.

## Commands

Every nx target accepts `--args='--stack=<name>'`, interpolated into
the underlying `pulumi` command:

| nx target | Pulumi command        | Purpose                                                                   |
| --------- | --------------------- | ------------------------------------------------------------------------- |
| `preview` | `pulumi preview`      | Show what would change, without applying anything                         |
| `deploy`  | `pulumi up`           | Apply the current state                                                   |
| `refresh` | `pulumi refresh`      | Reconcile Pulumi's state with the actual GCP resources                    |
| `destroy` | `pulumi destroy`      | Tear down every resource in the stack                                     |
| `output`  | `pulumi stack output` | Print stack outputs (add `--args='--stack=staging --json=true'` for JSON) |

Example:

```
nx run pdf-shop-infra:preview --args='--stack=staging'
```

## Debugging a failed deploy

- **`deletionProtection` blocks an update or destroy** - both Cloud Run
  services are created with `deletionProtection` from stack config. With
  it `true`, any change requiring replacement (or a `destroy`) fails
  until it's set to `false` and re-deployed first.
- **A deploy "succeeds" but serves the wrong thing** - check that
  `websiteImageTag`/`workerImageTag` actually point at a real, published
  tag. An unset or stale tag silently resolves to the public sample
  image instead of erroring (see `getImageUrl.ts`).
- **The `sharedStackName` reference fails to resolve** - `project.ts`
  reads `artifactRegistryLocation`/`artifactRegistryName`/
  `artifactRegistryRepositoryId` via a `pulumi.StackReference` to
  `sharedStackName`. If that stack doesn't exist, was renamed, or the
  current Pulumi login lacks access to it, every resource that depends
  on the Artifact Registry (both Cloud Run services) fails to resolve.
- **A Cloud Run service fails its startup probe** - `website` probes
  `/api/health`, `worker` probes `/health`, both after a 10s initial
  delay. Check the Cloud Run service's own logs in the GCP console for
  why the container itself isn't answering - Pulumi's own output won't
  show application-level failures.

## Notes

- The data bucket, dead-letter bucket, and Pub/Sub topics/subscriptions
  are shared, standalone resources - nothing here is torn down just
  because `website` or `worker`'s own deploy changes.
- Both buckets are created with `forceDestroy: true`, so `destroy`
  removes them - and their contents - even if non-empty. There's no
  orphaned-bucket protection here.
- The custom domain
  ([pdf-shop.alfredyoung.com](https://pdf-shop.alfredyoung.com)) isn't
  mapped by any resource in this stack - the Domains/DNS/Site
  Verification APIs are enabled (`src/services.ts`) but unused by name
  anywhere in `src/`, so the mapping is evidently managed outside
  Pulumi.

See the [README](./README.md) for what's actually provisioned.
