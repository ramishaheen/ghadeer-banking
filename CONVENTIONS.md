# Kinetic Finance — Frontend Conventions (for all screen builders)

## Project locations
- Project root (edit via this UNC path with Read/Write/Edit tools): `\\wsl.localhost\Ubuntu-22.04\home\rami\projects\kinetic-finance`
- Reference design HTML files (read-only): `C:\Users\DRRAM\ghaddeer team\.stitch-extract\data\screens\`
- Design intel (brand, flows, data facts): `C:\Users\DRRAM\ghaddeer team\.stitch-extract\data\DESIGN-INTEL.md`
- Dev server runs in WSL at http://localhost:3000 (don't start/stop it).

## Fidelity rule
Port the reference HTML structure and Tailwind classes as faithfully as possible into JSX.
The reference markup's custom tokens ALL WORK in this project (same names):
- Colors: `bg-primary`, `text-on-surface`, `bg-surface-container-high`, `border-outline-variant`, etc. (full M3 token set, themed per route group)
- Typography: `font-display-lg text-display-lg`, `font-headline-md text-headline-md`, `text-headline-md-mobile`, `font-body-md text-body-md`, `font-label-sm text-label-sm`
- Spacing: `px-container-margin`, `p-element-padding`, `gap-card-gap`, `px-container-padding`, `gap-stack-gap`
- Effects: `.balance-gradient`, `.rafiq-gradient`, `.kinetic-glow`, `.glass-panel`, `.rafiq-input-glow`, `.hide-scrollbar`, `.pb-safe`, `.orb-pulse`, `.glow-breathe`, `.wave-bar`, `.typing-dot`, `.fade-up`, `.sheet-up`, `.skeleton`
JSX conversions: `class` → `className`, self-close imgs, `style="font-variation-settings: 'FILL' 1;"` → use `<Icon name="..." filled />`.
Replace every static data value with REAL API data. Replace remote `lh3.googleusercontent.com` images with local assets (`/gold/pamp-5g.svg` etc., `/promo-vaults.svg`) or icon/gradient compositions.

## Theming
- Kinetic (light) pages live in `src/app/(kinetic)/...` — wrapped in `data-theme="kinetic"` by the group layout.
- Rafiq (dark) pages live in `src/app/(rafiq)/rafiq/...` — wrapped in `data-theme="rafiq"`, glow already in layout.
- NEVER hardcode theme colors except where the reference HTML hardcodes them (e.g. `#ff6b00` ring, gradients, white tutorial bubbles).

## Shared components (already built — import, don't recreate)
- `@/components/Icon` → `<Icon name="search" filled className="text-primary" />` (Material Symbols)
- `@/components/States` → `Skeleton`, `ScreenSkeleton`, `ErrorState`, `EmptyState`
- `@/components/Sheet` → bottom sheet with scrim: `<Sheet open onClose>{…}</Sheet>`
- `@/components/kinetic/TopBar` → `<TopBar membership name onNotifications />`
- `@/components/kinetic/BottomNav` → `<BottomNav />` (Payment/Home/Hub, active by route)
- `@/components/rafiq/Orb` → `<Orb size={56} onClick={…} />` (gradient AI orb)
- `@/components/rafiq/RafiqTopBar` → `<RafiqTopBar back="/rafiq" status="Online" />`
- `@/components/tutorial/TutorialScrim` → scrim+spotlight+orb+bubble+dots overlay (see its props)

## Data layer
- `"use client"` pages/components; fetch with `import { api, useApi } from "@/lib/client"` (types exported there: `Me`, `Account`, `Txn`, `GoldProduct`, `GoldOrder`, `ChatMsg`, `Insight`, `CoachingData`, `TutorialState`…).
- `useApi<T>(path)` returns `{ data, error, loading, reload }`. Render `ScreenSkeleton`/skeletons while loading, `ErrorState` with `onRetry={reload}` on error, designed empty states when lists are empty.
- Mutations: `await api<T>("/api/…", { method: "POST", body: JSON.stringify(payload) })` inside try/catch — show inline error text (designed style: `text-error text-label-sm`) and disable buttons while pending.
- Money: `import { fmtJod, fmtJod2, fmtJodPlain, toMils } from "@/lib/format"` — JOD has 3 decimals. NEVER compute money in floats; use integer mils.

## API endpoints (all live and tested)
- `GET /api/me` → `Me` (user, totalMils, accounts, kyc {step,status}, activeAlerts)
- `GET /api/accounts`, `GET /api/transactions?accountId=&category=&limit=`, `GET /api/summary` → {monthInMils, monthOutMils, cashbackMils}
- `POST /api/transfers` {fromAccountId, toAccountId, amountMils, note?}
- `POST /api/bills/pay` {accountId, merchant, amountMils}
- `GET /api/gold/price?history=1` → {pricePerGramMils, at, history:[{p,t}]}
- `GET /api/gold/products` → {pricePerGramMils, priceAt, products: GoldProduct[]}
- `GET /api/gold/products/[sku]` → {product, pricePerGramMils, history (24h, per-unit prices)}
- `GET|POST /api/gold/orders` POST {productId, qty, fulfillment: "DELIVERY"|"VAULT", sourceAccountId} → 201 {order}
- `GET|POST /api/rafiq/chat` POST {message} → {userMessage, rafiqMessage} (rafiqMessage.actions = JSON string of ChatAction[])
- `GET /api/rafiq/insights`, `PATCH /api/rafiq/insights/[id]` {status: "SEEN"|"ACTED"|"DISMISSED"}
- `GET /api/rafiq/coaching` → CoachingData
- `POST /api/rafiq/command` {transcript} → {intent, speech, confirm}
- `GET|POST /api/goals`, `PATCH /api/goals/[id]` {monthlyMils?|addSavedMils?…}
- `GET|POST /api/kyc` POST {step, personal?, work?}; `POST /api/kyc/submit`
- `GET|POST /api/tutorials` POST {key, step?, dismissed?, completed?} — keys: GOLD_BUY, KYC_UPDATE, HUB_INVEST_TIP, HOME_AI_TIP, GOLD_SMART_TIP
- `GET|POST /api/alerts` POST {productId?, thresholdMils, direction: "ABOVE"|"BELOW"}
- `POST /api/cashback/withdraw` {} → {withdrawnMils, account} (422 if vault empty)
- Error envelope: `{ok:false, error}` with proper status; `api()` throws Error(message).

## Tutorial anchor contract (data-tut attributes)
Pages expose spotlight anchors for the guided tutorials:
- Home: `data-tut="home-orb"` (floating orb FAB)
- BottomNav (already done): `data-tut="nav-payment" | "nav-home" | "nav-hub"`
- Hub: `data-tut="gold-tile"` on the Physical Gold tile; `data-tut="invest-section"` on the Investment section header card
- Gold shop: `data-tut="gold-5g-card"` on the 5g product card, `data-tut="gold-5g-add"` on its + button
- Gold purchase sheet: `data-tut="confirm-purchase"` on the Confirm purchase button
- Gold success: `data-tut="success-chips"`

## Quality bar
- TypeScript strict — no `any` unless unavoidable; no unused imports (ESLint must pass).
- Buttons: `active:scale-95 transition-transform` tactile feedback (per design).
- All interactive elements ≥44px tap target. aria-labels on icon buttons.
- No emojis in UI. No `Inter` font (fonts already configured). No pure black backgrounds.
- Loading: skeletons matching layout (no spinners). Errors: inline. Empty: composed.
