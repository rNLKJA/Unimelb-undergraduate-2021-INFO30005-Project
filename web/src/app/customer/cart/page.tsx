import type { Metadata } from "next";
import { CartView } from "@/components/customer/cart-view";
import { currentCustomer } from "@/server/auth";
import { listMenu } from "@/server/menu";

export const metadata: Metadata = { title: "Your cart" };

export default async function CartPage() {
  const [customer, menu] = await Promise.all([currentCustomer(), listMenu()]);
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-3xl font-semibold">Your cart</h1>
      <CartView menu={menu} signedIn={!!customer} />
    </div>
  );
}
