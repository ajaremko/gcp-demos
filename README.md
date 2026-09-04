# GCP Demos

This is a workspace for small to medium-sized sample applications deployed to Google Cloud Platform. These projects are meant to showcase my professional abilities
and practices.

**These apps are intended to be operational** - meaning
they deploy to real cloud infrastructure, produce meaningful logs, handle errors thoughtfully, release new versions and are thoroughly documented.

Use the links below to browse the projects.

### Custom Blog

A demo blog with separate front ends for readers and admins
behind a single public origin. Content is authored on a Next.js admin interface while content is read on public Astro website. Persistence is provided by SQLite replicated to
a GCP Cloud Storage bucket and a separate Cloud Storage bucket for file uploads.

- [View the docs](./packages/blog/README.md)
- [View the live demo](https://blog.alfredyoung.com)
- [View the live admin app](https://blog.alfredyoung.com/admin)

### PDF Shop

A demo shop where users order a customized document, pay for it via
Stripe, and download it once it's ready. Generation happens
asynchronously: placing an order makes it durable in storage, which
triggers a background worker (via a GCP Cloud Storage → Pub/Sub
notification) to produce the file - entirely decoupled from the payment
flow.

- [View the docs](./packages/pdf-shop/README.md)
- [View the live demo](https://pdf-shop.alfredyoung.com)

## Releasing Docker images

Docker images are released via [Nx release](https://nx.dev/docs/features/manage-releases), configured under `release` in `nx.json`. Each app to be released belongs to a release _group_ (e.g. `pdf-shop`, covering `pdf-shop-website` and `pdf-shop-worker`), and each release picks a _version scheme_ (`staging` or `hotfix`, both defined under `release.docker.versionSchemes` in `nx.json`) that determines how the image tag is computed from the current date and commit sha.

The Docker registry to push to is resolved dynamically from the `packages/shared/infra` Pulumi stack, rather than hardcoded in `nx.json` — this is deliberate, so the registry can move (e.g. if the Pulumi stack is torn down and recreated) without editing committed config. `nx.json`'s own `release.groups.<name>.docker.registryUrl` value is just an inert placeholder; the release script always overwrites it in memory before running. See [`known-issues.md`](./known-issues.md) for why this can't just be a `${VAR}`-style placeholder directly in `nx.json`.

The release process has two steps, both wired together behind a single npm script:

1. **`scripts/release-setup.sh`** — reads the current registry URL and GCP project from the `packages/shared/infra` Pulumi stack's outputs, exports them (`RELEASE_PROJECT`, `DOCKER_REGISTRY`, `DOCKER_REGISTRY_BASE`) into the shell, and configures `gcloud`'s Docker credential helper for that registry. Must be _sourced_, not executed, so those exports land in the calling shell rather than a subprocess.
2. **`scripts/release-group.ts`** — reads `nx.json`'s release config, patches the requested group's `docker.registryUrl` with `process.env.DOCKER_REGISTRY`, and runs the release through Nx's programmatic `nx/release` API (`ReleaseClient`) rather than the `nx release` CLI, since that's what makes overriding `registryUrl` with an already-resolved value possible. Requires `--group=<name>` and `--dockerVersionScheme=<scheme>`, both validated against what's actually defined in `nx.json` (fails fast with the available options listed if either name doesn't match). Accepts `--dry-run`/`-d` to preview without tagging images or committing/tagging in git.

Both steps run via the root `release` npm script, which sources step 1 and runs step 2 in the same shell:

```sh
npm run release -- --group=pdf-shop --dockerVersionScheme=staging
```

For a hotfix release:

```sh
npm run release -- --group=pdf-shop --dockerVersionScheme=hotfix
```

Add `--dry-run` to preview either command first. Requires `pulumi` and `gcloud` already authenticated against the target GCP project.
