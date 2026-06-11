#!/usr/bin/env bash
set -e
cd /home/rami/projects/rafiq-plus
sed -i 's/"name": "kinetic-finance"/"name": "rafiq-plus"/' package.json
sed -i 's/Seeding Kinetic Finance/Seeding Rafiq+/' prisma/seed.ts
head -3 package.json
source ~/.nvm/nvm.sh
pkill -f 'next de[v]' 2>/dev/null || true
pkill -f 'next-serve[r]' 2>/dev/null || true
sleep 1
setsid nohup npm run dev > /tmp/kf-dev.log 2>&1 < /dev/null &
sleep 12
echo "home:$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/)"
echo "api:$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/me)"
