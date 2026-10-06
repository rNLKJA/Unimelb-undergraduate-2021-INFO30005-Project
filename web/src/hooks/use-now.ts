"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A ticking clock for countdowns. The first render uses the server's time so
 * server and client markup match; afterwards it ticks on the client, corrected
 * for any skew between the two clocks.
 */
export function useNow(serverNow: number, intervalMs = 1000): number {
  const [now, setNow] = useState(serverNow);
  const offset = useRef<number | null>(null);

  useEffect(() => {
    if (offset.current === null) offset.current = serverNow - Date.now();
    const tick = () => setNow(Date.now() + (offset.current ?? 0));
    tick();
    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [serverNow, intervalMs]);

  return now;
}
