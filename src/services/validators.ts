// Validator choice per leg (D3). We decide; users cannot change it in v1.
//
// `all` is the shared chain every subnet uses (e.g. one big validator registered on every
// subnet, then a backup). `perNetuid` puts subnet-specific validators in front of that chain.
// For netuid N we try perNetuid[N] in order, then `all` in order, and take the first entry
// whose take is within maxTake and that holds a permit on N (when permit data is known).
export type ValidatorEntry = { name: string; hotkey: string; take?: number };
export type ValidatorsDoc = {
  maxTake: number;
  all: ValidatorEntry[];
  perNetuid: Record<string, ValidatorEntry[]>;
};
export type ResolvedValidator = { name: string; hotkey: string; take: number };

/** Hotkeys with a validator permit per netuid, from live data. Unknown netuid → allow. */
export type PermitLookup = (hotkey: string, netuid: number) => boolean;
export const allowAll: PermitLookup = () => true;

export function candidates(netuid: number, doc: ValidatorsDoc): ValidatorEntry[] {
  return [...(doc.perNetuid[String(netuid)] ?? []), ...doc.all];
}

export function resolveValidator(netuid: number, doc: ValidatorsDoc, permitted: PermitLookup = allowAll): ResolvedValidator | null {
  for (const c of candidates(netuid, doc)) {
    const take = c.take ?? 0;
    if (!c.hotkey || take > doc.maxTake) continue;
    if (!permitted(c.hotkey, netuid)) continue;
    return { name: c.name, hotkey: c.hotkey, take };
  }
  return null;
}

/** Build a permit lookup from pools that carry `permits` (hotkeys with a permit on that netuid). */
export function permitsFrom(pools: Map<number, { permits?: string[] }>): PermitLookup {
  return (hotkey, netuid) => {
    if (netuid === 0) return true;
    const list = pools.get(netuid)?.permits;
    return !list || list.length === 0 || list.includes(hotkey);
  };
}
