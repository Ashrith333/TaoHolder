# taoholder: the TAO holder desk

See what you hold. Stake or invest in subnets. Sell back. One confirm.
Built to **TH-PRD-002 v2.3**, with the look from the Figma file (black, white and red; dark by default).

- **Stack:** Next.js (App Router) · TypeScript strict · Tailwind + CSS tokens · Zustand · TanStack Query · Zod · @polkadot/api · Supabase (config/content) · Vitest · Playwright
- **Non-custodial:** the wallet signs one `utility.batchAll`. No raw signing, no keys, nothing stored server-side.

## Run it

```bash
pnpm install
cp .env.example .env.local        # NEXT_PUBLIC_CHAIN=local runs on sample data + Demo wallet
pnpm dev                          # http://localhost:3000
```

`local` uses fixtures and the **Demo wallet** (in the Connect sheet). Demo buttons stand in for the wallet and chain, so you can see every result: approve, reject, prices moved, and no block. Set `NEXT_PUBLIC_CHAIN=mainnet` or `testnet` for live sources (see *Data sources*).

| Command | What |
|---|---|
| `pnpm lint` | ESLint (feature boundaries, services stay pure) + line limits + security grep |
| `pnpm typecheck` / `pnpm test` | tsc, Vitest unit tests (maths, guards, quote, diff, batch, config) |
| `pnpm exec playwright test` | E2E flows on phone and laptop with the Demo wallet |
| `pnpm content:check` | Zod-validates every JSON file in `content/` (runs before `build`) |
| `pnpm db:seed` | Upserts `content/` into Supabase (needs `SUPABASE_DB_URL`) |

## How it fits together

```
content/            JSON config + curated content (git source of truth, fallback)
supabase/           migrations for the config DB (same documents, editable live)
src/app/            routes only: each page renders <PageSections page="…"/>
src/sections/       registry: section key → component (the swap point)
src/features/       account · trade · preview · learn · history · wallet · settings
src/services/       pure logic, bigint rao: weights, plan, guards, quote, quoteDiff, buildBatch, txMachine, sell
src/adapters/       content loader (Supabase → JSON), data sources, wallets, chain submit, analytics
src/components/ui/  Button, Seg, Chip, Tag/ImpactTag, Checkbox, Badge, Alert, Sheet, Row, Change
```

Config is loaded on the server for every request (60 s cache): **each document comes from Supabase if the row exists and passes Zod; otherwise from `content/`.** If Supabase is down or not configured, the app keeps running on `content/` JSON. `GET /api/config` shows what is being served and where each document came from (`origin`).

See **[docs/CONFIG.md](docs/CONFIG.md)** for how to change features and guards, add an input source, or swap a section.

## Deploy

Vercel (or any Node host): set the env vars from `.env.example`. The old one-file site is in `legacy/index.html`. If GitHub Pages still serves `taoholder.com` from `main`, point DNS at the new host before merging this branch to `main`.

## Before mainnet

- Verify chain calls: [docs/adr/001-chain-calls.md](docs/adr/001-chain-calls.md) (T0).
- Replace the **placeholder validator hotkeys** in `validators` (currently well-known dev addresses).
- Replace the **sample subnet copy** and add real links and revenue.
- Add a Taostats API key (`TAOSTATS_API_KEY`) and check the field names in `data_sources.config`.
- Legal pages (`src/content-static/legal.ts`) after legal review (D9).
