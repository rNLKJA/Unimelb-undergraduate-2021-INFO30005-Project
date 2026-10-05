import { ArrowLeft, Clock, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MenuGrid } from "@/components/customer/menu-grid";
import { VanMark } from "@/components/brand/van-mark";
import { Stars } from "@/components/shared/stars";
import { listMenu } from "@/server/menu";
import { getVanBySlug } from "@/server/vans";

export async function generateMetadata(
  props: PageProps<"/customer/van/[slug]/menu">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const van = await getVanBySlug(slug);
  return { title: van ? `${van.vanId} menu` : "Van not found" };
}

export default async function VanMenuPage(props: PageProps<"/customer/van/[slug]/menu">) {
  const { slug } = await props.params;
  const [van, menu] = await Promise.all([getVanBySlug(slug), listMenu()]);
  if (!van) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <Link
        href="/customer"
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> All vans
      </Link>

      <header className="relative mt-3 mb-8 overflow-hidden rounded-3xl border bg-card p-5 shadow-sm sm:p-7">
        <div className="bg-awning absolute inset-x-0 top-0 h-2.5" aria-hidden />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-secondary">
              <VanMark className="h-9 w-auto" />
            </span>
            <div>
              <h1 className="text-3xl font-semibold">{van.vanId}</h1>
              <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />{" "}
                {van.address || "Location not published"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span
              className={
                van.open
                  ? "inline-flex items-center gap-1.5 rounded-full bg-matcha-300/35 px-3 py-1 font-semibold text-matcha-600 dark:text-matcha-300"
                  : "inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 font-semibold text-muted-foreground"
              }
            >
              <span
                className={
                  van.open
                    ? "size-2 rounded-full bg-matcha-500"
                    : "size-2 rounded-full bg-muted-foreground"
                }
              />
              {van.open ? "Open now" : "Closed"}
            </span>
            {van.rating ? (
              <span className="inline-flex items-center gap-1.5">
                <Stars value={van.rating.average} />
                <span className="font-semibold">{van.rating.average.toFixed(1)}</span>
                <span className="text-muted-foreground">({van.rating.count})</span>
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Clock className="size-4" aria-hidden /> Ready in 15 min or discounted
            </span>
          </div>
        </div>
        {!van.open ? (
          <p className="mt-4 rounded-2xl bg-secondary px-4 py-3 text-sm">
            This van is closed right now, so ordering is paused.{" "}
            <Link
              href="/customer"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Pick an open van
            </Link>{" "}
            — the menu is the same everywhere.
          </p>
        ) : null}
      </header>

      <MenuGrid van={van} menu={menu} />
    </div>
  );
}
