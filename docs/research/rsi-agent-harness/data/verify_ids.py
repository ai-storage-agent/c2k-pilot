#!/usr/bin/env python3
"""Verify every arXiv ID cited in the report against the arXiv API.

Usage:
    python3 verify_ids.py                 # extract IDs from ../references.md
    python3 verify_ids.py ids.txt         # or read IDs from a file (one per line)

Writes verified_papers.json: {id: {title, published}} for every ID that resolved.
Exits non-zero if any cited ID fails to resolve.
"""
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

NS = {"a": "http://www.w3.org/2005/Atom"}
API = "https://export.arxiv.org/api/query"
HERE = os.path.dirname(os.path.abspath(__file__))


def ids_from_references(path):
    text = open(path, encoding="utf-8").read()
    found = set(re.findall(r"arxiv\.org/abs/([A-Za-z0-9./-]+?)(?:\)|\s|$)", text))
    found |= set(re.findall(r"arXiv:([A-Za-z0-9./-]+?)(?:\s|$)", text))
    ok = re.compile(r"^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?/\d{7})$")
    return sorted({f.split("v")[0] for f in found if ok.match(f)})


def main():
    if len(sys.argv) > 1:
        ids = [l.strip() for l in open(sys.argv[1]) if l.strip()]
    else:
        refs = os.path.normpath(os.path.join(HERE, "..", "references.md"))
        if not os.path.exists(refs):
            sys.exit(
                f"references.md not found at {refs}; run from the report's data/ "
                f"directory or pass an explicit id list: python3 verify_ids.py ids.txt"
            )
        ids = ids_from_references(refs)
    print(f"verifying {len(ids)} ids", flush=True)

    resolved = {}
    for i in range(0, len(ids), 25):
        chunk = ids[i:i + 25]
        params = {"id_list": ",".join(chunk), "max_results": len(chunk)}
        url = API + "?" + urllib.parse.urlencode(params)
        req = urllib.request.Request(url, headers={"User-Agent": "rsi-harness-research/1.0"})
        raw = None
        for attempt in range(3):
            try:
                raw = urllib.request.urlopen(req, timeout=90).read()
                break
            except Exception as exc:  # noqa: BLE001
                print(f"  retry {attempt + 1}: {exc}", flush=True)
                time.sleep(6)
        if raw is None:
            print(f"  FAILED chunk starting {chunk[0]}", flush=True)
            continue
        root = ET.fromstring(raw)
        for entry in root.findall("a:entry", NS):
            aid = entry.findtext("a:id", default="", namespaces=NS).rsplit("/abs/", 1)[-1]
            aid = aid.split("v")[0]
            title = " ".join(entry.findtext("a:title", default="", namespaces=NS).split())
            published = entry.findtext("a:published", default="", namespaces=NS)
            resolved[aid] = {"title": title, "published": published}
        print(f"  chunk {i // 25 + 1}: resolved {len(resolved)}", flush=True)
        time.sleep(3.5)

    missing = [x for x in ids if x not in resolved]
    with open(os.path.join(HERE, "verified_papers.json"), "w", encoding="utf-8") as fh:
        json.dump(resolved, fh, ensure_ascii=False, indent=1)
    print(f"RESOLVED {len(resolved)} of {len(ids)}")
    print(f"MISSING {missing}")
    sys.exit(1 if missing else 0)


if __name__ == "__main__":
    main()
