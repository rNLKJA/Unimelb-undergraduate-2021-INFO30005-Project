"use client";

import { Check, Crosshair, Loader2, MapPin, MousePointerClick, Power, Save } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { setVanLocationAction, setVanOpenAction } from "@/app/vendor/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useGeolocation } from "@/hooks/use-geolocation";
import type { LatLng } from "@/lib/distance";
import { formatDateTime } from "@/lib/format";
import type { GeocodeResult } from "@/lib/geocode-format";
import type { VanDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

const VanMap = dynamic(() => import("@/components/map/van-map").then((m) => m.VanMap), {
  ssr: false,
  loading: () => <div className="bg-grain h-full w-full animate-pulse bg-muted" />,
});

/**
 * Port of the vendor header (`vendor-header.hbs`): update the van's location
 * (GPS or, new in the revival, a click on the map), optionally type the
 * address, then open or close the van. As in 2021, the van can only be opened
 * after its location has been updated in this session ("You need update
 * location first"), and going offline clears that flag.
 */
export function VanControlPanel({ van }: { van: VanDTO }) {
  const router = useRouter();
  const { state: geo, locate } = useGeolocation();
  const [pending, setPending] = useState<LatLng | null>(null);
  const [suggested, setSuggested] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [lookingUp, setLookingUp] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [open, setOpen] = useState(van.open);
  const [saving, startSaving] = useTransition();
  const [toggling, startToggling] = useTransition();

  const current = { lat: van.lat, lng: van.lng };
  const shown = pending ?? current;

  const lookup = useRef<AbortController | null>(null);

  // A new spot was picked: reverse-geocode it (Photon via our Route Handler).
  const pick = (p: LatLng) => {
    setPending(p);
    setSuggested("");
    lookup.current?.abort();
    const controller = new AbortController();
    lookup.current = controller;
    setLookingUp(true);
    fetch(`/api/geocode/reverse?lat=${p.lat}&lng=${p.lng}`, { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<GeocodeResult>) : null))
      .then((result) => {
        if (result?.label) setSuggested(result.label);
      })
      .catch(() => undefined)
      .finally(() => {
        if (lookup.current === controller) setLookingUp(false);
      });
  };

  const save = () =>
    startSaving(async () => {
      const target = pending ?? current;
      const result = await setVanLocationAction({
        lat: target.lat,
        lng: target.lng,
        address: address.trim() || suggested,
      });
      if (result.status === "ok") {
        setUpdated(true);
        setPending(null);
        setAddress("");
        toast.success("Location updated", { description: result.address });
        router.refresh();
      } else if (result.status === "error") {
        toast.error(result.message);
      }
    });

  const toggle = (next: boolean) => {
    if (next && !updated) {
      toast.warning("You need update location first", {
        description: "Confirm where the van is parked, then open for orders.",
      });
      return;
    }
    startToggling(async () => {
      setOpen(next);
      const result = await setVanOpenAction(next);
      if (result.status === "ok") {
        toast.success(result.message);
        if (!next) setUpdated(false);
        router.refresh();
      } else if (result.status === "error") {
        setOpen(!next);
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
      <section
        className="overflow-hidden rounded-2xl border bg-card shadow-sm"
        aria-labelledby="loc-title"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <h2 id="loc-title" className="flex items-center gap-2 font-semibold">
            <MapPin className="size-4 text-primary" aria-hidden /> Van location
          </h2>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MousePointerClick className="size-3.5" aria-hidden /> Click the map to move the van
          </p>
        </div>
        <VanMap
          className="h-[340px] lg:h-[420px]"
          ariaLabel="Map of your van's position. Click to choose a new spot."
          initialCenter={current}
          initialZoom={15}
          points={[
            {
              id: van.vanId,
              lat: shown.lat,
              lng: shown.lng,
              label: pending ? "New spot" : van.vanId,
              open: true,
              rank: 1,
            },
          ]}
          selectedId={van.vanId}
          onPick={pick}
          fitKey={pending ? undefined : `van:${van.lat},${van.lng}`}
        />
        <div className="space-y-3 p-4">
          <p className="text-sm">
            <span className="text-muted-foreground">Published address: </span>
            <span className="font-medium">{van.address || "none yet"}</span>
            {van.locationUpdatedAt ? (
              <span className="text-muted-foreground">
                {" "}
                · updated {formatDateTime(van.locationUpdatedAt)}
              </span>
            ) : null}
          </p>
          {pending ? (
            <p className="rounded-xl bg-honey-300/25 px-3 py-2 text-sm text-espresso-800 dark:text-honey-300">
              New spot picked at {pending.lat.toFixed(5)}, {pending.lng.toFixed(5)}.{" "}
              {lookingUp
                ? "Looking up the address…"
                : suggested
                  ? `Nearest address: ${suggested}`
                  : null}
            </p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="typed-address">Enter current location (optional)</Label>
            <Input
              id="typed-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={suggested || "Leave blank to use the looked-up address"}
              maxLength={200}
              className="h-10 rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              A typed address wins over the looked-up one, as in the original.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              className="h-10 rounded-xl"
              disabled={geo.status === "locating"}
              onClick={async () => {
                const p = await locate();
                if (p) pick(p);
              }}
            >
              {geo.status === "locating" ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Crosshair aria-hidden />
              )}
              Use GPS
            </Button>
            <Button type="button" className="h-10 rounded-xl" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
              Update location
            </Button>
          </div>
          {geo.status === "error" ? (
            <p className="text-xs text-tomato-600 dark:text-tomato-300">{geo.message}</p>
          ) : null}
        </div>
      </section>

      <section
        className={cn(
          "flex flex-col gap-5 rounded-2xl border p-5 shadow-sm transition-colors lg:self-start",
          open ? "border-matcha-400/60 bg-matcha-300/15" : "bg-card",
        )}
        aria-labelledby="status-title"
      >
        <div className="space-y-2">
          <h2 id="status-title" className="flex items-center gap-2 font-semibold">
            <Power className="size-4 text-primary" aria-hidden /> Van status
          </h2>
          <p className="font-display text-4xl font-semibold">
            {open ? "Open for orders" : "Closed"}
          </p>
          <p className="text-sm text-muted-foreground">
            {open
              ? "Customers nearby can see your van on the map and order ahead."
              : "Your van is hidden from the customer map until you open."}
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-card p-4 shadow-sm">
          <Label htmlFor="van-open" className="text-base font-semibold">
            {open ? "STATUS: OPEN" : "STATUS: CLOSED"}
          </Label>
          <Switch
            id="van-open"
            checked={open}
            disabled={toggling}
            onCheckedChange={toggle}
            aria-describedby="status-hint"
            className="scale-125"
          />
        </div>
        <p id="status-hint" className="text-xs text-muted-foreground">
          {updated
            ? "Location confirmed for this session. You can open the van."
            : "Update your location first, then switch the van on."}
        </p>
        <ol className="space-y-2.5 border-t pt-4 text-sm" aria-label="Opening checklist">
          {[
            { done: updated, text: "Confirm where the van is parked (GPS or a map click)" },
            { done: open, text: "Switch the van on so customers can find it" },
            { done: false, text: "Work through orders on the live board", link: true },
          ].map((step, i) => (
            <li key={step.text} className="flex items-start gap-2.5">
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full text-[0.7rem] font-bold",
                  step.done ? "bg-matcha-500 text-white" : "bg-secondary text-secondary-foreground",
                )}
                aria-hidden
              >
                {step.done ? <Check className="size-3" /> : i + 1}
              </span>
              <span
                className={cn(
                  step.done && "text-muted-foreground line-through decoration-matcha-500/60",
                )}
              >
                {step.link ? (
                  <Link href="/vendor/orders" className="font-medium text-primary hover:underline">
                    {step.text}
                  </Link>
                ) : (
                  step.text
                )}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
