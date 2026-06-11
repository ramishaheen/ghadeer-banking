#!/usr/bin/env bash
# Commit the project and push to github.com/ramishaheen/ghadeer-banking.
set -e
cd /home/rami/projects/rafiq-plus

# 1. Git identity (only set if missing)
git config user.name >/dev/null 2>&1 || git config user.name "Rami Shaheen"
git config user.email >/dev/null 2>&1 || git config user.email "dr.rami.b.h@gmail.com"

# 2. Use Windows GitHub CLI as the credential helper for HTTPS pushes
git config credential.helper "/mnt/c/Program\ Files/GitHub\ CLI/gh.exe auth git-credential"

# 3. Branch: ensure we're on main
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
  git branch -m "$BRANCH" main
fi

# 4. Stage everything, then SAFETY CHECKS before committing
git add -A

echo "--- safety: secrets scan on staged files ---"
PAT="sk-""ant"   # split so this script never matches its own pattern
if git grep --cached -n "$PAT" -- . ; then
  echo "FATAL: API key found in staged files — aborting."
  exit 1
fi
echo "no secrets found in staged files"

echo "--- safety: ignored files ---"
git check-ignore -v .env || { echo "FATAL: .env is NOT ignored — aborting"; exit 1; }
if git ls-files --cached | grep -E '^prisma/dev\.db'; then
  echo "FATAL: dev.db staged — aborting"; exit 1
fi
echo "db + env safely excluded"

# 5. Commit
git commit -m "Rafiq+ — Bank al Etihad mobile banking with Claude-powered AI companion

Full-stack implementation of the Stitch design project (29 screens):
- Next.js 16 App Router + React 19 + Tailwind v4 (dual design-token themes)
- Prisma/SQLite: accounts, transactions, gold orders, chat, insights, goals,
  KYC, price alerts, tutorial progress (money as integer mils, JOD 3dp)
- Live gold pricing (60s ticks), atomic transfers, validated purchases
- Rafiq AI companion: Claude (claude-opus-4-8) with structured JSON output,
  grounded in real account data, server-side action validation, deterministic
  rules-engine fallback; bilingual EN/AR
- Guided tutorials (gold purchase, 5-step KYC) with orb spotlight overlays
- k6 load tests (smoke/load/stress) — 20 VU load run: 0% failures, p95 45ms

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"

# 6. Remote + push
git remote get-url origin >/dev/null 2>&1 || git remote add origin https://github.com/ramishaheen/ghadeer-banking.git
git push -u origin main
echo "--- pushed ---"
git log --oneline -2
