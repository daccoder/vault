import { NextRequest, NextResponse } from "next/server";
import { getPublicClient, SUPPORTED_CHAINS } from "@/lib/chain";
import type { AbiFunction } from "viem";

function serializeValue(val: unknown): unknown {
  if (typeof val === "bigint") return val.toString();
  if (Array.isArray(val)) return val.map(serializeValue);
  if (val !== null && typeof val === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      out[k] = serializeValue(v);
    }
    return out;
  }
  return val;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, abiFunction, args, chain } = body as {
      address: string;
      abiFunction: AbiFunction;
      args?: unknown[];
      chain?: number;
    };

    if (!address || !abiFunction) {
      return NextResponse.json({ error: "Missing address or abiFunction" }, { status: 400 });
    }

    const chainId = chain || 1329;
    const client = getPublicClient(chainId);

    const code = await client.getCode({ address: address as `0x${string}` });
    if (!code || code === "0x") {
      const chainName = SUPPORTED_CHAINS[chainId]?.name ?? "Unknown";
      return NextResponse.json(
        { error: `No contract found at this address on ${chainName}` },
        { status: 404 },
      );
    }

    const result = await client.readContract({
      address: address as `0x${string}`,
      abi: [abiFunction],
      functionName: abiFunction.name,
      args: args && args.length > 0 ? args : undefined,
    });

    return NextResponse.json({ result: serializeValue(result) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Call failed";
    const short = message.split("\n")[0].replace(/\s+/g, " ").slice(0, 200);
    return NextResponse.json({ error: short }, { status: 400 });
  }
}
