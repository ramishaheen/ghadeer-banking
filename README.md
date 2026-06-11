# Rafiq+ رفيق — Bank al Etihad mobile banking with your AI companion

**Rafiq+** is a production-real implementation of the Stitch project
"Remix of Foundation UI Screens" (29 screens): the Kinetic Finance design
system + the Rafiq رفيق AI companion. Mobile-first web app.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS v4** — both design palettes (Kinetic light / Rafiq prestige dark)
  ported token-for-token from the Stitch screens
- **Prisma + SQLite** — real persistence (accounts, transactions, gold orders,
  chat history, insights, goals, KYC, alerts, tutorial progress)
- **k6** — load tests in `tests/k6/`

## Features (all real, no mocks)

| Area | Screens | Backed by |
| --- | --- | --- |
| Accounts Overview (Home) | balance card w/ privacy mask, money in/out, cashback vault withdraw, accounts + IBAN sheet, recent activity, promo | `/api/me`, `/api/summary`, `/api/transactions`, `/api/cashback/withdraw` |
| Products & Investments Hub | 4-col product tiles, investment tiles, NEW badges, AI investment guide tooltip | `/api/tutorials` |
| Physical Gold marketplace | live 60s price ticks, 2-col catalog, stock states, product detail w/ 24h price chart, purchase sheet (vault/delivery, source account), order success, My orders | `/api/gold/*` |
| Rafiq AI companion | greeting home (dark/light), chat with action chips, smart insight cards, transfer task execution w/ FaceID step, financial coaching (real category math), voice command | `/api/rafiq/*`, `/api/transfers`, `/api/goals` |
| KYC annual update | 5-step orb-guided wizard with field + server validation | `/api/kyc`, `/api/kyc/submit` |
| AI guided tutorials | 6-frame gold purchase tutorial across Home → Hub → Gold, contextual tips | `/api/tutorials`, `/api/alerts` |

The Rafiq engine answers from the user's actual records: balances, transaction
lookups ("why was I charged…"), subscription audits, spending breakdowns,
transfer/bill-pay/gold/alert actions — deterministic NLU, bilingual EN/AR replies.

## Run

```bash
npm install
npx prisma migrate dev   # creates dev.db
npx tsx prisma/seed.ts   # seeds Ahmed's data, gold catalog, price history
npm run dev              # http://localhost:3000
```

Demo session auto-provisions the seeded user (Ahmed) with a real session cookie.

## Load tests

```bash
# server running first
k6 run tests/k6/smoke.js   # 1 VU sanity
k6 run tests/k6/load.js    # ramp to 20 VUs, hold 5m
k6 run tests/k6/stress.js  # find the breaking point (optional)
```

## Reference

`reference/` contains the 29 extracted Stitch screen HTML files and
`DESIGN-INTEL.md` (brand guides, flows, data facts) the implementation follows.
