import os

BOT_NAME = "crawler"
SPIDER_MODULES = ["crawler.spiders"]

# ---- politeness ----
ROBOTSTXT_OBEY = True
AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 2.0
AUTOTHROTTLE_TARGET_CONCURRENCY = 1.0
CONCURRENT_REQUESTS_PER_DOMAIN = 2
USER_AGENT = "crawler (personal research; +mailto:you@example.com)"

# allow 304 through to the spider instead of treating it as an error
HTTPERROR_ALLOWED_CODES = [304]

# ---- pipelines / middleware ----
ITEM_PIPELINES = {
    "crawler.pipelines.DiffPipeline": 100,
    "crawler.pipelines.SnapshotPipeline": 200,
    "crawler.pipelines.EmitPipeline": 300,
}
DOWNLOADER_MIDDLEWARES = {
    "crawler.middlewares.ConditionalGetMiddleware": 543,
}

# ---- storage (env-driven: local by default, GCS in prod) ----
STATE_DB_PATH = os.environ.get("STATE_DB_PATH", "data/state.db")
SNAPSHOT_ROOT = os.environ.get("SNAPSHOT_ROOT", "data/snapshots")
SNAPSHOT_KEEP_RAW = os.environ.get("SNAPSHOT_KEEP_RAW", "1") == "1"
PUBSUB_TOPIC = os.environ.get("PUBSUB_TOPIC")  # unset => log to stdout

# scrapy's own HTTP cache is useful during selector development
HTTPCACHE_ENABLED = os.environ.get("DEV_CACHE", "0") == "1"
HTTPCACHE_EXPIRATION_SECS = 3600

REQUEST_FINGERPRINTER_IMPLEMENTATION = "2.7"
TWISTED_REACTOR = "twisted.internet.asyncioreactor.AsyncioSelectorReactor"
FEED_EXPORT_ENCODING = "utf-8"
