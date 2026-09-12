# html-gfx-website

A Next.js app for designing small, one-off graphics - social cards,
thumbnails, banners - in a live editor. Filling out the spec form
(size/ratio, background, headline, and subtext, each with their own
font/color) updates an in-browser preview instantly. Exporting either
downloads the graphic directly (HTML/YAML, entirely client-side) or
sends the assembled HTML to `renderer` to be screenshotted server-side
(PNG/JPG/WebP).

## Building

```
nx build html-gfx-website
```

## Dev (Hot reload)

```
nx dev html-gfx-website
```

This serves on port `4000`.

## Containerize

```
nx docker:build html-gfx-website
```

## Pages and routes

| Path                        | Purpose                                                    |
| --------------------------- | ----------------------------------------------------------- |
| `/`                         | Landing page                                                |
| `/create`                  | The graphic editor: spec form, live preview, import/export |
| `/api/ready`                | Proxies `renderer`'s `/livez`, used to poll renderer status |
| `/api/download/[filename]` | Streams a rendered PNG/JPG/WebP back to the user            |

## Local setup

Environment variables (see `.env`, which already has working local
defaults):

| Variable            | Purpose                                                                       |
| -------------------- | -------------------------------------------------------------------------------- |
| `RENDERER_API_URL`  | Base URL of the `renderer` service                                             |
| `OUTPUT_DIR`        | Shared filesystem directory rendered files are read from - must match `renderer`'s own `OUTPUT_DIR` |
| `LOG_LEVEL`         | Overrides the default log level                                                |
| `PRETTY_PRINT_LOGS` | `true`/`false`; pretty-prints logs instead of structured JSON                  |

Start the dev server with:

```
nx dev html-gfx-website
```

## Manually testing the full flow

There is no automated test suite for this package. To exercise it
end-to-end:

1. Start `renderer` alongside this app (`nx serve html-gfx-renderer`) -
   the status badge on the landing page and in the editor's navbar
   shows when it's ready.
2. `nx dev html-gfx-website` and open `/create`.
3. Build a graphic, then use Export to try each format: HTML and YAML
   download directly from the browser; PNG/JPG/WebP round-trip through
   `renderer` and are only enabled once its status badge is green.
4. Use Import with a previously-exported YAML file and confirm the
   editor state restores exactly.
