# Config guide

Everything that changes behaviour lives in data, not code. There are two copies with the same shape:

| Document | `content/` file | Supabase |
|---|---|---|
| Feature switches (D4, D12) | `config/features.json` | `app_config` key `features` |
| Guard thresholds (PRD 13) | `config/risk-guards.json` | `app_config` key `risk-guards` |
| Filter buckets (D8) | `config/buckets.json` | `app_config` key `buckets` |
| App: tabs, menu, refresh | `config/app.json` | `app_config` key `app` |
| Wallets | `config/wallets.json` | `app_config` key `wallets` |
| Error words | `copy/errors.json` | `app_config` key `errors` |
| Input sources | `config/sources.json` | `data_sources` rows |
| Page sections | `config/layout.json` | `page_sections` rows |
| Subnets (curated) | `subnets/<netuid>.json` | `subnets` rows |
| Validators (D3) | `validators.json` | `validators` rows + `app_config` key `validator-policy` |
| UI copy | `copy/en.json` | `copy_strings` rows |

**Precedence:** Supabase row (if valid) → `content/` file. An invalid row is logged and ignored, never shown. Copy strings merge: keys missing from Supabase still come from `en.json`.
Edits in the Supabase table editor go live within 60 s, with no deploy. Keep `content/` in git as the reviewed baseline, and run `pnpm db:seed` to push it.

## Change a threshold or switch

Example: raise the thin-pool limit to 2,000 TAO and hide revenue.

```sql
update app_config set value = jsonb_set(value, '{minPoolTao}', '2000') where key = 'risk-guards';
update app_config set value = value || '{"revenueOnSubnetPage": false, "revenueSplitRule": false}' where key = 'features';
```

## Input sources (APIs)

Each `data_sources` row says **which provider** feeds **which kind** of data on **which network**:

| kind | used for | providers today |
|---|---|---|
| `subnets`, `pools` | prices, reserves, emission, 30d series | `fixtures`, `taostats` |
| `positions` | free, root, subnet stake for a coldkey | `fixtures`, `taostats` |
| `history` | past extrinsics | `fixtures`, `taostats` |
| `price` | TAO in USD | `fixtures`, `coingecko`, `taostats` |
| `rpc_ws` | wallet submit (browser) | any Subtensor WS URL |
| `explorer` | tx links, `{hash}` template | any URL template |

- Rows are tried in `priority` order (low first). **If one fails, the next is used.** For example, add a `fixtures` row with priority 90 as a safety net.
- `url` is the base URL. Paths and **field names** live in `config`, so a changed API is fixed with an update, not a deploy:
  `{"apiKeyEnv": "TAOSTATS_API_KEY", "poolsPath": "/dtao/pool/latest/v1?limit=256", "fields": {"price": "price", "taoReserve": "total_tao"}, "reserveUnit": "rao"}`
- Secrets never go in the DB. `apiKeyEnv` names the env var that holds the key (`apiKeyHeader` defaults to `Authorization`).
- **New provider:** write a `ProviderFactory` in `src/adapters/sources/<name>.ts` (see `coingecko.ts`, about 15 lines), add it to `PROVIDERS` in `registry.ts`, then add a row with `provider = '<name>'`.

## Sections (replaceable parts)

Pages render the enabled `page_sections` rows for their page, ordered by `position`. `component` is a key from `src/sections/registry.tsx`:

`account.hero`, `account.total`, `account.cards`, `account.allocation`, `account.positions`, `trade.desk`, `preview.desk`, `learn.catalog`, `learn.subnetHead`, `learn.market`, `learn.business`, `learn.links`, `history.list`, `settings.panel`, `common.notice`

- **Hide:** `enabled = false`. **Reorder:** change `position`. **Show only when connected / not connected:** `props.when`.
- **Add a banner with no code:** a row with `component = 'common.notice'` and `props = {"text": "…", "kind": "red"}`.
- **Replace a section:** build a new component (e.g. `features/account/components/TotalCardV2.tsx`), register it as `account.totalV2`, then point the row's `component` at it. Roll back by pointing it back.

`pnpm content:check` fails if `layout.json` names a component that isn't registered.

## Validators

Each subnet gets an ordered chain of validators, and the first one that qualifies is used:

1. The `scope = 'netuid'` rows for that subnet, lowest `rank` first (optional).
2. Then the shared `scope = 'all'` rows, lowest `rank` first. This is the common primary plus backups that every subnet uses.

An entry is skipped when its `take` is above `validator-policy.maxTake`, or when permit data is available and that hotkey has no validator permit on the subnet. If nothing qualifies, the leg is skipped with "No validator" (G3).

- **One validator for everything:** put it in `all` at rank 0 and a second one at rank 1 as the backup. You don't need any per-subnet rows.
- **A different validator on one subnet:** add a `netuid` row for that subnet. It keeps the shared chain as its backup.

```sql
insert into validators (scope, netuid, rank, name, hotkey, take)
values ('netuid', 64, 0, 'Chutes partner', '5…', 0.09);
```

**Permit data:** add `permitsPath` to the Taostats `pools` source config (plus `permitNetuidField` / `permitHotkeyField` if the field names differ). Each pool then carries its permitted hotkeys, and the chain skips validators without a permit on that subnet. Without it, every configured validator is assumed to be allowed.
