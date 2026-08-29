#!/bin/sh
echo "Running with /etc/litestream.yml:"
cat /etc/litestream.yml
set -e
litestream restore -if-replica-exists -o /data/blog.sqlite "gcs://$GCS_DATA_BUCKET/blog.sqlite"
npx payload migrate
exec litestream replicate -exec "node packages/blog/cms/server.js"
