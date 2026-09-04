# blog-admin

A Nextjs app that allows admins to manage and author content with drafts,
richtext editing and tags. Posts are served over an HTTP API and rendered
by `blog-website` (a public Astro site).

## Building

```
nx build blog-admin
```

## Dev (Hot reload)

```
nx dev blog-admin
```

## Containerize

```
nx docker:build blog-admin
```

See the full [runbook](./RUNBOOK.md) for more details about operation.

## Routes

| Path                      | Purpose                             |
| ------------------------- | ----------------------------------- |
| `/`                       | Redirects to `/admin`               |
| `/admin/*`                | Payload admin UI                    |
| `/api/*`                  | Payload REST API (collections CRUD) |
| `/api/graphql`            | GraphQL API (unused)                |
| `/api/graphql-playground` | GraphQL playground                  |

## Payload Collections

The app uses Payload to define the following collections. Payload also
provides a derived React UI for admins to manage content via CRUD operations.

- **`posts`** - shows drafts for authenticated (admin) requests - published
  posts for anonymous requests. A virtual `contentHTML` field renders
  `content` to HTML in a hook.
- **`media`** - file uploads with `alt` field
- **`tags`** - topics used to filter and find posts
- **`users`** - admin users

See the [payload documentation](./PAYLOAD.md) for a complete reference.

## Local setup

Env vars (see `.env.template`):

| Variable            | Purpose                                                                 |
| ------------------- | ----------------------------------------------------------------------- |
| `DB_PATH`           | SQLite file path                                                        |
| `PAYLOAD_SECRET`    | Session/token signing secret                                            |
| `LOG_LEVEL`         | Control logging verbosity (default `trace`)                             |
| `PRETTY_PRINT_LOGS` | Enable pretty print logs (default `true`)                               |
| `NODE_ENV`          | Override migration environment when running seed (set to `development`) |

## Seeding local data

```
nx seed blog-admin
```

Runs `src/scripts/seed.ts` against whatever database `DB_PATH` points at.
Creates one admin user and 20 blog posts, each with a solid-color JPEG
hero image generated in-memory (via `sharp`) and a few paragraphs of
lorem ipsum content - no network fetches or checked-in image assets.

Idempotent: re-running it skips the admin user (matched by email) and any post (matched by slug) that already exists, so it's safe to run again.

Admin login: `admin@example.com` / `password` (fixed on purpose, for local/demo use only - printed to the console on every run as a reminder).

## Manually testing

No automated test suite exists for this package. To exercise it end to
end:

1. `nx dev blog-admin`, open `/admin`, create the first admin user
   (Payload prompts for this on first visit with no users yet).
2. Create a `posts` entry, publish it.
3. Confirm it's readable anonymously via the REST API
   (`/api/posts?where[_status][equals]=published`) and that a draft post
   is _not_ included.
4. If testing against `blog-website` too, point its `ADMIN_API_URL` at this
   app's origin and confirm `/` and `/posts/<slug>` render it.

See [`known-issues.md`](./known-issues.md) for known Docker-image-only
failure modes.
