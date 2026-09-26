import { z } from "zod";

// Zod schemas for every config document. Bad data fails loudly (PRD 15.1).
export const featuresSchema = z.object({
  revenueOnSubnetPage: z.boolean(),
  revenueSplitRule: z.boolean(),
  revenueMinRows: z.number().int().min(1),
  usdToggle: z.boolean(),
  validatorChoice: z.boolean(),
  mevShield: z.boolean(),
  defaultTheme: z.enum(["dark", "light", "auto"]),
  themes: z.array(z.enum(["dark", "light", "auto"])).min(1),
  defaultStakePct: z.number().min(0).max(100),
  defaultModes: z.array(z.enum(["stake", "invest"])).min(1),
  demoWallet: z.boolean(),
  splitRules: z.array(z.enum(["equal", "mcap", "emitted", "revenue", "custom"])).min(1),
});

export const guardsSchema = z.object({
  feeBufferTao: z.number().min(0),
  minLegTao: z.number().min(0),
  warnSlip: z.number().min(0),
  warnPoolShare: z.number().min(0),
  minPoolTao: z.number().min(0),
  quoteTtlSec: z.number().int().min(5),
  limitTolerance: z.number().min(0).max(0.5),
  sellDustTao: z.number().min(0),
  dropAfterSec: z.number().int().min(5),
  diffSlipPts: z.number().min(0),
  diffOutPct: z.number().min(0),
  impactLowBelow: z.number().min(0),
  impactHighAbove: z.number().min(0),
  maxGuardPasses: z.number().int().min(1).max(20),
  stakeStepPct: z.number().int().min(1).max(50),
});

const bucketSchema = z.union([
  z.object({ label: z.string(), type: z.literal("list"), netuids: z.array(z.number().int()) }),
  z.object({
    label: z.string(),
    type: z.literal("rule"),
    sortBy: z.enum(["emissionShare", "mcapTao", "change7d"]).optional(),
    limit: z.number().int().optional(),
    layer: z.string().optional(),
    layerNot: z.array(z.string()).optional(),
  }),
]);

export const bucketsSchema = z.object({
  reviewedAt: z.string(),
  buckets: z.record(z.string(), bucketSchema),
  order: z.array(z.string()),
  learnOrder: z.array(z.string()),
  exclude: z.array(z.number().int()),
});

export const appSchema = z.object({
  name: z.string(),
  domain: z.string(),
  tagline: z.string(),
  network: z.enum(["mainnet", "testnet", "local"]),
  refreshMs: z.number().int().min(5000),
  historyPageSize: z.number().int().min(1),
  tabs: z.array(z.object({ href: z.string(), labelKey: z.string() })),
  menu: z.array(z.object({ href: z.string(), labelKey: z.string() })),
  amountBuckets: z.array(z.number()),
});

export const walletsSchema = z.object({
  wallets: z.array(
    z.object({ id: z.string(), name: z.string(), injectedKey: z.string(), installUrl: z.string().url() }),
  ),
  ss58Prefix: z.number().int(),
});

export const sourceSchema = z.object({
  id: z.string(),
  kind: z.enum(["subnets", "pools", "positions", "history", "price", "rpc_http", "rpc_ws", "explorer"]),
  provider: z.string(),
  network: z.enum(["mainnet", "testnet", "local"]),
  priority: z.number().int(),
  enabled: z.boolean(),
  url: z.string().nullish(),
  config: z.record(z.string(), z.unknown()).default({}),
});
export const sourcesSchema = z.object({ sources: z.array(sourceSchema) });

const validatorEntry = z.object({
  name: z.string(),
  hotkey: z.string().min(1),
  maxTake: z.number().optional(),
  take: z.number().min(0).max(1).optional(),
});
export const validatorsSchema = z.object({
  default: validatorEntry,
  perNetuid: z.record(z.string(), validatorEntry),
  fallback: validatorEntry,
});

export const sectionSchema = z.object({
  id: z.string(),
  page: z.string(),
  component: z.string(),
  position: z.number(),
  enabled: z.boolean(),
  props: z.record(z.string(), z.unknown()).default({}),
});
export const layoutSchema = z.object({ sections: z.array(sectionSchema) });

export const copySchema = z.record(z.string(), z.string());

export const subnetCuratedSchema = z.object({
  netuid: z.number().int().min(0),
  name: z.string().min(1),
  layer: z.enum(["compute", "inference", "data", "other"]),
  job: z.string(),
  twin: z.string().nullish(),
  stage: z.enum(["shipping", "early", "research"]).nullish(),
  revenueUsd: z.number().nullish(),
  revenueDate: z.string().nullish(),
  product: z.string().nullish(),
  risks: z.array(z.string()),
  wins: z.array(z.string()).max(3),
  team: z.array(z.string()).max(3),
  links: z.record(z.string(), z.string()),
  curatedAt: z.string(),
});

export type Features = z.infer<typeof featuresSchema>;
export type Guards = z.infer<typeof guardsSchema>;
export type Buckets = z.infer<typeof bucketsSchema>;
export type AppConfig = z.infer<typeof appSchema>;
export type WalletsConfig = z.infer<typeof walletsSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type Validators = z.infer<typeof validatorsSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type Copy = z.infer<typeof copySchema>;
