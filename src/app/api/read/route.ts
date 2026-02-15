import { NextRequest, NextResponse } from "next/server";
import { publicClient } from "@/lib/chain";
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
    const { address, abiFunction, args } = body as {
      address: string;
      abiFunction: AbiFunction;
      args?: unknown[];
    };

    if (!address || !abiFunction) {
      return NextResponse.json({ error: "Missing address or abiFunction" }, { status: 400 });
    }

    const result = await publicClient.readContract({
      address: address as `0x${string}`,
      abi: [abiFunction],
      functionName: abiFunction.name,
      args: args && args.length > 0 ? args : undefined,
    });

    return NextResponse.json({ result: serializeValue(result) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Call failed";
    // Extract just the useful part of viem's verbose errors
    const short = message.split("\n")[0].replace(/\s+/g, " ").slice(0, 200);
    return NextResponse.json({ error: short }, { status: 400 });
  }
}
