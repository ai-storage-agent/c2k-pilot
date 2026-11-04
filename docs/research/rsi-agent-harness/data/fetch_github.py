#!/usr/bin/env python3
"""Search GitHub for RSI / self-improving agent harness repositories."""
import json
import subprocess
import time

QUERIES = [
    "self-improving agent",
    "self-evolving agent",
    "recursive self-improvement",
    "automated design of agentic systems",
    "agent harness",
    "godel machine agent",
    "self-modifying code LLM",
    "agent self-improvement framework",
    "evolutionary coding agent",
    "LLM agent memory self-improve",
    "meta agent search",
    "prompt optimization agent",
    "self-evolving LLM",
    "autonomous research agent",
    "agent benchmark self-improvement",
]

OUT = []
for q in QUERIES:
    cmd = [
        "gh", "search", "repos", q,
        "--limit", "20",
        "--json", "fullName,description,stargazersCount,updatedAt,url,language",
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
        if res.returncode != 0:
            print(f"[{q}] FAILED: {res.stderr.strip()[:200]}", flush=True)
            continue
        items = json.loads(res.stdout or "[]")
    except Exception as exc:  # noqa: BLE001
        print(f"[{q}] ERROR {exc}", flush=True)
        continue
    print(f"[{q}] {len(items)}", flush=True)
    for it in items:
        it["query"] = q
        OUT.append(it)
    time.sleep(2)

seen = {}
for it in OUT:
    key = it["fullName"]
    if key in seen:
        seen[key].setdefault("queries", []).append(it["query"])
    else:
        it["queries"] = [it["query"]]
        seen[key] = it

with open("github_repos.json", "w", encoding="utf-8") as fh:
    json.dump(sorted(seen.values(), key=lambda x: -x["stargazersCount"]), fh,
              ensure_ascii=False, indent=1)
print(f"DONE {len(seen)} unique repos", flush=True)
