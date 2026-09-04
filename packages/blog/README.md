# blog

[View the live demo](https://blog.alfredyoung.com)

A demo blog with two front ends behind a single public origin:
`blog-admin` (Next.js + Payload CMS) is where content is authored, and
`blog-website` (Astro) is the public site that renders published posts.
Both run as containers in the *same* Cloud Run service with an nginx
gateway in front, so the public site reads the admin's HTTP API over
`127.0.0.1` rather than across the network. State is a single SQLite
file continuously replicated to Cloud Storage by Litestream, with
uploaded media in a separate bucket.

## Projects

| Project                          | Description                                                                                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| [`admin`](./admin/README.md)     | The Next.js + Payload CMS app: admin UI, the REST API the website reads, and the SQLite/Litestream persistence behind both.             |
| [`website`](./website/README.md) | The public Astro site, reading published posts from `blog-admin`'s API.                                                                |
| [`infra`](./infra/README.md)     | Pulumi IaC deploying the system to GCP - the single multi-container Cloud Run service, its buckets, secrets, service account, and IAM. |

## Architecture

### One service, three containers

Everything is served by one Cloud Run service (`infra/src/service.ts`).
An nginx `gateway` container listens on the service port and routes by
path:

| Path                | Goes to                              |
| ------------------- | ------------------------------------ |
| `/admin`            | `admin` container (Next.js, `:3000`) |
| `/api`              | `admin` container                    |
| `/_next`            | `admin` container                    |
| `/healthz`          | Answered by nginx itself             |
| everything else     | `website` container (Astro, `:4321`) |

Because both containers share a network namespace, `blog-website` is
configured with `ADMIN_API_URL=http://127.0.0.1:3000` in production -
the admin API is never exposed as its own public origin, and media URLs
returned by the API are root-relative, which only resolves because the
two apps share one origin.

`/api/media/file/` is a special case: Payload streams uploads out of the
private media bucket itself, so every uncached view costs the admin
container a multi-MB proxied read. nginx adds a one-hour `Cache-Control`
there (deliberately not `immutable`, since Payload keeps the uploader's
original filename and a re-upload must not be permanently stale).

### Data

The admin app's database is a SQLite file at `/data/blog.sqlite`, and
Litestream replicates it to the `data` bucket. On every cold start the
`admin` container runs `litestream restore` -> `payload migrate` ->
`litestream replicate` with the Next.js server as its child process -
see [`admin`'s runbook](./admin/RUNBOOK.md) for the full startup
sequence and how to debug a stuck one.

Uploaded media lives in a separate `media` bucket, served through
Payload rather than publicly from GCS.

The service scales `0` -> `1` instance (`minInstanceCount: 0`,
`maxInstanceCount: 1`): scale to zero when idle, and never more than one
writer against the replicated SQLite file. Cold starts are therefore
normal, and the website's in-process page cache resets with them.

## Releasing

New Docker images for `blog-*` projects are cut via the root `release`
npm script, which wraps Nx's release feature for the `blog` release
group (`nx.json`'s `release.groups.blog` - every `blog-*` project
versioned independently). It requires
[`shared/infra`](../shared/infra)'s `staging` Pulumi stack to already be
deployed - the setup step reads that stack's outputs (GCP project,
Artifact Registry URI) to know where to push images and to authenticate
Docker against it.

From the repo root:

```
npm run release -- --group=blog --dockerVersionScheme=<scheme>
```

`<scheme>` is one of `nx.json`'s configured `release.docker.versionSchemes`:

| Scheme    | Tag format                                       | Use for                               |
| --------- | ------------------------------------------------ | ------------------------------------- |
| `staging` | `{currentDate\|YYMM.DD}.{shortCommitSha}`        | Regular releases to staging           |
| `hotfix`  | `{currentDate\|YYMM.DD}.{shortCommitSha}-hotfix` | Urgent fixes outside the normal cycle |

Add `--dry-run` (or `-d`) to see what would happen without actually
building, tagging, or pushing anything. Building every `blog-*` image
(`nx run-many --target=docker:build`) happens automatically as part of
the release - there's no separate manual build step.

Each project is git-tagged as `release/{projectName}/{version}`
(`nx.json`'s `releaseTag.pattern`), and its image is pushed to the
shared Artifact Registry under that same version.

## Deploying a new release

Cutting a release (above) publishes new images - it doesn't deploy
them. To roll a new version out:

1. Note the version tags the release produced for `blog-admin` and/or
   `blog-website` (printed by the release script, or visible as a new
   `release/blog-admin/<version>` / `release/blog-website/<version>` git
   tag).
2. Update `infra/Pulumi.staging.yml`'s `adminImageTag`/`websiteImageTag`
   to those versions. Both containers are pinned separately, so either
   can be rolled forward on its own.
3. Deploy:

```
nx deploy blog-infra --stack=staging
```

See [`infra`](./infra/README.md) for everything this provisions, and
[`admin`'s runbook](./admin/RUNBOOK.md) /
[`website`'s runbook](./website/RUNBOOK.md) for operating the deployed
service.
