import type { AbiFunction } from "viem";

export async function fetchAbi(address: string, chainId: number = 1329): Promise<AbiFunction[]> {
  const res = await fetch(`/api/abi?address=${encodeURIComponent(address)}&chain=${chainId}`);
  const json = await res.json();

  if (!res.ok || json.error) {
    throw new Error(json.error || "Failed to fetch ABI");
  }

  return json.functions as AbiFunction[];
}

export async function readContract(
  address: string,
  abiFunction: AbiFunction,
  args?: unknown[],
  chainId: number = 1329,
): Promise<unknown> {
  const res = await fetch("/api/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, abiFunction, args, chain: chainId }),
  });

  const json = await res.json();

  if (!res.ok || json.error) {
    throw new Error(json.error || "Call failed");
  }

  return json.result;
}

export interface MerkleStats {
  totalClaimed: string;
  remaining: string;
  totalAllocation: string;
  claimedPercent: number | null;
  claimCount: number;
  decimals: number;
  tokenAddress: string | null;
  tokenSymbol: string | null;
  tokenName: string | null;
}

export async function fetchMerkleStats(
  address: string,
  chainId: number = 1329,
): Promise<MerkleStats> {
  const res = await fetch("/api/merkle-stats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, chain: chainId }),
  });

  const json = await res.json();

  if (!res.ok || json.error) {
    throw new Error(json.error || "Failed to fetch merkle stats");
  }

  return json as MerkleStats;
}
