"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapLibreMap, Marker, StyleSpecification } from "maplibre-gl";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { VanMark } from "@/components/brand/van-mark";
import type { LatLng } from "@/lib/distance";
import { basemapUrl, fallbackStyle } from "@/lib/geo/map-styles";
import { cn } from "@/lib/utils";

export type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  open: boolean;
  /** 1-based rank among the nearest vans (highlighted pins). */
  rank?: number;
};

type Props = {
  points: MapPoint[];
  origin?: LatLng | null;
  originLabel?: string;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Clicking the map reports a position (drop a pin / set the van's location). */
  onPick?: (position: LatLng) => void;
  /** Change this value to re-fit the view to the origin and ranked points. */
  fitKey?: string;
  /** Change this value to pan to `selectedId` (e.g. after a pick in a list). */
  focusKey?: string;
  initialCenter: LatLng;
  initialZoom?: number;
  className?: string;
  ariaLabel: string;
  children?: ReactNode;
};

type BaseState = "loading" | "tiles" | "fallback";

const TILE_TIMEOUT_MS = 8000;

/**
 * MapLibre GL map on OpenFreeMap vector tiles with React-rendered pins.
 * If the tiles can't load (offline, blocked, outage) it swaps to the bundled
 * schematic basemap so the van finder keeps working.
 */
export function VanMap({
  points,
  origin,
  originLabel = "You are here",
  selectedId,
  onSelect,
  onPick,
  fitKey,
  focusKey,
  initialCenter,
  initialZoom = 14,
  className,
  ariaLabel,
  children,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const libRef = useRef<typeof import("maplibre-gl") | null>(null);
  const markers = useRef(new Map<string, Marker>());
  const originMarker = useRef<Marker | null>(null);
  const [elements, setElements] = useState<Record<string, HTMLElement>>({});
  const [originEl, setOriginEl] = useState<HTMLElement | null>(null);
  const [base, setBase] = useState<BaseState>("loading");
  const [ready, setReady] = useState(false);
  const { resolvedTheme } = useTheme();
  const theme: "light" | "dark" = resolvedTheme === "dark" ? "dark" : "light";
  const themeRef = useRef(theme);
  const usingFallback = useRef(false);
  const onPickRef = useRef(onPick);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    (async () => {
      const mod = await import("maplibre-gl");
      // The UMD build may arrive as a default export depending on the bundler.
      const lib = ((mod as { default?: unknown }).default ?? mod) as typeof mod;
      if (cancelled || !container.current) return;
      libRef.current = lib;
      const map = new lib.Map({
        container: container.current,
        style: basemapUrl(themeRef.current),
        center: [initialCenter.lng, initialCenter.lat],
        zoom: initialZoom,
        attributionControl: { compact: true },
        cooperativeGestures: false,
        dragRotate: false,
        pitchWithRotate: false,
      });
      map.touchZoomRotate.disableRotation();
      map.addControl(new lib.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;

      const switchToFallback = () => {
        if (usingFallback.current) return;
        usingFallback.current = true;
        map.setStyle(fallbackStyle(themeRef.current) as unknown as StyleSpecification);
        map.once("styledata", () => setReady(true));
        setBase("fallback");
      };
      timer = window.setTimeout(() => {
        if (!map.isStyleLoaded()) switchToFallback();
      }, TILE_TIMEOUT_MS);
      map.on("load", () => {
        window.clearTimeout(timer);
        if (!usingFallback.current) setBase("tiles");
        setReady(true);
      });
      map.on("error", (event) => {
        // Style or tile fetch failures before the style is usable -> local basemap.
        if (!map.isStyleLoaded() && !usingFallback.current) {
          console.warn("Basemap unavailable, using the bundled fallback", event.error?.message);
          switchToFallback();
        }
      });
      map.on("click", (event) => {
        onPickRef.current?.({ lat: event.lngLat.lat, lng: event.lngLat.lng });
      });
    })();
    const markerMap = markers.current;
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      markerMap.forEach((m) => m.remove());
      markerMap.clear();
      originMarker.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow the colour theme.
  useEffect(() => {
    themeRef.current = theme;
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(
      usingFallback.current
        ? (fallbackStyle(theme) as unknown as StyleSpecification)
        : basemapUrl(theme),
    );
  }, [theme]);

  // Sync van pins.
  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib) return;
    const seen = new Set<string>();
    const added: Record<string, HTMLElement> = {};
    const removed: string[] = [];
    for (const point of points) {
      seen.add(point.id);
      const existing = markers.current.get(point.id);
      if (existing) {
        existing.setLngLat([point.lng, point.lat]);
        continue;
      }
      const el = document.createElement("div");
      const marker = new lib.Marker({ element: el, anchor: "bottom" })
        .setLngLat([point.lng, point.lat])
        .addTo(map);
      markers.current.set(point.id, marker);
      added[point.id] = el;
    }
    for (const [id, marker] of markers.current) {
      if (!seen.has(id)) {
        marker.remove();
        markers.current.delete(id);
        removed.push(id);
      }
    }
    if (Object.keys(added).length || removed.length) {
      // Marker DOM nodes are created by MapLibre (an external system); React portals render into them.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setElements((prev) => {
        const next = { ...prev, ...added };
        for (const id of removed) delete next[id];
        return next;
      });
    }
  }, [points, ready]);

  // The "you are here" dot.
  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib) return;
    if (!origin) {
      originMarker.current?.remove();
      originMarker.current = null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOriginEl(null);
      return;
    }
    if (!originMarker.current) {
      const el = document.createElement("div");
      originMarker.current = new lib.Marker({ element: el })
        .setLngLat([origin.lng, origin.lat])
        .addTo(map);
      setOriginEl(el);
    } else {
      originMarker.current.setLngLat([origin.lng, origin.lat]);
    }
  }, [origin, ready]);

  // Fit the view to the origin and the ranked vans.
  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib || !ready || !fitKey) return;
    const focus = points.filter((p) => p.rank != null);
    const coords: [number, number][] = focus.map((p) => [p.lng, p.lat]);
    if (origin) coords.push([origin.lng, origin.lat]);
    if (!coords.length) return;
    map.resize();
    if (coords.length === 1) {
      map.easeTo({ center: coords[0], zoom: Math.max(map.getZoom(), 15), duration: 700 });
      return;
    }
    const bounds = coords.reduce((b, c) => b.extend(c), new lib.LngLatBounds(coords[0], coords[0]));
    map.fitBounds(bounds, {
      padding: { top: 84, bottom: 50, left: 50, right: 60 },
      maxZoom: 16,
      duration: 700,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, ready]);

  // Keep the selected / ranked pins stacked above the others (and above the "you" dot).
  useEffect(() => {
    for (const point of points) {
      const el = markers.current.get(point.id)?.getElement();
      if (el) el.style.zIndex = point.id === selectedId ? "4" : point.rank ? "3" : "1";
    }
    const originNode = originMarker.current?.getElement();
    if (originNode) originNode.style.zIndex = "2";
  }, [points, selectedId, elements, originEl]);

  // Pan to the selected van when the user picks one from a list (focusKey changes).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !focusKey || !selectedId) return;
    const point = points.find((p) => p.id === selectedId);
    if (point) map.easeTo({ center: [point.lng, point.lat], duration: 500 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  return (
    <div className={cn("relative isolate overflow-hidden", className)}>
      {/* MapLibre forces `position: relative` on its container, so size it explicitly. */}
      <div ref={container} className="h-full w-full" role="region" aria-label={ariaLabel} />
      {base === "loading" ? (
        <div className="bg-grain pointer-events-none absolute inset-0 grid place-items-center bg-muted/70">
          <span className="rounded-full bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            Loading map…
          </span>
        </div>
      ) : null}
      {base === "fallback" ? (
        <span className="absolute bottom-2 left-2 z-10 rounded-full bg-card/90 px-2.5 py-1 text-[0.68rem] font-medium text-muted-foreground shadow-sm">
          Offline basemap (simplified)
        </span>
      ) : null}
      {points.map((point) => {
        const el = elements[point.id];
        if (!el) return null;
        const selected = point.id === selectedId;
        return createPortal(
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect?.(point.id);
            }}
            aria-label={`${point.label}${point.rank ? `, number ${point.rank} nearest` : ""}${point.open ? "" : ", closed"}`}
            aria-pressed={selected}
            className={cn(
              "group relative flex flex-col items-center transition-transform duration-200 outline-none focus-visible:scale-110",
              selected ? "z-20 scale-110" : point.rank ? "z-10" : "opacity-75",
              !point.open && "opacity-45 grayscale",
            )}
          >
            <span
              className={cn(
                "flex items-center gap-1 rounded-full border-2 bg-card px-1.5 py-1 shadow-md transition-colors",
                selected ? "border-primary" : "border-card",
                "group-hover:border-primary/70 group-focus-visible:border-primary",
              )}
            >
              <VanMark className="h-4 w-auto" />
              {point.rank ? (
                <span
                  className={cn(
                    "grid size-4 place-items-center rounded-full text-[0.62rem] font-bold",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-espresso-800 text-crema-100 dark:bg-crema-200 dark:text-espresso-900",
                  )}
                >
                  {point.rank}
                </span>
              ) : null}
            </span>
            <span
              className={cn(
                "-mt-0.5 size-2 rotate-45 border-r-2 border-b-2 bg-card",
                selected ? "border-primary" : "border-card",
              )}
            />
            {selected ? (
              <span className="absolute -top-7 rounded-full bg-espresso-900 px-2 py-0.5 text-[0.68rem] font-semibold whitespace-nowrap text-crema-100 shadow">
                {point.label}
              </span>
            ) : null}
          </button>,
          el,
          point.id,
        );
      })}
      {originEl
        ? createPortal(
            <span className="relative flex size-5 items-center justify-center" title={originLabel}>
              <span className="absolute inline-flex size-full animate-pulse-ring rounded-full bg-sky-500/50" />
              <span className="relative size-3.5 rounded-full border-2 border-white bg-sky-500 shadow" />
              <span className="sr-only">{originLabel}</span>
            </span>,
            originEl,
          )
        : null}
      {children}
    </div>
  );
}
