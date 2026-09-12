# html-gfx

[View the live demo](https://html-gfx.alfredyoung.com)

A demo tool for designing small, one-off graphics like social cards or thumbnails without reaching for a full design tool like Canva, GIMP, or Photoshop. `website` is a live spec editor; on export, it either downloads YAML/HTML directly, or hands off the assembled HTML for rendering. Rendering is handled by a Puppeteer-backed service called `renderer` that loads the html page and screenshots it to PNG/JPG/WebP. Rendering is decoupled from the editor so a crashing or slow chromium instance doesn't slow or take down the entire deployment.

## Projects

| Project                                    | Description                                                                                                                        |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| [`website`](./website/README.md)           | The Next.js editor: the graphic spec form, live preview, YAML/HTML/image import-export, and renderer-status polling.               |
| [`renderer`](./renderer/README.md)         | The Express + Puppeteer service that screenshots an assembled HTML document to PNG/JPG/WebP.                                       |
| [`renderer-e2e`](./renderer-e2e/README.md) | End-to-end tests for `renderer`, run against a real, live-served instance.                                                         |
| [`infra`](./infra/README.md)               | Pulumi IaC deploying the system to GCP - Cloud Run services for `website`/`renderer`, the Puppeteer launch-config secret, and IAM. |

## Architecture

`website` and `renderer` are two independent containers
sharing one filesystem volume deployed together as a Cloud Run service. `website` assembles a self-contained
HTML document from the user's spec (headline/subtext/background/size) entirely client-side for the live preview. On exporting to image, that same HTML is sent to `renderer` over HTTP, which loads it in a headless Chrome tab via Puppeteer, screenshots it to the shared volume, and hands `website` back a path to stream back to the user.

```
/create (spec form + live preview)
   │
   ├─ export HTML/YAML ──▶ downloaded directly, no renderer involved
   │
   └─ export PNG/JPG/WebP
        │
        ▼
   POST renderer /render?type=png|jpeg|webp
        │
        ▼
   Puppeteer screenshot ──▶ shared volume
        │
        ▼
   GET website /api/download/[filename] (streams the file back)
```

Since `renderer` can take a minutes to launch its browser on startup, `website` polls `renderer`'s `/livez` (via its own `/api/ready` route) to show a live status badge.

Locally, both services point at the same `OUTPUT_DIR`, so the whole flow runs without a shared volume.

## Releasing

New Docker images for `html-gfx-*` projects are cut via the root
`release` npm script, which wraps Nx's release feature for the
`html-gfx` release group (`nx.json`'s `release.groups.html-gfx` - every
`html-gfx-*` project versioned independently). It requires
[`shared/infra`](../shared/infra)'s `staging` Pulumi stack to already be
deployed - the setup step reads that stack's outputs (GCP project,
Artifact Registry URI) to know where to push images and to authenticate
Docker against it.

From the repo root:

```
npm run release -- --group=html-gfx --dockerVersionScheme=<scheme>
```

`<scheme>` is one of `nx.json`'s configured `release.docker.versionSchemes`:

| Scheme    | Tag format                                       | Use for                               |
| --------- | ------------------------------------------------ | ------------------------------------- |
| `staging` | `{currentDate\|YYMM.DD}.{shortCommitSha}`        | Regular releases to staging           |
| `hotfix`  | `{currentDate\|YYMM.DD}.{shortCommitSha}-hotfix` | Urgent fixes outside the normal cycle |

Add `--dry-run` (or `-d`) to see what would happen without actually
building, tagging, or pushing anything. Building every `html-gfx-*`
image (`nx run-many --target=docker:build`) happens automatically as
part of the release - there's no separate manual build step.

Each project is git-tagged as `release/{projectName}/{version}`
(`nx.json`'s `releaseTag.pattern`), and its image is pushed to the
shared Artifact Registry under that same version.

## Deploying a new release

Cutting a release (above) publishes new images - it doesn't deploy
them. To roll a new version out:

1. Note the version tag the release produced for `html-gfx-website`
   and/or `html-gfx-renderer` (printed by the release script, or
   visible as a new `release/html-gfx-website/<version>` /
   `release/html-gfx-renderer/<version>` git tag).
2. Update `infra/Pulumi.staging.yml`'s `websiteImageTag`/`rendererImageTag`
   to that version.
3. Deploy:

```
nx deploy html-gfx-infra --stack=staging
```

See [`infra`](./infra/README.md) for everything this provisions.
