# Running taoholder in production

## 1. Accounts you need

| Service | Why | Where |
|---|---|---|
| Vercel | Hosts the Next.js app | vercel.com, sign in with GitHub |
| Supabase | Live config and content (already created: project `taoholder`, ref `qewsbecatbyguphoekab`) | supabase.com/dashboard |
| Taostats API | Backup source, plus 7d/30d change, price charts and history (live data comes free from the chain) | dash.taostats.io → API keys |
| Domain registrar | Point `taoholder.com` at Vercel | wherever the domain was bought |
| RPC (optional) | More reliable wallet submits than the public endpoint | OnFinality, Dwellir, or your own Subtensor node |

## 2. Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Production value | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_CHAIN` | `mainnet` (use `local` for a demo site) | — |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://qewsbecatbyguphoekab.supabase.co` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the **publishable** key (`sb_publishable_…`) | Supabase → Project Settings → API Keys |
| `TAOSTATS_API_KEY` | your key | dash.taostats.io |
| `NEXT_PUBLIC_RPC_WS_URL` | only if you don't set it in `data_sources` (row `finney-ws`) | public: `wss://entrypoint-finney.opentensor.ai:443` |

Never put the Supabase **service role** key or the DB password in Vercel. Only `pnpm db:seed` on your machine uses `SUPABASE_DB_URL`.

## 3. Data to fill in (Supabase → Table Editor)

| Table | What | Source |
|---|---|---|
| `validators` | Real validator hotkeys: a shared chain (`scope = all`, rank 0 primary, rank 1 backup) and optional per-subnet rows | taostats.io/validators: pick validators registered on all the subnets you list; copy the hotkey (SS58) and take % |
| `app_config` → `validator-policy` | `maxTake` (default 18%) | your policy |
| `subnets` | Real job, product, company comparison, stage, risks, wins, links, revenue | Subnet websites and docs, taostats.io/subnets |
| `app_config` → `buckets` | Which subnets are in Core, Top 10 and the other filters | your choice |
| `data_sources` | Check the Taostats `poolsPath` and `fields` against the live API; optionally add `permitsPath` | Taostats API docs |
| `copy_strings` | Any wording changes | — |

## 4. Launch steps

1. Deploy on Vercel with `NEXT_PUBLIC_CHAIN=local` first, and check that `/api/config` shows `origin: supabase`.
2. Set `NEXT_PUBLIC_CHAIN=mainnet` and `TAOSTATS_API_KEY`, then redeploy.
3. Check live data: `/api/pools?netuids=64` should match taostats.io, and `/api/positions?coldkey=<your address>` should match your wallet.
4. Work through `docs/adr/001-chain-calls.md`, then make a small real trade (Stake + 2 subnets, about 1 TAO) and a small sale.
5. Add `taoholder.com` under Vercel → Domains and update DNS.
6. Replace the legal pages (`src/content-static/legal.ts`).
