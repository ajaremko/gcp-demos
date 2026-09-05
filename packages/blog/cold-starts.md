# Cold starts

Where the blog's cold-start time goes, what was done about it, what was ruled
out, and the next change worth making. Written as the project wrapped up, so the
last section is a design note rather than something implemented.

Operational detail - how to measure a cold start, how to read the `[startup]`
markers - lives in [`admin`'s runbook](./admin/RUNBOOK.md). This document is the
_why_.

## Why cold starts are user-visible here

Two facts in [`infra/src/service.ts`](./infra/src/service.ts) combine badly:

- **The service scales to zero.** `minInstanceCount: 0` / `maxInstanceCount: 1` -
  so every idle period ends in a full cold start, and there is never a second,
  already-warm instance to answer the request while a new one boots.
- **The gateway starts last.** nginx is the only container bound to the service
  port, and it waits on `dependsOns: ['website', 'admin']`. The `admin` container
  is much the heavier of the two - a restore, a migrate decision, then a full
  Next + Payload boot, against the website's single Node process.

So **the admin container's boot time is the whole service's time-to-first-byte**.
That is why a backend detail is directly visible to a visitor loading the
homepage.

## Where the time goes

Measured on revision `00014`, a genuine scale-to-zero start. Instance start to
ready, **8.77s** - the same table as
[`admin`'s runbook](./admin/RUNBOOK.md), kept in step deliberately:

| Stage                                       | Duration |
| ------------------------------------------- | -------- |
| Instance start -> admin process running     | 0.32s    |
| `litestream restore`                        | 2.33s    |
| `needs-migrate` guard                       | 0.17s    |
| Next boot -> port 3000 bound                | 1.52s    |
| Payload init (port bound -> `/healthz` 200) | 3.31s    |
| gateway nginx + probe                       | 1.01s    |

Two stages dominate: **restoring the SQLite replica** and **Payload's own
initialisation**. Anyone attacking the second should know that Payload emits
**nothing** between Next's "Ready in 0ms" and the startup probe passing - those
3.31 seconds are entirely unlogged. Instrument them first (time `getPayload()`,
or raise `LOG_LEVEL`) rather than guessing at what inside them is expensive.

Read the table with one caveat. Two further changes landed in revision `00015`
after it was taken: the startup probe tightened to 1s polling, and litestream
snapshots moved to hourly so a restore fetches 1 file instead of 15. Comparing
like with like on _deployment rollouts_ (which run slower than scale-to-zero
starts), `00014` took 11.60s and `00015` took 9.07s. A scale-to-zero start on
`00015` was never captured before the project wrapped up, so the restore and
probe rows above are, if anything, slightly pessimistic as things now stand.

## What was already done

Each is explained where it lives; see [`admin`'s runbook](./admin/RUNBOOK.md) for
the detail.

| Change                                          | Effect                                                          |
| ----------------------------------------------- | --------------------------------------------------------------- |
| Prebuilt Payload config + `--disable-transpile` | Removed 11-23s (median ~14s) of tsx transpilation on every boot |
| `needs-migrate.mjs` guard                       | Drops a whole Payload boot from starts with nothing to apply    |
| `httpGet /healthz` startup probe                | Moves Payload's init into the startup window, off request one   |
| `snapshot.interval: 1h` for litestream          | Restore fetches 1 file instead of 15                            |

## What was ruled out

Recorded because each of these is an obvious thing to try, and each was measured
rather than reasoned about.

- **More CPU.** The expensive stages are either single-threaded module
  evaluation (Next boot, Payload init), which does not scale with extra cores, or
  network-bound (the restore). `startupCpuBoost` is already enabled. Raising the
  limit also isn't a one-line change: Cloud Run derives instance CPU from the sum
  of the containers' limits and only accepts certain totals, so the whole
  0.25/0.75/1 split has to be redistributed.
- **More memory.** Peak `container/memory/utilization` is 26-34%, including on
  revisions that ran `512Mi`. Raising it to `1Gi` changed startup latency by
  nothing and was reverted. This had been the leading theory; the metric killed
  it.
- **A smaller image.** 0.32s from instance start to the container's first log
  line, so image pull is not a factor and shrinking `node_modules` would buy
  essentially nothing.
- **Splitting `admin` into read and write containers.** Appealing on paper - the
  read side starts fast and skips migrations, the write side boots slowly without
  gating nginx - but it doesn't survive contact with the numbers. Migrations
  already cost 0.2s behind the guard, so there is nothing left to skip. A
  read-only container would still boot the identical Payload (all four
  collections, the drizzle schema, sharp for media, lexical for `contentHTML`)
  and still need the restored database. `Users` can't even be dropped, because
  [`payload.config.ts`](./admin/src/payload.config.ts) sets
  `admin.user: Users.slug` and Payload requires an auth-enabled collection. The
  split would save ~0.2s in exchange for a fourth container and cross-container
  SQLite on a shared in-memory volume.

The pattern across all four: the remaining time is **structural**, not wasteful.
Nothing is being done twice or unnecessarily; the work is simply on the critical
path.

## Proposed: events as notifications, building a quick-read cache in GCS

**Not implemented.** This is the next change worth making, recorded in enough
detail to pick up cold.

The public site is a pure anonymous read client: it makes four GET queries
against Payload's REST API (all posts, posts by tag, one post by slug, all tags)
and never writes. Yet rendering the homepage requires a fully booted Payload and
a restored SQLite file. That coupling is the whole problem.

### The shape

1. Payload `afterChange` / `afterDelete` hooks on `Posts`, `Tags` and `Media`
   publish a small **"content changed"** message to a Pub/Sub topic. The message
   is a _trigger, not state_ - it carries no record data.
2. An OIDC-authenticated push subscription calls back into the admin, which
   regenerates a full `content.json` from SQLite - published posts and tags, with
   `contentHTML` already rendered - and writes it to Cloud Storage.
3. The Astro site reads that JSON over plain HTTPS instead of calling Payload,
   keeping the admin API as a fallback for a missing or unparseable snapshot.
4. The gateway's `dependsOns` drops to `['website']`, so the admin's boot no
   longer gates readiness.

Projected time-to-ready: **~2.7s** (instance start + website boot + nginx). That
figure is arithmetic from the table above, **not a measurement**.

### What the events do and don't buy

Worth being blunt, because it is easy to attribute the win to the wrong part:
**the latency improvement comes entirely from the website reading GCS instead of
Payload.** The messaging layer changes only how the snapshot gets written.

Pub/Sub earns its place on correctness instead:

- A hook that uploads synchronously leaves the snapshot **silently stale forever**
  if the upload fails. A durable queue retries with backoff and dead-letters.
- A plain in-process "listen to yourself" HTTP self-call is **unreliable here**:
  with `cpuIdle: true` and `minInstanceCount: 0`, Cloud Run can throttle or
  reclaim the instance once requests drain, so deferred work may never finish.

Because the handler always regenerates from current SQLite state, it is
idempotent and order-insensitive, and SQLite stays the single source of truth.
That also means "replay" here means _re-trigger_ - replaying old messages
reproduces current state rather than history. Genuine replay would need the
messages to carry record payloads, which would make the topic a second source of
truth alongside the database.

### Prerequisites it drags in

- **Media must be served directly from GCS.** Hero images currently resolve to
  `/api/media/file/...`, which Payload streams out of the _private_ media bucket.
  If the gateway no longer waits for admin, those 502 until it warms - and
  browsers don't retry a 502. Fixing it means a public-read media bucket plus
  `disablePayloadAccessControl: true` on the `gcsStorage` plugin, so URLs become
  absolute. That is a deliberate security-posture change.
- **Drafts must be excluded from the snapshot.** The query filters on
  `_status: published`. Getting this wrong publishes unpublished content and
  would be invisible in the UI - it is the one correctness failure here that
  wouldn't announce itself.

### Precedent to copy

`packages/pdf-shop` is already a complete, working Pub/Sub pipeline in this
repo - there is no need to invent the shape:

- [`pdf-shop/infra/src/data/topic.ts`](../pdf-shop/infra/src/data/topic.ts) -
  topic plus publisher IAM binding
- [`pdf-shop/infra/src/worker/subscription.ts`](../pdf-shop/infra/src/worker/subscription.ts) -
  OIDC push config, retry policy, dead-letter policy, and a push identity kept
  separate from the runtime identity
- [`pdf-shop/worker/src/main.ts`](../pdf-shop/worker/src/main.ts) - the retry
  convention, which must be copied exactly: **201 for unprocessable messages**
  (suppresses redelivery), **500 only for genuine failures**. Inverting this
  produces infinite redelivery of a message that can never succeed.

One difference to note: the blog service is public (`allUsers` invoker), so
unlike pdf-shop's private worker, Cloud Run will _not_ enforce the OIDC token on
a push endpoint. The handler has to verify it itself.

Two loose ends this would tidy: `infra/src/services.ts` doesn't enable
`pubsub.googleapis.com` even though [`infra`'s README](./infra/README.md) claims
it does, and `infra/src/project.ts` exports a dead `pubsubServiceAccountEmail`
copied from pdf-shop that nothing uses.

## A smaller, independent win

Unrelated to any of the above, and much cheaper:

The homepage and RSS feed query
`/api/posts?where[_status][equals]=published&limit=0&depth=1` with **no `select`**.
So Payload runs `Posts`' `afterRead` hook - a Lexical-to-HTML conversion - over
_every published post_ and ships full bodies, purely to render cards that need a
title, excerpt, hero image and tags. This happens on every cache miss, which
includes the first request after every cold start.

Adding `select` to the listing query in
[`website/src/loaders/posts.ts`](./website/src/loaders/posts.ts) would skip that
work entirely, with no infrastructure change. Pre-rendering `contentHTML` into
the snapshot (above) removes it too, but the `select` fix stands on its own.
