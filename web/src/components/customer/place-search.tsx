"use client";

import { Loader2, MapPin, Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import type { GeocodeResult } from "@/lib/geocode-format";
import { cn } from "@/lib/utils";

/** Address / place search via the server-side Photon proxy. */
export function PlaceSearch({
  onSelect,
  placeholder = "Search a street, campus or landmark",
  className,
}: {
  onSelect: (result: GeocodeResult) => void;
  placeholder?: string;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      abort.current?.abort();
      return;
    }
    const timer = window.setTimeout(async () => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      setLoading(true);
      try {
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { results?: GeocodeResult[] };
        setResults(data.results ?? []);
        setOpen(true);
        setActive(-1);
      } catch {
        // aborted or offline: keep the previous results
      } finally {
        if (abort.current === controller) setLoading(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  const choose = (result: GeocodeResult) => {
    onSelect(result);
    setQuery(result.label);
    setOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      <label htmlFor={`${listId}-input`} className="sr-only">
        Search for a place
      </label>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        id={`${listId}-input`}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value.trim().length < 2) {
            setResults([]);
            setOpen(false);
          }
        }}
        onFocus={() => results.length && setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!open || !results.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % results.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            choose(results[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        className="h-11 rounded-xl bg-card pr-9 pl-9"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
      />
      {loading ? (
        <Loader2
          className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
          aria-hidden
        />
      ) : null}
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-72 overflow-auto rounded-xl border bg-popover p-1 shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted-foreground">
              No places found around Melbourne.
            </li>
          ) : (
            results.map((r, i) => (
              <li
                key={`${r.lat},${r.lng},${i}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(r);
                }}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-lg px-3 py-2 text-sm",
                  i === active ? "bg-secondary" : "hover:bg-secondary/70",
                )}
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span>{r.label}</span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
