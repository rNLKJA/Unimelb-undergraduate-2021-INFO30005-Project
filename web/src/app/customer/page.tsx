import type { Metadata } from "next";
import { VanFinder } from "@/components/customer/van-finder";
import { listVans } from "@/server/vans";

export const metadata: Metadata = {
  title: "Find a van",
  description: "See the five nearest open snack vans on a live map and order ahead.",
};

export default async function CustomerHomePage() {
  const vans = await listVans();
  return <VanFinder initialVans={vans} />;
}
