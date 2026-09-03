# blog-admin

A Nextjs app that allows admins to manage and author content with drafts,
richtext editing, tags and SEO customizations. Posts are served over an
HTTP API and consumed and rendered by `blog-website` (a public Astro site).

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
| `/api/graphql`            | GraphQL API                         |
| `/api/graphql-playground` | GraphQL playground                  |

## Collections

See the [payload documentation](./PAYLOAD.md) for a complete reference.

- **`posts`** - shows drafts for authenticated (admin) requests - published
  posts for anonymous requests. A virtual `contentHTML` field renders
  `content` to HTML in a hook.
- **`media`** - file uploads with `alt` field
- **`users`** - admin users

## Local setup

Env vars (see `.env.template`):

| Variable              | Purpose                                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DB_PATH`             | SQLite file path                                                                                                                                  |
| `PAYLOAD_SECRET`      | Session/token signing secret                                                                                                                      |
| `GCS_MEDIA_BUCKET`    | Enables GCS-backed uploads; local dev can leave unset (falls back to local disk)                                                                  |
| `PAYLOAD_CONFIG_PATH` | Present in the committed `.env` - only meaningfully required in the production image (see [runbook](./RUNBOOK.md)); harmless to leave set locally |

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
