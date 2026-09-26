// Domain types (PRD 16.2). Amounts that move money are bigint rao.
export type Rao = bigint;

export type Layer = "compute" | "inference" | "data" | "other";
export type Network = "mainnet" | "testnet" | "local";

export type SubnetLive = {
  netuid: number;
  priceTao: number;
  taoReserve: Rao;
  alphaReserve: Rao;
  weights: { tao: number; alpha: number };
  feeRate: number;
  emissionShare: number;
  emissionOn: boolean;
  mcapTao: number;
  change7d: number;
  change30d: number;
};

export type SubnetCurated = {
  netuid: number;
  name: string;
  layer: Layer;
  job: string;
  twin?: string | null;
  stage?: "shipping" | "early" | "research" | null;
  revenueUsd?: number | null;
  revenueDate?: string | null;
  product?: string | null;
  risks: string[];
  wins: string[];
  team: string[];
  links: Partial<Record<"site" | "x" | "docs" | "github" | "taostats", string>>;
  curatedAt: string;
};

export type Subnet = SubnetCurated & { live?: SubnetLive };

export type Position = {
  netuid: number;
  hotkey: string;
  alpha: Rao;
  valueTao: Rao;
  change7d: number;
};

export type Positions = {
  free: Rao;
  root: Rao;
  rootHotkey?: string;
  rootChange7d: number;
  positions: Position[];
  totalTao: Rao;
  change7d: number;
  asOf: string;
};

export type LegKind = "stakeRoot" | "invest" | "sell" | "unstakeRoot";
export type ImpactLevel = "low" | "medium" | "high";

export type Leg = {
  kind: LegKind;
  netuid: number;
  hotkey: string;
  validatorName: string;
  takePct: number;
  amountIn: Rao; // rao for stake/invest, alpha units (1e9) for sell
  estOut: Rao; // alpha for invest, rao for sell/stake
  estValueTao: Rao; // value received, in TAO rao
  slip: number;
  poolShare: number;
  impact: ImpactLevel;
  limitPrice: Rao; // rao per 1 alpha
};

export type Skip = { netuid: number; reason: SkipReason };
export type SkipReason = "emissionOff" | "thinPool" | "noValidator" | "tooSmall";

export type Quote = {
  id: string;
  side: "add" | "sell";
  legs: Leg[];
  skipped: Skip[];
  feeEstimate: Rao;
  createdAt: number;
  expiresAt: number;
};

export type HistoryItem = {
  id: string;
  action: "invest" | "sell" | "stake";
  label: string;
  legs: number;
  time: string;
  taoIn: number;
  taoOut: number;
  status: "done" | "cancelled" | "failed" | "pending";
  hash?: string;
};
