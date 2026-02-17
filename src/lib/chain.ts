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

/**
 * Common ABI templates to try when a contract is not verified.
 * Each template is a set of view/pure functions for a known contract pattern.
 */
const FALLBACK_TEMPLATES: { name: string; abi: AbiFunction[] }[] = [
  {
    name: "ERC20",
    abi: [
      { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
      { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
      { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8" }] },
      { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
      { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
      { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
    ],
  },
  {
    name: "Merkle Distributor",
    abi: [
      { type: "function", name: "token", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
      { type: "function", name: "rewardToken", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
      { type: "function", name: "claimToken", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
      { type: "function", name: "distributionToken", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
      { type: "function", name: "merkleRoot", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "bytes32" }] },
      { type: "function", name: "isClaimed", stateMutability: "view", inputs: [{ name: "index", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
    ],
  },
  {
    name: "Airdrop / Vesting",
    abi: [
      { type: "function", name: "totalClaimed", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
      { type: "function", name: "totalDistributed", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
      { type: "function", name: "totalReleased", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
      { type: "function", name: "totalVested", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
      { type: "function", name: "claimed", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
      { type: "function", name: "token", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
      { type: "function", name: "rewardToken", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
      { type: "function", name: "claimToken", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
      { type: "function", name: "distributionToken", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
      { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
      { type: "function", name: "paused", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "bool" }] },
    ],
  },
  {
    name: "Ownable / Access",
    abi: [
      { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
      { type: "function", name: "pendingOwner", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
    ],
  },
];

/**
 * Try calling each function from our fallback templates against the contract.
 * Returns only the functions that actually respond (don't revert).
 */
async function probeWithFallbackAbis(
  address: string,
  chainId: number,
): Promise<AbiFunction[]> {
  const client = getPublicClient(chainId);
  const addr = address as `0x${string}`;

  // Collect all unique functions across templates
  const allFns = new Map<string, AbiFunction>();
  for (const template of FALLBACK_TEMPLATES) {
    for (const fn of template.abi) {
      if (!allFns.has(fn.name)) {
        allFns.set(fn.name, fn);
      }
    }
  }

  // Probe no-input functions in parallel to see which ones respond
  const noInputFns = [...allFns.values()].filter((fn) => fn.inputs.length === 0);
  const results = await Promise.allSettled(
    noInputFns.map((fn) =>
      client.readContract({
        address: addr,
        abi: [fn],
        functionName: fn.name,
      }),
    ),
  );

  const workingFns: AbiFunction[] = [];
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "fulfilled") {
      workingFns.push(noInputFns[i]);
    }
  }

  // If any no-input function from a template works, include that template's input functions too
  const matchedTemplates = new Set<string>();
  for (const fn of workingFns) {
    for (const template of FALLBACK_TEMPLATES) {
      if (template.abi.some((t) => t.name === fn.name)) {
        matchedTemplates.add(template.name);
      }
    }
  }

  for (const template of FALLBACK_TEMPLATES) {
    if (matchedTemplates.has(template.name)) {
      for (const fn of template.abi) {
        if (fn.inputs.length > 0 && !workingFns.some((w) => w.name === fn.name)) {
          workingFns.push(fn);
        }
      }
    }
  }

  return workingFns;
}

// EIP-1967 implementation storage slot
const EIP1967_IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as const;

/**
 * Check if a contract is an EIP-1967 proxy and try to fetch the implementation's ABI.
 */
async function tryProxyImplementationAbi(
  address: string,
  chainId: number,
): Promise<AbiFunction[] | null> {
  try {
    const client = getPublicClient(chainId);
    const slot = await client.getStorageAt({
      address: address as `0x${string}`,
      slot: EIP1967_IMPL_SLOT,
    });

    if (!slot || slot === "0x" || slot === "0x0000000000000000000000000000000000000000000000000000000000000000") {
      return null;
    }

    // Extract address from the 32-byte slot value (last 20 bytes)
    const implAddress = ("0x" + slot.slice(26)) as `0x${string}`;

    // Verify implementation has code
    const implCode = await client.getCode({ address: implAddress });
    if (!implCode || implCode === "0x") return null;

    // Try fetching the implementation's ABI from explorer(s)
    const urlsToTry = [getExplorerApiUrl(chainId, implAddress)];

    // Sei: SeiTrace may not have it but Etherscan V2 might
    if (chainId === 1329 && process.env.ETHERSCAN_API_KEY) {
      urlsToTry.push(
        `https://api.etherscan.io/v2/api?chainid=1329&module=contract&action=getabi&address=${implAddress}&apikey=${process.env.ETHERSCAN_API_KEY}`
      );
    }

    for (const url of urlsToTry) {
      try {
        const res = await fetch(url);
        const json = await res.json();
        if (json.status === "1" && json.result) {
          const abi: Abi = JSON.parse(json.result);
          return abi.filter(
            (item): item is AbiFunction =>
              item.type === "function" &&
              (item.stateMutability === "view" || item.stateMutability === "pure"),
          );
        }
      } catch {
        // Try next URL
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function fetchAbiFromExplorer(address: string, chainId: number = 1329): Promise<AbiFunction[]> {
  const chainName = SUPPORTED_CHAINS[chainId]?.name ?? "Unknown";

  // Check if a contract exists at this address on the target chain
  const client = getPublicClient(chainId);
  const code = await client.getCode({ address: address as `0x${string}` });
  if (!code || code === "0x") {
    throw new Error(`No contract found at this address on ${chainName}. Make sure you selected the correct chain.`);
  }

  // Try fetching verified ABI — for Sei, try both SeiTrace and Etherscan V2
  const abiUrls = [getExplorerApiUrl(chainId, address)];
  if (chainId === 1329 && process.env.ETHERSCAN_API_KEY) {
    abiUrls.push(
      `https://api.etherscan.io/v2/api?chainid=1329&module=contract&action=getabi&address=${address}&apikey=${process.env.ETHERSCAN_API_KEY}`
    );
  }

  for (const url of abiUrls) {
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (json.status === "1" && json.result) {
        const abi: Abi = JSON.parse(json.result);
        const viewFns = abi.filter(
          (item): item is AbiFunction =>
            item.type === "function" &&
            (item.stateMutability === "view" || item.stateMutability === "pure"),
        );
        // If we got view functions, return them. If 0 view functions it's likely
        // a proxy stub ABI — fall through to proxy detection.
        if (viewFns.length > 0) {
          return viewFns;
        }
      }
    } catch {
      // Try next URL
    }
  }

  // No view functions found — check if it's a proxy and try the implementation ABI
  const implAbi = await tryProxyImplementationAbi(address, chainId);
  if (implAbi && implAbi.length > 0) {
    return implAbi;
  }

  // Still nothing — try fallback ABI probing
  const probed = await probeWithFallbackAbis(address, chainId);
  if (probed.length > 0) {
    return probed;
  }

  // Nothing worked
  if (chainId !== 1329 && !process.env.ETHERSCAN_API_KEY) {
    throw new Error(`ETHERSCAN_API_KEY is not set. Get a free key at etherscan.io/apis and add it to .env.local`);
  }
  throw new Error(`ABI not found — the contract exists on ${chainName} but is not verified. Fallback probing found no known functions.`);
}
