"use client";

import { Loader2, MapPin, Search } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import type { GeocodeResult } from "@/lib/geocode-format";
import { cn } from "@/lib/utils";

type SearchResponse = { results?: GeocodeResult[]; degraded?: boolean };

/**
 * Address / place search via the server-side geocoding proxy. Suggestions
 * appear while typing; Enter runs an explicit search, which the server may
 * answer from Nominatim when Photon (the autocomplete service) is struggling.
 */
export function PlaceSearch({
  onSelect,
  placeholder = "Search a street or landmark",
  className,
}: {
  onSelect: (result: GeocodeResult) => void;
  placeholder?: string;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [degraded, setDegraded] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const abort = useRef<AbortController | null>(null);
  const debounce = useRef<number | undefined>(undefined);

  const runSearch = useCallback(async (q: string, submit: boolean) => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/geocode/search?q=${encodeURIComponent(q)}${submit ? "&submit=1" : ""}`,
        { signal: controller.signal },
      );
      const data = (await res.json()) as SearchResponse;
      setResults(data.results ?? []);
      setDegraded(Boolean(data.degraded));
      setSubmitted(submit);
      setOpen(true);
      setActive(-1);
    } catch {
      // aborted or offline: keep the previous results
    } finally {
      if (abort.current === controller) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      abort.current?.abort();
      return;
    }
    debounce.current = window.setTimeout(() => void runSearch(q, false), 350);
    return () => window.clearTimeout(debounce.current);
  }, [query, runSearch]);

  const choose = (result: GeocodeResult) => {
    onSelect(result);
    setQuery(result.label);
    setOpen(false);
  };

  // What to tell the visitor under the suggestions (and screen readers, politely).
  let message: string | null = null;
  if (open && !loading) {
    if (degraded && submitted) {
      message = results.length
        ? "Street search is busy right now, so these are suburb matches. Or tap the map to drop a pin."
        : "Street search is busy right now. Try a suburb name, or tap the map to drop a pin.";
    } else if (degraded) {
      message = results.length
        ? "Street search is slow right now, so these are suburb matches. Press Enter to search streets and landmarks."
        : "Street search is slow right now. Press Enter to search, or tap the map to drop a pin.";
    } else if (!results.length) {
      message = "No places found around Melbourne.";
    }
  }
  const showList = open && results.length > 0;
  const announcement = loading
    ? ""
    : (message ??
      (showList ? `${results.length} place${results.length === 1 ? "" : "s"} found` : ""));

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
            setDegraded(false);
            setOpen(false);
          }
        }}
        onFocus={() => (results.length || degraded) && setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (showList && active >= 0 && results[active]) {
              choose(results[active]);
              return;
            }
            const q = query.trim();
            if (q.length >= 2) {
              window.clearTimeout(debounce.current);
              void runSearch(q, true);
            }
            return;
          }
          if (e.key === "Escape") {
            setOpen(false);
            return;
          }
          if (!showList) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % results.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
          }
        }}
        placeholder={placeholder}
        className="h-11 rounded-xl bg-card pr-9 pl-9"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        enterKeyHint="search"
        autoComplete="off"
      />
      {loading ? (
        <Loader2
          className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
          aria-hidden
        />
      ) : null}
      {open && (showList || message) ? (
        <div className="absolute inset-x-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border bg-popover shadow-lg">
          {showList ? (
            <ul
              id={listId}
              role="listbox"
              aria-label="Places"
              className="max-h-72 overflow-auto p-1"
            >
              {results.map((r, i) => (
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
              ))}
            </ul>
          ) : null}
          {message ? (
            <p
              className={cn(
                "px-3 py-2.5 text-sm text-muted-foreground",
                showList && "border-t text-xs",
              )}
              aria-hidden
            >
              {message}
            </p>
          ) : null}
        </div>
      ) : null}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
