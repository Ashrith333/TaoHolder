import { describe, expect, it, vi } from "vitest";
import { buildBundle } from "@/adapters/content/load";

// Supabase rows (as returned by remote.ts) override content/ JSON per document;
// invalid rows are ignored and the local document is used instead.
describe("config bundle", () => {
  it("uses local JSON when Supabase is not configured", () => {
    const b = buildBundle(null);
    expect(Object.values(b.origin).every((o) => o === "local")).toBe(true);
    expect(b.sections.find((s) => s.page === "trade")?.component).toBe("trade.desk");
    expect(b.sources.every((s) => s.network === b.network)).toBe(true);
  });

  it("applies valid remote documents and ignores invalid ones", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const local = buildBundle(null);
    const b = buildBundle({
      configs: {
        "risk-guards": { ...local.guards, minPoolTao: 5000 },
        features: { defaultTheme: "purple" }, // invalid → local
      },
      sections: [{ id: "x", page: "account", component: "common.notice", position: 1, enabled: true, props: { text: "hi" }, updated_at: "now" }],
      copy: { "hero.title": "Remote title" },
    });
    expect(b.guards.minPoolTao).toBe(5000);
    expect(b.origin["risk-guards"]).toBe("supabase");
    expect(b.origin.features).toBe("local");
    expect(b.sections).toHaveLength(1);
    expect(b.copy["hero.title"]).toBe("Remote title");
    expect(b.copy["nav.trade"]).toBe("Trade"); // local keys still present
    err.mockRestore();
  });
});

import { validatorsDoc } from "@/adapters/content/remote";
import { validatorsSchema } from "@/adapters/content/schemas";
describe("validators from Supabase rows", () => {
  it("builds the shared chain and per-subnet lists in rank order", () => {
    const row = (scope: string, netuid: number | null, rank: number, name: string) => ({ scope, netuid, rank, name, hotkey: `5${name}`, take: 0.09, enabled: true });
    const doc = validatorsSchema.parse(
      validatorsDoc([row("all", null, 1, "B"), row("all", null, 0, "A"), row("netuid", 64, 0, "X"), { ...row("all", null, 2, "Off"), enabled: false }], 0.18),
    );
    expect(doc.all.map((v) => v.name)).toEqual(["A", "B"]);
    expect(doc.perNetuid["64"]?.map((v) => v.name)).toEqual(["X"]);
    expect(doc.maxTake).toBe(0.18);
  });
});
