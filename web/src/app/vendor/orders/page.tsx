import type { Metadata } from "next";
import { OrderBoard } from "@/components/vendor/order-board";
import { requireVan } from "@/server/auth";
import { vendorBoard } from "@/server/orders";

export const metadata: Metadata = { title: "Vendor · Order board" };

export default async function VendorOrdersPage() {
  const van = await requireVan();
  const board = await vendorBoard(van.vanId);
  return (
    <div className="mx-auto max-w-[1400px] px-3 py-5 sm:px-5">
      <OrderBoard initial={{ ...board, van }} />
    </div>
  );
}
