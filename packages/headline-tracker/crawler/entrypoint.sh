#!/bin/sh
set -e
# Litestream restore-run-replicate wrapper (litestream.yml points at GCS)
litestream restore -if-replica-exists -o "$STATE_DB_PATH" "$STATE_DB_REPLICA_URL" || true
scrapy crawl articles -a tier="${TIER:-all}"
litestream replicate -exec "true" >/dev/null 2>&1 || true
