// Validator choice per leg (D3). We decide; users cannot change it in v1.
export type ValidatorEntry = { name: string; hotkey: string; maxTake?: number; take?: number };
export type ValidatorsDoc = {
  default: ValidatorEntry;
  perNetuid: Record<string, ValidatorEntry>;
  fallback: ValidatorEntry;
};
export type ResolvedValidator = { name: string; hotkey: string; take: number };

/**
 * Default for the netuid (or the global default), then fallback.
 * `permitted` lets callers plug in a live permit check; take above maxTake disqualifies.
 */
export function resolveValidator(
  netuid: number,
  doc: ValidatorsDoc,
  permitted: (hotkey: string, netuid: number) => boolean = () => true,
): ResolvedValidator | null {
  const maxTake = doc.default.maxTake ?? 1;
  const candidates = [doc.perNetuid[String(netuid)] ?? doc.default, doc.fallback];
  for (const c of candidates) {
    const take = c.take ?? 0;
    if (!c.hotkey || take > (c.maxTake ?? maxTake)) continue;
    if (!permitted(c.hotkey, netuid)) continue;
    return { name: c.name, hotkey: c.hotkey, take };
  }
  return null;
}
