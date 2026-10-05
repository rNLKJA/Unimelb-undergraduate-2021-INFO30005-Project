import { BadgeCheck, Clock3, DollarSign, ReceiptText, Soup } from "lucide-react";
import { formatPrice } from "@/lib/pricing";
import { onTimeNote, type DayStats } from "@/lib/stats/day-stats";
import { cn } from "@/lib/utils";

export function StatTiles({ stats, className }: { stats: DayStats; className?: string }) {
  const tiles: { icon: typeof ReceiptText; label: string; value: string; note?: string }[] = [
    { icon: ReceiptText, label: "Orders today", value: String(stats.orders) },
    { icon: Soup, label: "In progress", value: String(stats.active) },
    { icon: DollarSign, label: "Sales today", value: formatPrice(stats.revenue) },
    {
      icon: Clock3,
      label: "Avg. prep",
      value: stats.avgPrepMinutes != null ? `${stats.avgPrepMinutes} min` : "—",
      note: stats.served ? `n = ${stats.served} served` : undefined,
    },
    {
      icon: BadgeCheck,
      label: "On time",
      value: stats.onTimeRate != null ? `${Math.round(stats.onTimeRate * 100)}%` : "—",
      note: onTimeNote(stats),
    },
  ];
  return (
    <dl className={cn("grid grid-cols-3 gap-2 lg:grid-cols-5", className)}>
      {tiles.map((t) => (
        <div
          key={t.label}
          className="min-w-0 rounded-xl border bg-card px-3 py-2.5 shadow-sm sm:px-3.5 sm:py-3"
        >
          <dt className="flex items-center gap-1.5 truncate text-[0.7rem] font-medium text-muted-foreground sm:text-[0.72rem]">
            <t.icon className="size-3.5 shrink-0" aria-hidden />{" "}
            <span className="truncate">{t.label}</span>
          </dt>
          <dd className="tabular mt-0.5 truncate font-display text-lg font-semibold sm:text-2xl">
            {t.value}
          </dd>
          {t.note ? (
            <dd className="tabular mt-0.5 text-[0.65rem] leading-snug text-muted-foreground sm:text-[0.7rem]">
              {/* Keep "3 of 3" and "95% CI 44–100%" whole when the tile is narrow. */}
              {t.note.split(" · ").map((part, i) => (
                <span key={part}>
                  {i > 0 ? " · " : null}
                  <span className="whitespace-nowrap">{part}</span>
                </span>
              ))}
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
