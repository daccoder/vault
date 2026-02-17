import { NextRequest, NextResponse } from "next/server";
import { fetchAbiFromExplorer } from "@/lib/chain";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  const chainId = Number(req.nextUrl.searchParams.get("chain") || "1329");

  try {
    const fns = await fetchAbiFromExplorer(address, chainId);
    return NextResponse.json({ functions: fns });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch ABI";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
