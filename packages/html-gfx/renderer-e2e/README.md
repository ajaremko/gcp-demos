# html-gfx-renderer-e2e

End-to-end tests for `html-gfx-renderer`. These run against a real,
live-served `renderer` instance (`nx test` builds and serves
`html-gfx-renderer` first) and drive it over HTTP.

## Running

```
nx test html-gfx-renderer-e2e
```

## What's tested

`src/html-gfx-renderer/html-gfx-renderer.spec.ts`:

- `GET /livez` returns `503` before the renderer's browser has finished
  launching, then `200` once it's ready.
- `POST /render` with a small HTML snippet returns `200`.
