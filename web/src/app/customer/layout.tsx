import { Logo } from "@/components/brand/logo";
import { AccountMenu } from "@/components/customer/account-menu";
import { CartButton } from "@/components/customer/cart-button";
import { CartProvider } from "@/components/customer/cart-provider";
import { CustomerBottomNav, CustomerTopNav } from "@/components/customer/customer-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { StorageNotice } from "@/components/shared/storage-notice";
import { currentCustomer } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function CustomerLayout({ children }: LayoutProps<"/customer">) {
  const customer = await currentCustomer();
  return (
    <CartProvider>
      <StorageNotice />
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Logo href="/customer" subtitle="Order ahead" />
          <CustomerTopNav />
          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            <CartButton />
            <AccountMenu
              customer={
                customer
                  ? {
                      firstName: customer.firstName,
                      lastName: customer.lastName,
                      customerId: customer.customerId,
                      portfolioImg: customer.portfolioImg,
                    }
                  : null
              }
            />
          </div>
        </div>
      </header>
      <main id="main" className="flex-1 pb-24 md:pb-10">
        {children}
      </main>
      <CustomerBottomNav />
    </CartProvider>
  );
}
