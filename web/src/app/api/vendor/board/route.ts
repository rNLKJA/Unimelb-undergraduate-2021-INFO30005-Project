import { NextResponse } from "next/server";
import { currentVan } from "@/server/auth";
import { vendorBoard } from "@/server/orders";

/** The vendor's live order board (polled every few seconds). */
export async function GET() {
  const van = await currentVan();
  if (!van) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const board = await vendorBoard(van.vanId);
  return NextResponse.json({ ...board, van }, { headers: { "Cache-Control": "no-store" } });
}
