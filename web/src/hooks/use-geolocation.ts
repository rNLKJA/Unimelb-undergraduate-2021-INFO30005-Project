"use client";

import { useCallback, useState } from "react";
import type { LatLng } from "@/lib/distance";

export type GeoState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "ok"; position: LatLng; accuracy: number }
  | { status: "error"; message: string };

/** Browser geolocation on demand (the original asked on page load). */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ status: "idle" });

  const locate = useCallback(() => {
    return new Promise<LatLng | null>((resolve) => {
      if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
        setState({ status: "error", message: "Location isn't available in this browser." });
        resolve(null);
        return;
      }
      setState({ status: "locating" });
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const position = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setState({ status: "ok", position, accuracy: pos.coords.accuracy });
          resolve(position);
        },
        (err) => {
          const message =
            err.code === err.PERMISSION_DENIED
              ? "Location permission was denied. You can still drop a pin on the map."
              : "We couldn't get your location. Try again or drop a pin on the map.";
          setState({ status: "error", message });
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
      );
    });
  }, []);

  return { state, locate };
}
