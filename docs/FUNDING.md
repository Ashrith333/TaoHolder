# Pay with another token (top up)

Users turn ETH, USDC, SOL, BTC… into native TAO in their Bittensor wallet, then use the normal
one-confirm Stake & Invest. Every route is a **funding provider** (`src/adapters/funding/`),
chosen and ordered from `content/config/funding.json` (or Supabase `app_config` key `funding`).

| Provider | Kind | Status | Custody | Sources |
|---|---|---|---|---|
| `demo` | swap-service | on (local/testnet) | — | simulated, SAMPLE rates |
| `changenow` | swap-service | on (mainnet) once `CHANGENOW_API_KEY` is set | custodial for the minutes of the swap | ~any token/chain in `assets` |
| `forevermoney` | bridge (Chainlink CCIP) | **off**: gateway ABI not verified; every call refuses | non-custodial | Base (Robinhood Chain) |
| `own-contract` | contract | placeholder | non-custodial | future |

## Turn on ChangeNOW (mainnet)
1. Create a partner account at changenow.io (affiliate/partner program) and copy the API key.
   The partner program can also pay you a commission on each swap.
2. Vercel → Environment Variables → `CHANGENOW_API_KEY` = key, type **Secret**. Redeploy.
3. Check `/api/funding/quote?asset=eth:eth&amount=0.05`: it should return `taoOut`.
4. Do one small real top-up (the minimum) and confirm TAO lands in the Bittensor wallet.

The TAO currency/network codes (`taoCurrency`, `taoNetwork`), base URL and track URL are in
the provider `config`, so a change on ChangeNOW's side is a config edit, not a deploy.

## Flow
1. Pick token + amount → `/api/funding/quote` (first enabled provider that supports the token).
2. **Get deposit address** → `/api/funding/orders` (TAO recipient = connected SS58 address).
3. User sends the exact amount, manually or with **Send from MetaMask** (EVM tokens; ERC-20s
   use `transfer`). The Bittensor wallet is never asked to sign anything here.
4. Status polls `/api/funding/orders/[id]` → waiting → confirming → swapping → sending → **TAO arrived**.
5. **Stake & Invest it** opens Trade with the received amount filled in.

## Adding a provider (own contract, direct CCIP, another swap service)
1. Write a `FundingAdapter` (`supports`, `quote`, `create`, `status`) in `src/adapters/funding/<id>.ts`.
   `create` returns steps: `send` (deposit address), `evmTx` (contract call to sign) or `wait`.
2. Register it in `src/adapters/funding/registry.ts`.
3. Add it to `funding.json` / `app_config.funding` with `enabled`, `networks`, `custodial`, `config`.

## ForeverMoney: before enabling
From Talisman's integration (TalismanSociety/talisman PR 2555): Base Gateway
`0x5EF3…0a2C`, wTAO on Base `0xf308…3d67`, Bittensor CCIP selector `2135107236357186872`;
`quoteBridgeOut` / `bridgeOut` take the SS58 as `bytes32`. To finish it:
1. Get the exact ABI (verified contract on Basescan, or from ForeverMoney).
2. Implement `quote` (DEX quote ETH/USDC → wTAO, plus `quoteBridgeOut` fee) and `create`
   (steps: approve, swap, `bridgeOut` as `evmTx`), and `status` from the CCIP message id.
3. Test with a small amount on Base, then set `enabled: true`.
