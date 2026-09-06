"""Attach If-None-Match / If-Modified-Since on re-crawls of known pages.
A 304 short-circuits extraction entirely (handled in parse_article).
"""
from crawler.state import StateStore


class ConditionalGetMiddleware:
    def __init__(self, state: StateStore):
        self.state = state

    @classmethod
    def from_crawler(cls, crawler):
        return cls(StateStore.from_settings(crawler.settings))

    def process_request(self, request, spider):
        if not request.meta.get("known_page"):
            return None
        from crawler.spiders.articles import page_id
        prev = self.state.get(page_id(request.url))
        if prev is None:
            return None
        if prev.etag:
            request.headers["If-None-Match"] = prev.etag
        elif prev.last_modified:
            request.headers["If-Modified-Since"] = prev.last_modified
        return None
