#!/bin/sh
# Install (or refresh) the daily work-progress digest cron entry for the current user.
#
# digest.mjs is copied to a stable directory under the dsh-superagent state dir and
# the cron entry runs that copy, so the job survives removal of the ticket worktree
# it was installed from. Re-run this script after changing digest.mjs.
#
# The host clock is UTC and this cron ignores TZ= / CRON_TZ= in the crontab
# (verified on cron 3.0pl1-200ubuntu1), so the schedule is expressed in UTC.
# 20:30 Asia/Shanghai (UTC+8, no DST) is 12:30 UTC.
#
# Usage:
#   DIGEST_CHAT_ID=oc_xxx tools/daily-digest/install.sh
# Environment:
#   DIGEST_CHAT_ID    Feishu chat_id (oc_...) to post to (required)
#   DIGEST_CRON       cron expression in UTC (default "30 12 * * *")
#   DIGEST_HOME       deployment home (default: $HOME)
#   DIGEST_DEPLOY_DIR deploy target (default: $DIGEST_HOME/.dsh/state/superagent/daily-digest)
#   DIGEST_NODE       node binary (default: /usr/bin/node)
#   DIGEST_LARK_CLI   lark-cli or wrapper (default: $DIGEST_HOME/.local/bin/lark-bot)
#   DIGEST_GH_CLI     gh or wrapper (default: $DIGEST_HOME/.local/bin/gh-agent)
#   DIGEST_REPO       owner/name override
#   DIGEST_DRY_RUN    "1" to print the entry without installing it
set -eu

self_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
digest_src="$self_dir/digest.mjs"
home=${DIGEST_HOME:-$HOME}
deploy_dir=${DIGEST_DEPLOY_DIR:-$home/.dsh/state/superagent/daily-digest}
node=${DIGEST_NODE:-/usr/bin/node}
schedule=${DIGEST_CRON:-30 12 * * *}
log="$home/.dsh/state/superagent/daily-digest.log"
marker='# dsh-daily-digest'

: "${DIGEST_CHAT_ID:?set DIGEST_CHAT_ID to the Feishu chat_id (oc_...) to post to}"
[ -f "$digest_src" ] || { echo "missing $digest_src" >&2; exit 1; }

mkdir -p "$deploy_dir"
cp "$digest_src" "$deploy_dir/digest.mjs"

command="PATH=\"$home/.local/bin:/usr/local/bin:/usr/bin:/bin\" HOME=\"$home\" DIGEST_CHAT_ID=\"$DIGEST_CHAT_ID\" DIGEST_TZ=\"Asia/Shanghai\" DIGEST_LARK_CLI=\"${DIGEST_LARK_CLI:-$home/.local/bin/lark-bot}\""
[ -n "${DIGEST_GH_CLI:-}" ] && command="$command DIGEST_GH_CLI=\"$DIGEST_GH_CLI\""
[ -n "${DIGEST_REPO:-}" ] && command="$command DIGEST_REPO=\"$DIGEST_REPO\""
entry="$schedule $command $node $deploy_dir/digest.mjs >> \"$log\" 2>&1 $marker"

# Keep unrelated lines, replace a previous installation of this job.
tmp=$(mktemp)
crontab -l 2>/dev/null | grep -v "$marker" > "$tmp" || true
printf '%s\n' "$entry" >> "$tmp"

if [ "${DIGEST_DRY_RUN:-0}" = "1" ]; then
  echo "deployed: $deploy_dir/digest.mjs"
  echo "would install:"; cat "$tmp"
else
  crontab "$tmp"
  echo "deployed: $deploy_dir/digest.mjs"
  echo "installed: $entry"
  echo "log: $log"
fi
rm -f "$tmp"
