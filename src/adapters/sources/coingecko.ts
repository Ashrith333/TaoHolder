import "server-only";
import { field, getJson } from "./http";
import type { ProviderFactory } from "./types";

// Public price endpoint, no key. `config.path` can point at another JSON field.
export const coingecko: ProviderFactory = {
  price: (src) => ({
    usd: async () => {
      const json = await getJson(src, src.url ?? "https://api.coingecko.com/api/v3/simple/price?ids=bittensor&vs_currencies=usd", 60);
      return field(json, typeof src.config.path === "string" ? src.config.path : "bittensor.usd") || null;
    },
  }),
};
