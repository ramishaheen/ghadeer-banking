#!/usr/bin/env bash
curl -s http://localhost:3000/api/rafiq/chat | python3 -c "
import sys, json
d = json.load(sys.stdin)
msgs = d['data']['messages'][-4:]
for m in msgs:
    print(f\"[{m['role'].upper()}] {m['content']}\")
    if m.get('contentAr'):
        print(f\"   AR: {m['contentAr']}\")
    if m.get('actions'):
        for a in json.loads(m['actions']):
            print(f\"   ACTION: {a['kind']} — {a['label']} {a.get('params', {})}\")
    print()
"
