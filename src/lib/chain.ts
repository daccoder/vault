import { createPublicClient, http, type Abi, type AbiFunction } from "viem";
import { defineChain } from "viem";

export const sei = defineChain({
  id: 1329,
  name: "Sei",
  nativeCurrency: { name: "Sei", symbol: "SEI", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://evm-rpc.sei-apis.com"] },
  },
  blockExplorers: {
    default: { name: "SeiTrace", url: "https://seitrace.com" },
  },
});

export const publicClient = createPublicClient({
  chain: sei,
  transport: http(),
});

export async function fetchAbiFromSeiTrace(address: string): Promise<AbiFunction[]> {
  const url = `https://seitrace.com/pacific-1/api?module=contract&action=getabi&address=${address}`;
  const res = await fetch(url);
  const json = await res.json();

  if (json.status !== "1" || !json.result) {
    throw new Error(json.message || "ABI not found — is the contract verified on SeiTrace?");
  }

  const abi: Abi = JSON.parse(json.result);

  return abi.filter(
    (item): item is AbiFunction =>
      item.type === "function" &&
      (item.stateMutability === "view" || item.stateMutability === "pure"),
  );
}
