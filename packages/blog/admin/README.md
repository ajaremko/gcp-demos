# blog-admin

Payload CMS admin app - manages the content (`posts`, `media`) that
`blog-website` (the public Astro site) reads over Payload's REST API.
Deployed as a sidecar container alongside `blog-website` behind nginx, in
the same Cloud Run service.

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

- **`users`** - admin auth (`auth: true`), no custom fields.
- **`media`** - file uploads (GCS-backed via the `gcsStorage` plugin when
  `GCS_MEDIA_BUCKET` is set); one field, `alt` (required).
- **`posts`** - `title`, `slug` (unique), `excerpt`, `heroImage` (→
  `media`), `content` (Lexical richtext), `publishedDate`.
  `versions.drafts: true`. `access.read` shows drafts only to
  authenticated (admin) requests - anonymous requests (`blog-website`)
  only ever see `_status: published`. A virtual `contentHTML` field
  renders `content` to HTML via `convertLexicalToHTMLAsync` in an
  `afterRead` hook, so API consumers get ready-to-render HTML instead of
  parsing Lexical's JSON themselves.

## Local setup

Env vars (see `.env`):

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
4. If testing against `blog-website` too, point its `CMS_URL` at this
   app's origin and confirm `/blog` and `/blog/<slug>` render it.

See [`known-issues.md`](./known-issues.md) for known Docker-image-only
failure modes.
