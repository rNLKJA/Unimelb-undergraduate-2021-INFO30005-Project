import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatTiles } from "@/components/vendor/stat-tiles";
import { ShiftSummaryCard } from "@/components/vendor/shift-summary";
import { VanControlPanel } from "@/components/vendor/van-control-panel";
import { requireVan } from "@/server/auth";
import { serverNow } from "@/server/clock";
import { vendorBoard } from "@/server/orders";
import { shiftMetricsFor } from "@/server/shift";

export const metadata: Metadata = { title: "Vendor · My van" };

export default async function VendorHomePage() {
  const van = await requireVan();
  const now = serverNow();
  const [board, metrics] = await Promise.all([
    vendorBoard(van.vanId, now),
    shiftMetricsFor(van.vanId, now),
  ]);
  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-3 py-5 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Today at
          </p>
          <h1 className="text-3xl font-semibold">{van.vanId}</h1>
        </div>
        <Button asChild className="h-10 rounded-xl">
          <Link href="/vendor/orders">
            Order board · {board.outstanding.length + board.fulfilled.length} active{" "}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
      <StatTiles stats={board.stats} />
      <ShiftSummaryCard metrics={metrics} />
      <VanControlPanel key={van.vanId} van={van} />
    </div>
  );
}
