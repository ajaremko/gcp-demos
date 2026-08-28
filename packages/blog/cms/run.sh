#!/bin/sh
set -e
litestream restore -if-replica-exists -o /data/blog.db "gcs://$GCS_DATA_BUCKET/db/blog.db"
npx payload migrate
exec litestream replicate -exec "node packages/blog/cms/server.js"
