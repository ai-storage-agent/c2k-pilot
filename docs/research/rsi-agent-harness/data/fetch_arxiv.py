#!/usr/bin/env python3
"""Collect an arXiv corpus for RSI / self-improving agent systems."""
import json
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

NS = {
    "a": "http://www.w3.org/2005/Atom",
    "arxiv": "http://arxiv.org/schemas/atom",
}
API = "https://export.arxiv.org/api/query"

QUERIES = [
    'all:"recursive self-improvement"',
    'all:"self-improving" AND all:"language model"',
    'all:"self-improving agents"',
    'all:"self-evolving agents"',
    'all:"self-evolving" AND all:"LLM agents"',
    'all:"self-modifying" AND all:"code" AND all:"language model"',
    'all:"automated design of agentic systems"',
    'all:"meta agent search"',
    'all:"agentic workflow optimization"',
    'all:"Godel machine"',
    'all:"Darwin Godel Machine"',
    'all:"self-referential" AND all:"agent"',
    'all:"AI scientist"',
    'all:"automated scientific discovery" AND all:"LLM"',
    'all:"AlphaEvolve" OR all:"evolutionary coding agent"',
    'all:"open-ended" AND all:"agent" AND all:"evolution"',
    'all:"continual learning" AND all:"LLM agents"',
    'all:"lifelong learning" AND all:"agents"',
    'all:"experience" AND all:"reuse" AND all:"LLM agent"',
    'all:"skill library" AND all:"agent"',
    'all:"memory" AND all:"LLM agent" AND all:"architecture"',
    'all:"self-reflection" AND all:"LLM"',
    'all:"verbal reinforcement learning"',
    'all:"prompt optimization" AND all:"LLM"',
    'all:"DSPy" OR all:"TextGrad" OR all:"GEPA"',
    'all:"test-time training" AND all:"LLM"',
    'all:"self-play" AND all:"reasoning" AND all:"LLM"',
    'all:"synthetic data" AND all:"self-improvement"',
    'all:"reward model" AND all:"self-improvement"',
    'all:"agent harness" OR all:"agent scaffold"',
    'all:"context engineering" AND all:"agent"',
    'all:"agentic reinforcement learning"',
    'all:"survey" AND all:"self-evolving agents"',
    'all:"survey" AND all:"self-improving"',
    'all:"AI alignment" AND all:"self-improving"',
    'all:"sandbox" AND all:"autonomous coding agent"',
    'all:"SWE-bench" AND all:"agent"',
    'all:"meta-learning" AND all:"LLM agent" AND all:"update"',
    'all:"self-generated curriculum" AND all:"agent"',
    'all:"code evolution" AND all:"LLM" AND all:"optimization"',
]


def fetch(query, max_results=40):
    params = {
        "search_query": query,
        "start": 0,
        "max_results": max_results,
        "sortBy": "relevance",
        "sortOrder": "descending",
    }
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "rsi-harness-research/1.0"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return resp.read()
        except Exception as exc:  # noqa: BLE001
            print(f"  retry {attempt + 1} for {query!r}: {exc}", flush=True)
            time.sleep(5)
    return None


def parse(raw):
    root = ET.fromstring(raw)
    out = []
    for entry in root.findall("a:entry", NS):
        def text(tag):
            node = entry.find(tag, NS)
            return node.text.strip() if node is not None and node.text else ""

        aid = text("a:id")
        arxiv_id = aid.rsplit("/abs/", 1)[-1]
        out.append(
            {
                "id": arxiv_id,
                "title": " ".join(text("a:title").split()),
                "summary": " ".join(text("a:summary").split()),
                "published": text("a:published"),
                "updated": text("a:updated"),
                "authors": [a.findtext("a:name", default="", namespaces=NS)
                            for a in entry.findall("a:author", NS)],
                "categories": [c.get("term") for c in entry.findall("a:category", NS)],
                "url": f"https://arxiv.org/abs/{arxiv_id}",
                "pdf": f"https://arxiv.org/pdf/{arxiv_id}",
                "comment": " ".join(text("arxiv:comment").split()),
                "journal_ref": text("arxiv:journal_ref"),
            }
        )
    return out


def main():
    corpus = {}
    for i, q in enumerate(QUERIES, 1):
        print(f"[{i}/{len(QUERIES)}] {q}", flush=True)
        raw = fetch(q)
        if raw is None:
            print("   FAILED", flush=True)
            continue
        items = parse(raw)
        for it in items:
            base = it["id"].split("v")[0]
            if base not in corpus:
                it["queries"] = [q]
                corpus[base] = it
            else:
                corpus[base]["queries"].append(q)
        print(f"   +{len(items)} (total {len(corpus)})", flush=True)
        time.sleep(3.5)
    with open("arxiv_corpus.json", "w", encoding="utf-8") as fh:
        json.dump(list(corpus.values()), fh, ensure_ascii=False, indent=1)
    print(f"DONE {len(corpus)} unique papers", flush=True)


if __name__ == "__main__":
    main()
