# blog-website runbook

Operational reference for running `blog-website` in production: environment
configuration, reading its logs, and debugging problems.

## Configuring the environment

| Variable            | Type      | Purpose                                                | Visibility | Notes                                                                                        |
| ------------------- | --------- | ------------------------------------------------------ | ---------- | -------------------------------------------------------------------------------------------- |
| `ADMIN_API_URL`     | `string`  | Base URL of the `blog-admin` origin to read posts from | private    | Throws (`fatal`-logged) at request time if unset. In production it's `http://127.0.0.1:3000` - an internal-only address, not reachable from a visitor's browser |
| `ADMIN_PUBLIC_URL`  | `string`  | Browser-reachable base URL for `blog-admin`'s media files | private    | Throws (`fatal`-logged) at request time if unset. Different from `ADMIN_API_URL` in production, where nginx fronts both apps on the site's public domain - locally the two are the same (`http://localhost:4000`) since there's no gateway separating them |
| `PORT`              | `number`  | Port the server listens on (`4321`)                    | private    |                                                                                              |
| `LOG_LEVEL`         | `enum`    | Overrides the default pino level                       | private    | Defaults to `info` in production, `trace` otherwise                                          |
| `PRETTY_PRINT_LOGS` | `boolean` | Whether logs are pretty-printed vs. JSON               | private    | Defaults to `true` outside production, `false` in it                                         |

## Logging

Server-side logging goes through [pino](https://getpino.io/)
(`src/logging/pino.ts`). `LOG_LEVEL` is a threshold - whatever it's set to
shows that level and everything more severe.

Levels follow one rule:

| Level   | Use it for                                                                                                                |
| ------- | ------------------------------------------------------------------------------------------------------------------------- |
| `trace` | Step-by-step internal execution detail - only useful when actively tracing a specific problem; fine to be noisy.          |
| `debug` | A problem handled internally that didn't change the outcome the caller sees - worth knowing about, not worth surfacing.   |
| `info`  | A normal, expected event or outcome.                                                                                      |
| `warn`  | A fallback, degraded, or recoverable-but-non-ideal situation - things still worked, just not the way they're supposed to. |
| `error` | Something failed that shouldn't have - the operation or a dependency misbehaved, even if the process itself survives.     |
| `fatal` | The process can't safely continue - typically missing required configuration.                                             |

Pick a new log call's level from the table above, not by copying what a
nearby call already uses.

`pino-pretty` is a devDependency only - the production Docker image
excludes devDependencies (`Dockerfile`'s `npm install --omit=dev`), so
`PRETTY_PRINT_LOGS` must never be forced to `true` there (the default
already handles this correctly by keying off `NODE_ENV`).

## Caching

`/` and `/posts/[...slug]` are cached via Astro's built-in `cache`
config (`astro.config.mjs`'s `routeRules`), backed by Astro's own
in-process `memoryCache()` provider - `maxAge: 300` (5 minutes fresh),
`swr: 60` (another 60 seconds stale-while-revalidate before a request
blocks on a fresh fetch). No other routes are cached.

Two operational consequences worth knowing:

- **The cache is in-process memory, not shared or durable.** It resets on
  every restart, every new revision, and every cold start - with
  `minInstanceCount: 0` (see `packages/blog/infra/src/service.ts`),
  that's routine. Don't expect a warm cache to persist across deploys or
  scale-to-zero cycles.
- **Up to ~6 minutes of staleness after a `blog-admin` edit is normal**,
  not a bug - that's `maxAge` + `swr` combined. The posts loader
  (`src/loaders/posts.ts`) attaches cache tags (`posts`,
  `post:<slug>`) for tag-based invalidation, but nothing in this
  project currently calls Astro's invalidation API to use them.

## Debugging problems

- **Every page returns 502** - `ADMIN_API_URL` is almost certainly wrong or
  `blog-admin` is unreachable; check the `error`/`fatal` log line first
- **Hero images are missing on every post** - check two things:
  `ADMIN_PUBLIC_URL` is set correctly (a wrong value produces a broken
  `<img>` src, not a missing one), and that `blog-admin`'s `media`
  collection still grants public read access
  (`packages/blog/admin/src/collections/Media.ts`) - without it, the
  admin API silently returns `heroImage` as an unpopulated raw ID for
  anonymous requests rather than erroring, so the field just comes back
  empty.
- **A draft post is visible, or a published one is missing** - not this
  project's concern to fix; the posts loader (`src/loaders/posts.ts`) passes
  `where[_status][equals]=published` straight through to `blog-admin`'s
  REST API, so check access control there
  (`packages/blog/admin/src/collections/Posts.ts`).
- **`astro build` fails with a `cookie` CommonJS/named-export error** -
  see [`known-issues.md`](./known-issues.md); already worked around in
  `astro.config.mjs`, but worth knowing if it ever resurfaces after a
  dependency bump.
- **Stale content persists longer than expected** - see "Caching" above
  before assuming something's broken.

## What's not covered

No automated test suite (unit or end-to-end) for this package -
confidence in a change relies on the manual verification steps in the
[README](./README.md).
