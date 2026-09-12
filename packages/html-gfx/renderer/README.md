# html-gfx-renderer

An Express service that screenshots an assembled HTML document to an
image using Puppeteer. `website` POSTs the HTML it wants rendered;
this service loads it in a headless Chrome tab, screenshots it, and
writes the result to `OUTPUT_DIR` for `website` to serve back to the
user.

## Building

```
nx build html-gfx-renderer
```

## Serve (Hot reload)

```
nx serve html-gfx-renderer
```

## Containerize

```
nx docker:build html-gfx-renderer
```

## Routes

| Path             | Purpose                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `GET /livez`      | Health check - `200` once Puppeteer's browser has launched and capacity is available, `503` while still starting or at capacity |
| `POST /render`    | Body is the raw HTML to render (`Content-Type: text/html`); optional `?type=png\|jpeg\|webp` query (defaults to `png`); responds with `{ path }` |

## Local setup

Configuration is entirely via environment variables:

| Variable                   | Purpose                                          | Required                        |
| ---------------------------- | --------------------------------------------------- | ---------------------------------- |
| `OUTPUT_DIR`                | Directory rendered files are written to           | yes                              |
| `MAX_PAGES`                 | Max concurrent Puppeteer pages/renders            | yes                              |
| `PUPPETEER_LAUNCH_CONFIG`   | Path to a JSON file of Puppeteer launch options   | no - uses Puppeteer's defaults   |
| `PORT`                      | Port the server listens on                        | no - defaults to `3333`          |

Start the server with:

```
nx serve html-gfx-renderer
```

## Automated tests

End-to-end tests for this service live in `renderer-e2e`, not here -
they run against a really-served instance rather than calling handlers
directly:

```
nx test html-gfx-renderer-e2e
```
