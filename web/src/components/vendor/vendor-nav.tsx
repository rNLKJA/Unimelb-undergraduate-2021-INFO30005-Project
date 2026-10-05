"use client";

import { History, LayoutDashboard, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/vendor", label: "Van", icon: LayoutDashboard, exact: true },
  { href: "/vendor/orders", label: "Orders", icon: LayoutGrid, exact: false },
  { href: "/vendor/history", label: "History", icon: History, exact: false },
] as const;

export function VendorNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Vendor" className="flex items-center gap-1 overflow-x-auto">
      {TABS.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "bg-crema-100 text-espresso-900 dark:bg-crema-200"
                : "text-crema-200/80 hover:bg-white/10 hover:text-white",
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
