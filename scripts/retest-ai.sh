#!/usr/bin/env bash
set -u
bash /home/rami/projects/rafiq-plus/scripts/start-prod.sh > /tmp/kf-build.log 2>&1
echo "BUILD: $(tail -2 /tmp/kf-build.log | tr '\n' ' ')"
curl -s -m 90 -X POST -H 'content-type: application/json' \
  -d '{"message":"What did I spend on dining this month?"}' \
  http://localhost:3000/api/rafiq/chat | head -c 400
echo
echo "--- log ---"
grep -a 'rafiq-ai' /tmp/kf-prod.log | tail -3
