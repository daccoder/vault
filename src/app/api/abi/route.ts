import { NextRequest, NextResponse } from "next/server";
import { fetchAbiFromSeiTrace } from "@/lib/chain";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  try {
    const fns = await fetchAbiFromSeiTrace(address);
    return NextResponse.json({ functions: fns });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch ABI";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
