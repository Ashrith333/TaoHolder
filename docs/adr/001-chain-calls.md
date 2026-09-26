# ADR 001: Chain calls (T0), status: to verify on testnet

Calls are built as plain descriptors in `src/services/buildBatch.ts` and mapped onto
`api.tx` in `src/adapters/chain/submit.ts`, which checks each call's argument count against
live runtime metadata and refuses to submit on a mismatch.

| Leg | Call | Args (in order) |
|---|---|---|
| Stake TAO (root) | `subtensorModule.addStake` | hotkey, netuid 0, amount_staked (rao) |
| Invest | `subtensorModule.addStakeLimit` | hotkey, netuid, amount_staked (rao), limit_price (rao per 1 alpha), allow_partial = false |
| Sell | `subtensorModule.removeStakeLimit` | hotkey, netuid, amount_unstaked (alpha units), limit_price, allow_partial = false |
| Unstake root | `subtensorModule.removeStake` | hotkey, netuid 0, amount_unstaked |
| Many legs | `utility.batchAll` | all legs or none (D1) |

## Still to confirm before mainnet
- [ ] Exact arg names/order: `api.tx.subtensorModule.addStakeLimit.meta.args`
- [ ] `limit_price` units (assumed rao per 1e9 alpha units, see `services/quote.ts`)
- [ ] Current swap fee per subnet (fixtures assume 0.05%)
- [ ] Minimum stake and per-block staking rate limit per (coldkey, hotkey, netuid)
- [ ] Module error names for price-limit failures (`PRICE_LIMIT_ERRORS` in `services/txMachine.ts`, plain words in `content/copy/errors.json`)
- [ ] TAO.com wallet `injectedWeb3` key (assumed `bittensor` in `wallets.json`)
- [ ] Taostats endpoint paths and field names (all editable in `data_sources.config`, no deploy needed)
