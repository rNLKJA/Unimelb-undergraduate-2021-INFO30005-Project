"use client";

import { MapPinned, MessagesSquare, ReceiptText, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const CUSTOMER_TABS = [
  {
    href: "/customer",
    label: "Vans",
    icon: MapPinned,
    match: (p: string) => p === "/customer" || p.startsWith("/customer/van"),
  },
  {
    href: "/customer/orders",
    label: "Orders",
    icon: ReceiptText,
    match: (p: string) => p.startsWith("/customer/orders"),
  },
  {
    href: "/customer/community",
    label: "Community",
    icon: MessagesSquare,
    match: (p: string) => p.startsWith("/customer/community"),
  },
  {
    href: "/customer/profile",
    label: "Profile",
    icon: UserRound,
    match: (p: string) => p.startsWith("/customer/profile"),
  },
] as const;

export function CustomerTopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Customer" className="hidden items-center gap-1 md:flex">
      {CUSTOMER_TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
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

export function CustomerBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Customer"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {CUSTOMER_TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2.5 text-[0.7rem] font-semibold transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <tab.icon className={cn("size-5", active && "fill-primary/15")} aria-hidden />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
