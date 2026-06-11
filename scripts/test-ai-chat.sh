#!/usr/bin/env bash
# Exercises the Claude-powered chat with questions the rules engine can't handle.
set -u
JAR="/tmp/kf-ai-test.txt"
rm -f "$JAR"

ask() {
  echo "=== USER: $1"
  curl -s -m 60 -b "$JAR" -c "$JAR" -X POST -H "content-type: application/json" \
    -d "{\"message\":$(python3 -c "import json,sys;print(json.dumps(sys.argv[1]))" "$1")}" \
    http://localhost:3000/api/rafiq/chat \
    | python3 -c "
import sys, json
d = json.load(sys.stdin)
if not d.get('ok'):
    print('ERROR:', d.get('error')); sys.exit(1)
m = d['data']['rafiqMessage']
print('RAFIQ EN:', m['content'])
print('RAFIQ AR:', m['contentAr'])
acts = json.loads(m['actions'] or '[]')
for a in acts:
    print('  ACTION:', a['kind'], '-', a['label'], a.get('params', {}))
"
  echo
}

ask "If I keep saving at my current monthly rate, when will I afford a 10g gold bar without touching my checking account?"
ask "Compare my dining and groceries spending this month and tell me one realistic way to save"
