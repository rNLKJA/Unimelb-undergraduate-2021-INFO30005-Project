import "server-only";
import { asc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { products } from "@/db/schema";
import { menuItem } from "@/lib/menu";
import { slugify } from "@/lib/slug";
import type { ProductDTO } from "@/lib/types";

/** The `Product` collection (`getAllSnacks` in the original controller). */
export async function listMenu(): Promise<ProductDTO[]> {
  const db = await getDb();
  const rows = await db.select().from(products).orderBy(asc(products.id));
  return rows.map((row) => {
    const known = menuItem(row.product);
    return {
      product: row.product,
      slug: slugify(row.product),
      price: row.price,
      photo: row.photo ?? known?.photo ?? "/images/snacks/cappuccino.svg",
      description: row.description ?? known?.description ?? "",
      kind: known?.kind ?? "coffee",
    };
  });
}
