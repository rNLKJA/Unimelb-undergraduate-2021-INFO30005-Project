import { LogOut } from "lucide-react";
import Link from "next/link";
import { vendorLogoutAction } from "@/app/vendor/actions";
import { VanMark } from "@/components/brand/van-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { StorageNotice } from "@/components/shared/storage-notice";
import { VendorNav } from "@/components/vendor/vendor-nav";
import { currentVan } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function VendorLayout({ children }: LayoutProps<"/vendor">) {
  const van = await currentVan();
  return (
    <>
      <StorageNotice />
      <header className="sticky top-0 z-40 bg-espresso-900 text-crema-100 shadow-md dark:bg-espresso-950">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-3 sm:px-5">
          <Link
            href={van ? "/vendor/orders" : "/vendor/login"}
            className="flex items-center gap-2 rounded-lg pr-2"
            aria-label="Vendor board home"
          >
            <VanMark className="h-7 w-auto" />
            <span className="hidden flex-col leading-none sm:flex">
              <span className="font-display text-base font-semibold">Snacks in a Van</span>
              <span className="text-[0.62rem] font-semibold tracking-[0.16em] text-crema-300/80 uppercase">
                Vendor
              </span>
            </span>
          </Link>
          {van ? (
            <>
              <span className="hidden h-6 w-px bg-white/15 sm:block" aria-hidden />
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <span className="hidden truncate font-semibold sm:inline">{van.vanId}</span>
                <span
                  className={
                    van.open
                      ? "inline-flex items-center gap-1 rounded-full bg-matcha-500/25 px-2 py-0.5 text-xs font-semibold text-matcha-300"
                      : "inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-crema-300"
                  }
                >
                  <span
                    className={
                      van.open
                        ? "size-1.5 rounded-full bg-matcha-400"
                        : "size-1.5 rounded-full bg-crema-300"
                    }
                  />
                  {van.open ? "Open" : "Closed"}
                </span>
              </span>
              <div className="ml-4 hidden md:block">
                <VendorNav />
              </div>
            </>
          ) : null}
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle className="text-crema-100 hover:bg-white/10 hover:text-white" />
            {van ? (
              <form action={vendorLogoutAction}>
                <button
                  type="submit"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-crema-200 hover:bg-white/10 hover:text-white"
                >
                  <LogOut className="size-4" aria-hidden />
                  <span className="hidden sm:inline">Log out</span>
                </button>
              </form>
            ) : (
              <Link
                href="/"
                className="rounded-lg px-2.5 py-1.5 text-sm text-crema-200 hover:bg-white/10"
              >
                Home
              </Link>
            )}
          </div>
        </div>
        {van ? (
          <div className="border-t border-white/10 px-3 py-1.5 md:hidden">
            <VendorNav />
          </div>
        ) : null}
      </header>
      <main id="main" className="flex-1 bg-muted/40">
        {children}
      </main>
    </>
  );
}
