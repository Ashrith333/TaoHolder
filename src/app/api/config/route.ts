import { json, route } from "@/server/respond";
import { loadConfig, toClientConfig } from "@/adapters/content/load";

// Public config bundle (no secrets). Handy for checking what Supabase is serving.
export const GET = route(async () => json(toClientConfig(await loadConfig()), 60));
