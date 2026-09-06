"""Canonicalization + comparison. The whole point: diff extracted
fields, never raw pages."""
import difflib
import hashlib
import re
from crawler.items import DIFF_FIELDS

_WS = re.compile(r"\s+")
# strip common tracking params from any URLs embedded in text
_TRACKING = re.compile(r"[?&](utm_[a-z]+|fbclid|gclid)=[^&\s]+")


def canonical(text: str | None) -> str:
    if not text:
        return ""
    text = _TRACKING.sub("", text)
    return _WS.sub(" ", text).strip().lower()


def field_hash(text: str | None) -> str:
    return hashlib.sha256(canonical(text).encode()).hexdigest()[:16]


def similarity(a: str | None, b: str | None) -> float:
    return difflib.SequenceMatcher(None, canonical(a), canonical(b)).ratio()


def compare(old_fields: dict, new_item: dict) -> dict:
    """Return {field: change_detail} for fields that differ.

    old_fields: {field: hash} from the state DB.
    Body-like long fields get a similarity score (needs previous snapshot
    text — the pipeline passes it in via old_fields as '<field>__text').
    """
    changes = {}
    for field in DIFF_FIELDS:
        new_hash = field_hash(new_item.get(field))
        old_hash = old_fields.get(field)
        if old_hash is None or old_hash == new_hash:
            continue
        detail = {"before_hash": old_hash, "after_hash": new_hash}
        old_text = old_fields.get(f"{field}__text")
        if old_text is not None:
            detail["similarity"] = round(
                similarity(old_text, new_item.get(field)), 4)
        changes[field] = detail
    return changes


def hashes(item: dict) -> dict:
    return {f: field_hash(item.get(f)) for f in DIFF_FIELDS}
