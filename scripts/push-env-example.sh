#!/usr/bin/env bash
set -e
cd /home/rami/projects/rafiq-plus
git add -f .env.example
PAT="sk-""ant"
if git grep --cached -n "$PAT" -- .env.example; then
  echo "FATAL: secret in .env.example — aborting"; exit 1
fi
git commit -m "Add .env.example

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push
git log --oneline -1
