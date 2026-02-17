import { NextRequest, NextResponse } from "next/server";
import { getPublicClient } from "@/lib/chain";
import { decodeAbiParameters, keccak256, toBytes, type Address } from "viem";

// Claimed event topic variants
const CLAIMED_TOPICS = [
  // Claimed(uint256 index, address account, uint256 amount)
  keccak256(toBytes("Claimed(uint256,address,uint256)")),
  // Claimed(address account, uint256 amount)
  keccak256(toBytes("Claimed(address,uint256)")),
  // TokensClaimed(address indexed claimant, uint256 amount)
  keccak256(toBytes("TokensClaimed(address,uint256)")),
];

// How to decode the data field for each topic variant
const DECODERS: Record<string, { params: readonly { name: string; type: string }[]; amountIndex: number }> = {
  [CLAIMED_TOPICS[0]]: {
    params: [
      { name: "index", type: "uint256" },
      { name: "account", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    amountIndex: 2,
  },
  [CLAIMED_TOPICS[1]]: {
    params: [
      { name: "account", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    amountIndex: 1,
  },
  [CLAIMED_TOPICS[2]]: {
    // claimant is indexed (in topics[1]), amount is in data
    params: [{ name: "amount", type: "uint256" }],
    amountIndex: 0,
  },
};

const ERC20_ABI = [
  {
    type: "function" as const,
    name: "balanceOf",
    stateMutability: "view" as const,
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function" as const,
    name: "decimals",
    stateMutability: "view" as const,
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function" as const,
    name: "symbol",
    stateMutability: "view" as const,
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function" as const,
    name: "name",
    stateMutability: "view" as const,
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

const TOKEN_GETTER_ABI = [
  {
    type: "function" as const,
    name: "token",
    stateMutability: "view" as const,
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

interface EtherscanLog {
  data: string;
  topics: string[];
  blockNumber: string;
}

/**
 * Fetch all matching event logs using Etherscan V2 API with pagination.
 * Returns null if no matching events found for any topic.
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchLogsViaEtherscan(
  chainId: number,
  address: string,
  topic0: string,
): Promise<EtherscanLog[] | null> {
  const apiKey = process.env.ETHERSCAN_API_KEY ?? "";
  const allLogs: EtherscanLog[] = [];
  let fromBlock = 0;
  let retries = 0;

  // Etherscan returns max 1000 logs per request — paginate by block number
  for (let page = 0; page < 500; page++) {
    // Respect Etherscan free tier rate limit (3 req/sec)
    if (page > 0) await sleep(350);

    const url = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=logs&action=getLogs&address=${address}&fromBlock=${fromBlock}&toBlock=latest&topic0=${topic0}&apikey=${apiKey}`;
    const res = await fetch(url);
    const json = await res.json();

    // Handle rate limiting — retry up to 3 times with backoff
    if (json.status === "0" && typeof json.result === "string" && json.result.includes("rate limit")) {
      if (retries < 3) {
        retries++;
        await sleep(1500);
        page--; // retry this page
        continue;
      }
      break;
    }
    retries = 0;

    if (json.status !== "1" || !Array.isArray(json.result) || json.result.length === 0) {
      break;
    }

    allLogs.push(...json.result);

    // If we got fewer than 1000, we have all the logs
    if (json.result.length < 1000) break;

    // Next page starts after the last block we received
    const lastBlock = parseInt(json.result[json.result.length - 1].blockNumber, 16);
    fromBlock = lastBlock + 1;
  }

  return allLogs.length > 0 ? allLogs : null;
}

/**
 * Fallback: use viem getLogs for chains without Etherscan (Sei).
 */
async function fetchLogsViaRpc(
  chainId: number,
  address: Address,
  topic0: `0x${string}`,
): Promise<EtherscanLog[] | null> {
  const client = getPublicClient(chainId);
  try {
    const filter = await client.createEventFilter({
      address,
      fromBlock: 0n,
      toBlock: "latest",
    });
    const logs = await client.getFilterLogs({ filter });
    const matched = logs.filter((l) => l.topics[0] === topic0);
    return matched.length > 0
      ? matched.map((l) => ({
          data: l.data,
          topics: l.topics as string[],
          blockNumber: "0x" + l.blockNumber.toString(16),
        }))
      : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, chain } = body as { address: string; chain?: number };

    if (!address) {
      return NextResponse.json({ error: "Missing address" }, { status: 400 });
    }

    const chainId = chain || 1329;
    const client = getPublicClient(chainId);
    const contractAddr = address as Address;
    const usesEtherscan = chainId !== 1329 && !!process.env.ETHERSCAN_API_KEY;

    // 1. Try to get the token address from the distributor
    let tokenAddress: Address | null = null;
    try {
      tokenAddress = await client.readContract({
        address: contractAddr,
        abi: TOKEN_GETTER_ABI,
        functionName: "token",
      });
    } catch {
      // Contract may not have a token() getter
    }

    // 2. Scan for Claimed events — try each topic signature
    let totalClaimed = 0n;
    let claimCount = 0;
    let matchedTopic: string | null = null;

    for (const topic0 of CLAIMED_TOPICS) {
      if (matchedTopic) break;

      const logs = usesEtherscan
        ? await fetchLogsViaEtherscan(chainId, address, topic0)
        : await fetchLogsViaRpc(chainId, contractAddr, topic0 as `0x${string}`);

      if (logs && logs.length > 0) {
        matchedTopic = topic0;
        claimCount = logs.length;
        const decoder = DECODERS[topic0];

        for (const log of logs) {
          try {
            const decoded = decodeAbiParameters(
              decoder.params as readonly { name: string; type: string }[],
              log.data as `0x${string}`,
            );
            const amount = decoded[decoder.amountIndex];
            if (typeof amount === "bigint") {
              totalClaimed += amount;
            }
          } catch {
            // Skip malformed log
          }
        }
      }
    }

    if (!matchedTopic) {
      return NextResponse.json(
        { error: "No Claimed events found on this contract" },
        { status: 404 },
      );
    }

    // 3. Get remaining balance + token info
    let remaining = 0n;
    let decimals = 18;
    let tokenSymbol: string | null = null;
    let tokenName: string | null = null;

    if (tokenAddress) {
      try {
        const [bal, dec, sym, name] = await Promise.all([
          client.readContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [contractAddr],
          }),
          client.readContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: "decimals",
          }).catch(() => 18),
          client.readContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: "symbol",
          }).catch(() => null),
          client.readContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: "name",
          }).catch(() => null),
        ]);
        remaining = bal as bigint;
        decimals = Number(dec);
        tokenSymbol = sym as string | null;
        tokenName = name as string | null;
      } catch {
        // Can't read token — we still have the claimed amount
      }
    }

    const totalAllocation = totalClaimed + remaining;
    const claimedPercent =
      totalAllocation > 0n
        ? Number((totalClaimed * 10000n) / totalAllocation) / 100
        : null;

    return NextResponse.json({
      totalClaimed: totalClaimed.toString(),
      remaining: remaining.toString(),
      totalAllocation: totalAllocation.toString(),
      claimedPercent,
      claimCount,
      decimals,
      tokenAddress,
      tokenSymbol,
      tokenName,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to scan events";
    const short = message.split("\n")[0].replace(/\s+/g, " ").slice(0, 200);
    return NextResponse.json({ error: short }, { status: 400 });
  }
}
