import { createPublicClient, http, defineChain, type PublicClient, type Abi, type AbiFunction } from "viem";
import { mainnet, base, arbitrum, polygon, bsc, avalanche, optimism } from "viem/chains";

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

export interface ChainConfig {
  id: number;
  name: string;
  chain: Parameters<typeof createPublicClient>[0]["chain"];
}

export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  1:     { id: 1,     name: "Ethereum",  chain: mainnet },
  8453:  { id: 8453,  name: "Base",      chain: base },
  42161: { id: 42161, name: "Arbitrum",  chain: arbitrum },
  137:   { id: 137,   name: "Polygon",   chain: polygon },
  56:    { id: 56,    name: "BSC",       chain: bsc },
  43114: { id: 43114, name: "Avalanche", chain: avalanche },
  10:    { id: 10,    name: "Optimism",  chain: optimism },
  1329:  { id: 1329,  name: "Sei",       chain: sei },
};

const clientCache = new Map<number, PublicClient>();

export function getPublicClient(chainId: number): PublicClient {
  const cached = clientCache.get(chainId);
  if (cached) return cached;

  const config = SUPPORTED_CHAINS[chainId];
  if (!config) throw new Error(`Unsupported chain: ${chainId}`);

  const client = createPublicClient({
    chain: config.chain,
    transport: http(),
  });

  clientCache.set(chainId, client as PublicClient);
  return client as PublicClient;
}

/**
 * Build the explorer API URL for fetching a contract ABI.
 * - Sei uses SeiTrace (keyless, V1-style)
 * - All other chains use Etherscan V2 unified endpoint (requires ETHERSCAN_API_KEY)
 */
export function getExplorerApiUrl(chainId: number, address: string): string {
  const config = SUPPORTED_CHAINS[chainId];
  if (!config) throw new Error(`Unsupported chain: ${chainId}`);

  // Sei — SeiTrace still works keyless on its own endpoint
  if (chainId === 1329) {
    return `https://seitrace.com/pacific-1/api?module=contract&action=getabi&address=${address}`;
  }

  // All other chains — Etherscan V2 unified endpoint
  const apiKey = process.env.ETHERSCAN_API_KEY ?? "";
  return `https://api.etherscan.io/v2/api?chainid=${chainId}&module=contract&action=getabi&address=${address}&apikey=${apiKey}`;
}

export async function fetchAbiFromExplorer(address: string, chainId: number = 1329): Promise<AbiFunction[]> {
  const chainName = SUPPORTED_CHAINS[chainId]?.name ?? "Unknown";

  // Check if a contract exists at this address on the target chain
  const client = getPublicClient(chainId);
  const code = await client.getCode({ address: address as `0x${string}` });
  if (!code || code === "0x") {
    throw new Error(`No contract found at this address on ${chainName}. Make sure you selected the correct chain.`);
  }

  const url = getExplorerApiUrl(chainId, address);
  const res = await fetch(url);
  const json = await res.json();

  if (json.status !== "1" || !json.result) {
    if (chainId !== 1329 && !process.env.ETHERSCAN_API_KEY) {
      throw new Error(`ETHERSCAN_API_KEY is not set. Get a free key at etherscan.io/apis and add it to .env.local`);
    }
    throw new Error(json.message || `ABI not found — the contract exists on ${chainName} but is not verified.`);
  }

  const abi: Abi = JSON.parse(json.result);

  return abi.filter(
    (item): item is AbiFunction =>
      item.type === "function" &&
      (item.stateMutability === "view" || item.stateMutability === "pure"),
  );
}
