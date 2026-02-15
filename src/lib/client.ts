import type { AbiFunction } from "viem";

export async function fetchAbi(address: string): Promise<AbiFunction[]> {
  const res = await fetch(`/api/abi?address=${encodeURIComponent(address)}`);
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
): Promise<unknown> {
  const res = await fetch("/api/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, abiFunction, args }),
  });

  const json = await res.json();

  if (!res.ok || json.error) {
    throw new Error(json.error || "Call failed");
  }

  return json.result;
}
