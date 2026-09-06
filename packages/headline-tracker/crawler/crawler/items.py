"""Extraction schema. Fields listed in DIFF_FIELDS are the ones the
diff layer tracks — everything else is metadata."""
import scrapy

# Fields whose changes count as "the page changed"
DIFF_FIELDS = ["headline", "dek", "body", "byline", "published_at", "updated_at"]


class ArticleItem(scrapy.Item):
    # identity
    page_id = scrapy.Field()        # sha256(canonical_url)[:16]
    url = scrapy.Field()
    source = scrapy.Field()         # key from sources.yaml

    # tracked content
    headline = scrapy.Field()
    dek = scrapy.Field()
    body = scrapy.Field()
    byline = scrapy.Field()
    published_at = scrapy.Field()
    updated_at = scrapy.Field()

    # crawl metadata
    fetched_at = scrapy.Field()
    etag = scrapy.Field()
    last_modified = scrapy.Field()
    raw_html_path = scrapy.Field()  # set by pipeline if raw storage enabled
    raw_html = scrapy.Field()       # transient; popped by SnapshotPipeline

    # populated by pipelines
    change = scrapy.Field()         # {"kind": ..., "changed_fields": {...}}
    snapshot_path = scrapy.Field()
