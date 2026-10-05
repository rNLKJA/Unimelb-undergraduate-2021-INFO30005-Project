import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { GithubMark } from "@/components/brand/github-mark";
import { REPO_URL } from "@/lib/site";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";

export const SITE_NAV = [
  { href: "/customer", label: "Order coffee" },
  { href: "/vendor", label: "Vendor board" },
  { href: "/admin/records", label: "Records" },
  { href: "/methods", label: "Methods" },
  { href: "/#about", label: "About" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {SITE_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:inline-flex"
            aria-label="Source code on GitHub (opens in a new tab)"
          >
            <GithubMark className="size-[1.1rem]" />
          </a>
          <ThemeToggle />
          <MobileNav items={SITE_NAV} />
        </div>
      </div>
    </header>
  );
}
