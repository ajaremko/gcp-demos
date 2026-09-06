"""Per-page mutable state in SQLite. Single writer (one job at a time),
so this is SQLite's happy path. Litestream replication to GCS happens
outside this module (job entrypoint).
"""
import json
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

SCHEMA = """
CREATE TABLE IF NOT EXISTS pages (
    page_id       TEXT PRIMARY KEY,
    url           TEXT NOT NULL,
    source        TEXT NOT NULL,
    tier          TEXT NOT NULL DEFAULT 'warm',
    first_seen    TEXT NOT NULL,
    last_crawled  TEXT,
    last_changed  TEXT,
    etag          TEXT,
    last_modified TEXT,
    field_hashes  TEXT NOT NULL DEFAULT '{}'   -- json {field: hash}
);
CREATE INDEX IF NOT EXISTS idx_pages_source_tier ON pages(source, tier);
"""

# re-crawl intervals per tier
TIER_INTERVALS = {
    "hot": timedelta(hours=1),      # < 48h old, front-page items
    "warm": timedelta(hours=6),
    "cold": timedelta(days=2),
}


@dataclass
class PageState:
    page_id: str
    url: str
    etag: str | None
    last_modified: str | None
    field_hashes: dict


class StateStore:
    def __init__(self, db_path: str):
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)

    @classmethod
    def from_settings(cls, settings):
        return cls(settings.get("STATE_DB_PATH", "data/state.db"))

    def get(self, page_id: str) -> PageState | None:
        row = self.conn.execute(
            "SELECT * FROM pages WHERE page_id = ?", (page_id,)).fetchone()
        if row is None:
            return None
        return PageState(row["page_id"], row["url"], row["etag"],
                         row["last_modified"], json.loads(row["field_hashes"]))

    def pages_due(self, source: str, tier: str = "all"):
        """Known pages whose re-crawl interval has elapsed."""
        now = datetime.now(timezone.utc)
        tiers = TIER_INTERVALS if tier == "all" else {tier: TIER_INTERVALS[tier]}
        for t, interval in tiers.items():
            cutoff = (now - interval).isoformat()
            rows = self.conn.execute(
                "SELECT * FROM pages WHERE source=? AND tier=? "
                "AND (last_crawled IS NULL OR last_crawled < ?)",
                (source, t, cutoff)).fetchall()
            for row in rows:
                yield PageState(row["page_id"], row["url"], row["etag"],
                                row["last_modified"],
                                json.loads(row["field_hashes"]))

    def upsert(self, item: dict, field_hashes: dict, changed: bool):
        now = datetime.now(timezone.utc).isoformat()
        self.conn.execute(
            """INSERT INTO pages
                 (page_id, url, source, first_seen, last_crawled,
                  last_changed, etag, last_modified, field_hashes)
               VALUES (?,?,?,?,?,?,?,?,?)
               ON CONFLICT(page_id) DO UPDATE SET
                 last_crawled=excluded.last_crawled,
                 last_changed=CASE WHEN ? THEN excluded.last_crawled
                                   ELSE pages.last_changed END,
                 etag=excluded.etag,
                 last_modified=excluded.last_modified,
                 field_hashes=excluded.field_hashes""",
            (item["page_id"], item["url"], item["source"], now, now,
             now if changed else None, item.get("etag"),
             item.get("last_modified"), json.dumps(field_hashes), changed))
        self.conn.commit()
