"""One generic spider, many sources.

Each source in sources.yaml declares either a sitemap or seed URLs plus
CSS/XPath selectors. Re-crawls of known pages come from the state DB so
we revisit pages even after they fall out of the sitemap.

Run:  scrapy crawl articles -a tier=hot
"""
import hashlib
from datetime import datetime, timezone
from pathlib import Path

import scrapy
import yaml
from itemloaders import ItemLoader
from itemloaders.processors import Join, MapCompose, TakeFirst
from w3lib.html import remove_tags

from crawler.items import ArticleItem
from crawler.state import StateStore


def page_id(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()[:16]


class ArticleLoader(ItemLoader):
    default_item_class = ArticleItem
    default_input_processor = MapCompose(remove_tags, str.strip)
    default_output_processor = TakeFirst()
    body_out = Join("\n")  # body selectors often match many paragraphs


class ArticlesSpider(scrapy.Spider):
    name = "articles"

    def __init__(self, tier="all", sources_file="sources.yaml", **kwargs):
        super().__init__(**kwargs)
        self.tier = tier
        self.sources = yaml.safe_load(Path(sources_file).read_text())["sources"]

    def start_requests(self):
        state = StateStore.from_settings(self.settings)

        for source in self.sources:
            meta = {"source": source}

            # 1. Discovery: sitemap or seed listing pages
            for url in source.get("sitemaps", []):
                yield scrapy.Request(url, callback=self.parse_sitemap, meta=meta)
            for url in source.get("seeds", []):
                yield scrapy.Request(url, callback=self.parse_listing, meta=meta)

            # 2. Re-crawl: pages already in the state DB for this tier.
            #    Conditional headers are attached by ConditionalGetMiddleware.
            for page in state.pages_due(source["key"], tier=self.tier):
                yield scrapy.Request(
                    page.url,
                    callback=self.parse_article,
                    meta={**meta, "known_page": True},
                    dont_filter=True,
                )

    def parse_sitemap(self, response):
        source = response.meta["source"]
        ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        for loc in response.xpath("//sm:url/sm:loc/text()", namespaces=ns).getall():
            if self._url_allowed(loc, source):
                yield response.follow(loc, callback=self.parse_article,
                                      meta=response.meta)

    def parse_listing(self, response):
        source = response.meta["source"]
        for href in response.css(source["listing_link_css"] + "::attr(href)").getall():
            if self._url_allowed(response.urljoin(href), source):
                yield response.follow(href, callback=self.parse_article,
                                      meta=response.meta)

    def parse_article(self, response):
        if response.status == 304:  # unchanged per ETag — skip entirely
            return
        source = response.meta["source"]
        sel = source["selectors"]

        loader = ArticleLoader(response=response)
        loader.add_value("page_id", page_id(response.url))
        loader.add_value("url", response.url)
        loader.add_value("source", source["key"])
        loader.add_value("fetched_at", datetime.now(timezone.utc).isoformat())
        loader.add_value("etag", response.headers.get("ETag", b"").decode() or None)
        loader.add_value("last_modified",
                         response.headers.get("Last-Modified", b"").decode() or None)

        for field in ("headline", "dek", "body", "byline",
                      "published_at", "updated_at"):
            if field in sel:
                loader.add_css(field, sel[field])

        item = loader.load_item()
        item["raw_html"] = response.text  # consumed by SnapshotPipeline
        yield item

    @staticmethod
    def _url_allowed(url: str, source: dict) -> bool:
        patterns = source.get("url_must_contain")
        return not patterns or any(p in url for p in patterns)
