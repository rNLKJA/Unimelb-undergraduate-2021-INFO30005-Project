import { LogOut } from "lucide-react";
import { adminLogoutAction } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/admin-nav";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { StorageNotice } from "@/components/shared/storage-notice";
import { Button } from "@/components/ui/button";
import { currentAdmin } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await currentAdmin();
  return (
    <>
      <StorageNotice />
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <Logo href={admin ? "/admin/records" : "/"} subtitle="Admin" />
            {admin ? <AdminNav className="hidden md:flex" /> : null}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {admin ? (
              <form action={adminLogoutAction}>
                <Button
                  type="submit"
                  variant="outline"
                  aria-label="Log out"
                  className="h-9 rounded-full px-3.5"
                >
                  <LogOut aria-hidden /> <span className="hidden sm:inline">Log out</span>
                </Button>
              </form>
            ) : null}
          </div>
        </div>
        {admin ? (
          <div className="border-t px-3 py-1.5 md:hidden">
            <AdminNav />
          </div>
        ) : null}
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
    </>
  );
}
