"use client";

import { BarChart3, Bot, Database, FlaskConical } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/records", label: "Records", icon: Database },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/experiments", label: "Experiments", icon: FlaskConical },
  { href: "/admin/ai-log", label: "AI log", icon: Bot },
] as const;

export function AdminNav({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Admin"
      className={cn("flex flex-wrap items-center gap-1 md:flex-nowrap", className)}
    >
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <tab.icon className="size-4" aria-hidden />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
