export interface TokenInfo {
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  totalSupply: bigint | null;
  totalClaimed: bigint | null;
  claimedPercent: number | null;
}
