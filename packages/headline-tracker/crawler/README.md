# crawler

Scrapy-based site change monitor. Crawls configured sources, diffs
extracted fields against the last-seen state, snapshots every version,
and emits structured change events.

## Layout in the Nx workspace

Drop this directory at `apps/crawler/`. Targets are plain
`nx:run-commands` wrapping uv — no Nx plugin required.

```
nx install crawler          # uv sync --all-extras
nx lint crawler             # ruff
nx test crawler             # pytest
nx crawl crawler --tier=hot # run the spider
nx shell crawler            # scrapy shell for selector dev
nx container crawler       # docker build
```

## Workspace-level setup (one-time)

1. `apps/crawler/.venv` should be ignored: add `.venv` to the
   root `.gitignore` if not already covered.
2. So `nx affected` works from a cold checkout, CI needs uv installed
   before Nx runs (`astral-sh/setup-uv` action, or
   `curl -LsSf https://astral.sh/uv/install.sh | sh`).
3. Optional: if your root `nx.json` `targetDefaults` assume JS inputs
   (e.g. `production` excludes only spec.ts files), nothing to change —
   this project declares its own `namedInputs.python` and references it
   per-target, so it doesn't depend on the workspace defaults.

## Local dev

```
uv sync --all-extras
uv run scrapy crawl articles          # writes to data/ (gitignored)
DEV_CACHE=1 uv run scrapy crawl ...   # cache responses while iterating
```

GCS/Pub/Sub are activated purely by env (`SNAPSHOT_ROOT=gs://...`,
`PUBSUB_TOPIC=projects/../topics/..`); locally everything writes to
`data/`.
