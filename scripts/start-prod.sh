#!/usr/bin/env bash
set -e
cd /home/rami/projects/rafiq-plus
source ~/.nvm/nvm.sh
pkill -f 'next de[v]' 2>/dev/null || true
pkill -f 'next-serve[r]' 2>/dev/null || true
pkill -f 'next star[t]' 2>/dev/null || true
sleep 1
npm run build 2>&1 | tail -15
setsid nohup npm run start > /tmp/kf-prod.log 2>&1 < /dev/null &
sleep 8
echo "prod-home:$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/)"
echo "prod-api:$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/me)"
