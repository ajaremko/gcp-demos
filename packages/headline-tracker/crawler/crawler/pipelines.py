"""Pipeline order (settings.py):
  1. DiffPipeline      — compare against state, attach change info
  2. SnapshotPipeline  — persist JSON snapshot (+ optional raw HTML)
  3. EmitPipeline      — publish change events (stdout locally, Pub/Sub in prod)
"""
import gzip
import json
import os
from datetime import datetime, timezone

from itemadapter import ItemAdapter
from scrapy.exceptions import DropItem

from crawler import diffing
from crawler.state import StateStore


class DiffPipeline:
    def open_spider(self, spider):
        self.state = StateStore.from_settings(spider.settings)

    def process_item(self, item, spider):
        ad = ItemAdapter(item)
        prev = self.state.get(ad["page_id"])
        new_hashes = diffing.hashes(ad.asdict())

        if prev is None:
            ad["change"] = {"kind": "new", "changed_fields": {}}
        else:
            changed = diffing.compare(prev.field_hashes, ad.asdict())
            if not changed:
                self.state.upsert(ad.asdict(), new_hashes, changed=False)
                raise DropItem(f"unchanged: {ad['url']}")
            ad["change"] = {"kind": "modified", "changed_fields": changed}

        self.state.upsert(ad.asdict(), new_hashes,
                          changed=bool(ad["change"]["changed_fields"]))
        return item


class SnapshotPipeline:
    """Writes snapshots to local disk or GCS depending on SNAPSHOT_ROOT
    (e.g. 'data/snapshots' or 'gs://monitor-snapshots')."""

    def open_spider(self, spider):
        self.root = spider.settings.get("SNAPSHOT_ROOT", "data/snapshots")
        self.keep_raw = spider.settings.getbool("SNAPSHOT_KEEP_RAW", True)
        self.fs = _make_fs(self.root)

    def process_item(self, item, spider):
        ad = ItemAdapter(item)
        raw = ad.get("raw_html")
        if "raw_html" in ad:
            del ad["raw_html"]
        ts = ad["fetched_at"].replace(":", "").replace("+00:00", "Z")
        base = f"{ad['page_id']}/{ts}"

        if self.keep_raw and raw:
            path = f"{base}.html.gz"
            self.fs.write(path, gzip.compress(raw.encode()))
            ad["raw_html_path"] = f"{self.root}/{path}"

        record = {k: v for k, v in ad.asdict().items()
                  if k not in ("raw_html", "change")}
        self.fs.write(f"{base}.json", json.dumps(record).encode())
        ad["snapshot_path"] = f"{self.root}/{base}.json"
        return item


class EmitPipeline:
    def open_spider(self, spider):
        self.topic = spider.settings.get("PUBSUB_TOPIC")  # None => stdout
        if self.topic:
            from google.cloud import pubsub_v1
            self.publisher = pubsub_v1.PublisherClient()

    def process_item(self, item, spider):
        ad = ItemAdapter(item)
        event = {
            "page_id": ad["page_id"],
            "url": ad["url"],
            "source": ad["source"],
            "detected_at": datetime.now(timezone.utc).isoformat(),
            "kind": ad["change"]["kind"],
            "changed_fields": ad["change"]["changed_fields"],
            "snapshot": ad.get("snapshot_path"),
        }
        payload = json.dumps(event).encode()
        if self.topic:
            self.publisher.publish(self.topic, payload)
        else:
            spider.logger.info("CHANGE %s", payload.decode())
        return item


def _make_fs(root: str):
    if root.startswith("gs://"):
        return _GCSWriter(root)
    return _LocalWriter(root)


class _LocalWriter:
    def __init__(self, root):
        self.root = root

    def write(self, rel_path: str, data: bytes):
        path = os.path.join(self.root, rel_path)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            f.write(data)


class _GCSWriter:
    def __init__(self, root):
        from google.cloud import storage
        bucket_name = root.removeprefix("gs://").split("/")[0]
        self.bucket = storage.Client().bucket(bucket_name)

    def write(self, rel_path: str, data: bytes):
        self.bucket.blob(rel_path).upload_from_string(data)
