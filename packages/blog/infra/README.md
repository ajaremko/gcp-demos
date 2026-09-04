# blog-infra

Pulumi IaC (TypeScript, GCP) provisioning the infrastructure `blog` runs
on: a single Cloud Run service running three containers (nginx gateway,
the Astro site, the Payload admin), the two Cloud Storage buckets behind
it, the Secret Manager secrets holding its generated configuration, and
the IAM bindings tying it all together.

This project depends on the [separately-managed, shared Pulumi stack](../../shared/infra),
read via a `StackReference` (`src/config.ts`). A shared Artifact
Registry holds the Docker images that are used by this stack.

## Deploying

These call the matching `pulumi` commands under the hood.

```
nx deploy blog-infra --stack=staging
```

```
nx preview blog-infra --stack=staging
```

```
nx refresh blog-infra --stack=staging
```

```
nx destroy blog-infra --stack=staging
```

```
nx output blog-infra --stack=staging
```

Stack configuration lives in `Pulumi.staging.yml`: the target GCP
project and region, the shared stack to reference, `deletionProtection`,
and the `adminImageTag`/`websiteImageTag` pinning each container's
image. There is no runbook in this project - for operating the deployed
service (startup sequence, logs, debugging) see
[`blog-admin`'s runbook](../admin/RUNBOOK.md) and
[`blog-website`'s runbook](../website/RUNBOOK.md).

## What this provisions

### Enabled APIs

Compute, Resource Manager, Artifact Registry, Cloud Run, Domains, DNS,
Site Verification, Storage, Pub/Sub, Secret Manager.

### Domain Mapping

Domain mapping is configured outside Pulumi though this project enables the necessary apis.

### Storage (`src/storage.ts`)

Two buckets, both with uniform bucket-level access and public access
prevention enforced:

- **Data bucket** - Litestream's replica target for the admin app's
  SQLite database (`blog.sqlite`).
- **Media bucket** - Payload's upload storage. Not public: media is
  streamed back out through the admin container, which is why nginx
  caches `/api/media/file/` responses.

### Secrets (`src/nginx.ts`, `src/litestream.ts`, `src/payload.ts`)

Three of the four secrets hold generated configuration files rendered in
`src/service.ts` and mounted into containers as secret volumes, rather
than being baked into any image:

| Secret                           | Mounted as                       | Contents                                                                   |
| -------------------------------- | -------------------------------- | -------------------------------------------------------------------------- |
| `blog-nginx-conf`                | `/etc/nginx/conf.d/default.conf` | The gateway's routing config (see the root [README](../README.md))         |
| `blog-litestream-conf`           | `/etc/litestream/litestream.yml` | Replication config, with the data bucket name baked in at deploy time      |
| `blog-litestream-startup-script` | `/scripts/run.sh`                | The admin container's entrypoint: restore, migrate, then replicate + serve |
| `blog-payload-secret-key`        | `PAYLOAD_SECRET` env var         | A `random.RandomPassword`-generated signing secret                         |

### The Cloud Run service (`src/service.ts`)

One `cloudrunv2.Service` with three containers:

- **`gateway`** - `nginx:1.27-alpine` on port 8080, the only container
  bound to the service port. Starts after the other two (`dependsOns`)
  and has an HTTP startup probe on `/healthz`.
- **`website`** - the `blog-website` image on port 4321, with
  `ADMIN_API_URL` pointed at `http://127.0.0.1:3000`.
- **`admin`** - the `blog-admin` image on port 3000, with a CPU boost on
  startup. Its `commands`/`args` override the image's own `CMD` to run
  the mounted `run.sh`, so Litestream owns the process tree and the
  Next.js server runs as its child.

Scaling is `minInstanceCount: 0` / `maxInstanceCount: 1` - the service
scales to zero when idle and never runs a second writer against the
replicated SQLite file. Docker images are resolved from the shared
Artifact Registry by tag (`src/getImageUrl.ts`), which falls back to a
public sample image if a tag is missing.

A separate `ServiceIamMember` grants `roles/run.invoker` to `allUsers`,
making the service publicly reachable.

### Service account & IAM (`src/service-account.ts`, `src/iam.ts`)

A single service account runs the service, with:

- `roles/storage.objectAdmin` on both the data and media buckets.
- `roles/secretmanager.secretAccessor` on all four secrets above.

Separately, the project's Cloud Run service agent is granted
`roles/artifactregistry.reader` on the _shared_ project's registry
(applied through a second provider targeting that project, and retained
on delete) so it can pull the `blog-admin`/`blog-website` images.
