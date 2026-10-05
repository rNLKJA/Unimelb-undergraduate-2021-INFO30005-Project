"use client";

import {
  ArrowRight,
  Crosshair,
  Footprints,
  Loader2,
  MapPin,
  MousePointerClick,
  Store,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { Stars } from "@/components/shared/stars";
import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/hooks/use-geolocation";
import { formatDistance, walkingMinutes, type LatLng } from "@/lib/distance";
import { fetcher } from "@/lib/fetcher";
import { MELBOURNE_UNI, nearestVans } from "@/lib/nearest-vans";
import type { VanDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useCart } from "./cart-provider";
import { PlaceSearch } from "./place-search";

const VanMap = dynamic(() => import("@/components/map/van-map").then((m) => m.VanMap), {
  ssr: false,
  loading: () => <div className="bg-grain h-full w-full animate-pulse bg-muted" />,
});

type OriginSource = "default" | "gps" | "pin" | "search";

const SOURCE_LABEL: Record<OriginSource, string> = {
  default: "Melbourne Uni (default)",
  gps: "Your location",
  pin: "Dropped pin",
  search: "Searched place",
};

export function VanFinder({ initialVans }: { initialVans: VanDTO[] }) {
  const router = useRouter();
  const { cart, selectVan } = useCart();
  const { state: geo, locate } = useGeolocation();
  const [origin, setOrigin] = useState<LatLng>(MELBOURNE_UNI);
  const [source, setSource] = useState<OriginSource>("default");
  const [placeLabel, setPlaceLabel] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fitKey, setFitKey] = useState("initial");
  const [focusCount, setFocusCount] = useState(0);
  const choose = (vanId: string) => {
    setSelectedId(vanId);
    setFocusCount((n) => n + 1);
  };

  const { data } = useSWR<{ vans: VanDTO[] }>("/api/vans", fetcher, {
    refreshInterval: 15_000,
    fallbackData: { vans: initialVans },
    revalidateOnMount: false,
  });
  const vans = useMemo(() => data?.vans ?? initialVans, [data, initialVans]);

  // Port of `locate_van`: open vans with an address, ranked by the legacy distance, top five.
  const nearest = useMemo(
    () =>
      nearestVans(
        vans.map((v) => ({ ...v, xCoord: v.lat, yCoord: v.lng })),
        origin,
      ),
    [vans, origin],
  );
  const openCount = vans.filter((v) => v.open && v.address).length;
  const selected = nearest.find((v) => v.vanId === selectedId) ?? nearest[0] ?? null;

  const points = useMemo(() => {
    const rank = new Map(nearest.map((v, i) => [v.vanId, i + 1]));
    return vans
      .filter((v) => v.open && v.address)
      .map((v) => ({
        id: v.vanId,
        lat: v.lat,
        lng: v.lng,
        label: v.vanId,
        open: v.open,
        rank: rank.get(v.vanId),
      }));
  }, [vans, nearest]);

  const moveOrigin = (next: LatLng, how: OriginSource, label?: string) => {
    setOrigin(next);
    setSource(how);
    setPlaceLabel(label ?? null);
    setSelectedId(null);
    setFitKey(`${how}:${next.lat.toFixed(5)},${next.lng.toFixed(5)}`);
  };

  const orderFrom = (van: VanDTO) => {
    selectVan({ vanId: van.vanId, slug: van.slug, address: van.address });
    router.push(`/customer/van/${van.slug}/menu`);
  };

  return (
    <div className="grid md:h-[calc(100dvh-4rem)] md:grid-cols-[400px_1fr] lg:grid-cols-[430px_1fr]">
      <VanMap
        className="order-1 h-[44vh] min-h-72 md:order-2 md:h-full"
        ariaLabel="Map of open snack vans. Click the map to drop a pin at your location."
        initialCenter={MELBOURNE_UNI}
        points={points}
        origin={origin}
        originLabel={SOURCE_LABEL[source]}
        selectedId={selected?.vanId ?? null}
        onSelect={setSelectedId}
        onPick={(p) => moveOrigin(p, "pin")}
        fitKey={fitKey}
        focusKey={focusCount ? `focus-${focusCount}` : undefined}
      />

      <aside className="order-2 flex flex-col gap-4 overflow-y-auto border-r bg-background px-4 py-5 sm:px-6 md:order-1">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Find a van near you</h1>
          <p className="text-sm text-muted-foreground">
            {openCount} vans are open. We rank them by distance and highlight the five closest.
          </p>
        </div>

        <div className="space-y-2.5 rounded-2xl border bg-card p-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="size-4 shrink-0 text-sky-600" aria-hidden />
            <span className="min-w-0 flex-1 truncate">
              <span className="font-semibold">{SOURCE_LABEL[source]}</span>
              {placeLabel ? <span className="text-muted-foreground"> · {placeLabel}</span> : null}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              className="h-10 flex-1 rounded-xl"
              disabled={geo.status === "locating"}
              onClick={async () => {
                const pos = await locate();
                if (pos) moveOrigin(pos, "gps");
              }}
            >
              {geo.status === "locating" ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Crosshair aria-hidden />
              )}
              Use my location
            </Button>
            {source !== "default" ? (
              <Button
                type="button"
                variant="ghost"
                className="h-10 rounded-xl"
                onClick={() => moveOrigin(MELBOURNE_UNI, "default")}
              >
                Reset
              </Button>
            ) : null}
          </div>
          {geo.status === "error" ? (
            <p className="text-xs text-tomato-600 dark:text-tomato-300">{geo.message}</p>
          ) : null}
          <PlaceSearch
            onSelect={(r) => moveOrigin({ lat: r.lat, lng: r.lng }, "search", r.label)}
          />
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MousePointerClick className="size-3.5" aria-hidden /> Or click anywhere on the map to
            drop a pin.
          </p>
        </div>

        <section aria-labelledby="nearest-heading" className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <h2
              id="nearest-heading"
              className="text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase"
            >
              {nearest.length ? `${nearest.length} nearest open vans` : "No open vans"}
            </h2>
            {nearest.length ? (
              <p
                className="text-[0.68rem] text-muted-foreground"
                title="Vans are ranked by straight-line distance in degrees, exactly as the 2021 app did; walking distances are shown in metres."
              >
                Ranked the 2021 way
              </p>
            ) : null}
          </div>
          {nearest.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              <Store className="mx-auto mb-2 size-8" aria-hidden />
              Every van is closed right now. Vendors can open their van from the vendor board.
            </div>
          ) : (
            <ol className="space-y-2">
              {nearest.map((van, i) => {
                const active = van.vanId === selected?.vanId;
                return (
                  <li key={van.vanId}>
                    <button
                      type="button"
                      onClick={() => choose(van.vanId)}
                      aria-pressed={active}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-2xl border bg-card p-3 text-left transition-all",
                        active
                          ? "border-primary shadow-md shadow-primary/10"
                          : "hover:border-primary/40",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold",
                          active ? "bg-primary text-primary-foreground" : "bg-secondary",
                        )}
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate font-semibold">{van.vanId}</span>
                          <span className="tabular shrink-0 text-sm font-semibold">
                            {formatDistance(van.meters)}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {van.address}
                        </span>
                        <span className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Footprints className="size-3.5" aria-hidden />{" "}
                            {walkingMinutes(van.meters)} min walk
                          </span>
                          {van.rating ? (
                            <span className="inline-flex items-center gap-1">
                              <Stars value={van.rating.average} size="size-3" />{" "}
                              {van.rating.average.toFixed(1)}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {selected ? (
          <div className="sticky bottom-20 mt-auto rounded-2xl border bg-espresso-900 p-4 text-crema-100 shadow-xl md:bottom-0 dark:bg-espresso-800">
            <p className="text-xs font-medium tracking-wide text-crema-300/80 uppercase">
              {cart.van?.vanId === selected.vanId ? "Your current van" : "Selected van"}
            </p>
            <p className="font-display text-xl font-semibold">{selected.vanId}</p>
            <p className="mt-0.5 line-clamp-2 text-sm text-crema-200/80">{selected.address}</p>
            <Button
              type="button"
              onClick={() => orderFrom(selected)}
              className="mt-3 h-11 w-full rounded-xl bg-tomato-500 text-base font-semibold text-white hover:bg-tomato-600"
            >
              Order from this van <ArrowRight aria-hidden />
            </Button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
