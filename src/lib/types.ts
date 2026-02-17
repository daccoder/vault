export interface TokenInfo {
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  totalSupply: bigint | null;
  totalClaimed: bigint | null;
  claimedPercent: number | null;
  claimCount: number | null;
  source: "view" | "events" | null;
}

export interface ChainOption {
  id: number;
  name: string;
}

export const CHAIN_OPTIONS: ChainOption[] = [
  { id: 1329, name: "Sei" },
  { id: 1, name: "Ethereum" },
  { id: 8453, name: "Base" },
  { id: 42161, name: "Arbitrum" },
  { id: 137, name: "Polygon" },
  { id: 56, name: "BSC" },
  { id: 43114, name: "Avalanche" },
  { id: 10, name: "Optimism" },
];
