# blog-website

Public-facing blog site (Astro), reading published posts from `blog-admin`
over its HTTP API. Deployed as a sidecar container alongside `blog-admin`
behind nginx, in the same Cloud Run service - nginx routes everything
except `/admin`, `/api`, `/_next` here.

## Building

```
nx build blog-website
```

## Dev (Hot reload)

```
nx dev blog-website
```

## Containerize

```
nx docker:build blog-website
```

See the full [runbook](./RUNBOOK.md) for more details about operation.

## Routes

| Path            | Purpose                                        |
| --------------- | ---------------------------------------------- |
| `/`             | Post listing, live-loaded at request time      |
| `/about`        | About page                                     |
| `/contact`      | Contact page                                   |
| `/posts/<slug>` | A single post                                  |
| `/tags`         | All tags that have at least one published post |
| `/tags/<slug>`  | Published posts carrying that tag              |
| `/rss.xml`      | RSS feed of published posts                    |

`/tag/<slug>` 404s for a tag that doesn't exist, but returns 200 with an
empty state for a real tag whose only posts are drafts. Filtering happens
in Payload (`where[tags.slug][equals]=<slug>`), not in the page.

## Local setup

Env vars (see `.env`):

| Variable            | Purpose                                                                              |
| ------------------- | ------------------------------------------------------------------------------------ |
| `ADMIN_API_URL`     | Base URL of the `blog-admin` instance to read posts from - required, throws if unset |
| `LOG_LEVEL`         | Overrides the default pino level - optional                                          |
| `PRETTY_PRINT_LOGS` | Whether logs are pretty-printed vs. JSON - optional                                  |

```
nx dev blog-website
```

Run `blog-admin` locally too (see its own README) and point `ADMIN_API_URL`
at it, or point it at a real deployed `blog-admin` origin.

## Manually testing

No automated test suite exists for this package. To exercise it end to
end:

1. `nx dev blog-website` with `ADMIN_API_URL` pointed at a running
   `blog-admin` instance that has at least one published post.
2. Visit `/` - confirm the post list renders; visit `/posts/<slug>` -
   confirm the post itself renders, including its hero image if set.
3. Confirm a draft post (unpublished in `blog-admin`) does _not_ appear.
4. Visit `/rss.xml` and confirm it lists the same published posts.

See [`known-issues.md`](./known-issues.md) for a known `astro build`
failure mode.
