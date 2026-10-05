import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetGeocoder, reverseGeocode, searchPlaces } from "./geocode";

type Handler = (url: string) => unknown;

/** Stub `fetch`: each handler answers one upstream host, `null` means "times out". */
function stubUpstreams(handlers: { photon?: Handler; nominatim?: Handler }) {
  const calls: string[] = [];
  const fetchMock = vi.fn(async (input: string | URL) => {
    const url = String(input);
    calls.push(url);
    const handler = url.includes("photon.komoot.io") ? handlers.photon : handlers.nominatim;
    const body = handler?.(url);
    if (body === null || body === undefined) throw new DOMException("timed out", "TimeoutError");
    return new Response(JSON.stringify(body), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

const flindersPhoton = {
  features: [
    {
      geometry: { coordinates: [144.9671, -37.8183] },
      properties: {
        name: "Flinders Street Station",
        street: "Flinders Street",
        district: "Melbourne",
        state: "Victoria",
        postcode: "3000",
      },
    },
  ],
};

const flindersNominatim = [
  {
    lat: "-37.8184161",
    lon: "144.9664779",
    name: "Flinders Street",
    address: { road: "Flinders Street", suburb: "Melbourne", state: "Victoria", postcode: "3000" },
  },
];

describe("place search fallbacks", () => {
  beforeEach(() => __resetGeocoder());
  afterEach(() => vi.unstubAllGlobals());

  it("uses Photon when it answers", async () => {
    const calls = stubUpstreams({ photon: () => flindersPhoton });
    const out = await searchPlaces("Flinders Street Station");
    expect(out.degraded).toBe(false);
    expect(out.results[0]).toMatchObject({
      label: "Flinders Street Station, Flinders Street, Melbourne VIC 3000",
      source: "photon",
    });
    expect(calls).toHaveLength(1);
  });

  it("never sends keystroke searches to Nominatim; reports degraded suburb matches instead", async () => {
    const calls = stubUpstreams({ photon: () => null, nominatim: () => flindersNominatim });
    const out = await searchPlaces("Carlton");
    expect(out.degraded).toBe(true);
    expect(out.results.map((r) => r.label)).toEqual(["Carlton VIC 3053", "Carlton North VIC 3054"]);
    expect(calls.some((u) => u.includes("nominatim"))).toBe(false);
  });

  it("falls back to Nominatim on an explicit search and skips a failing Photon for a while", async () => {
    const calls = stubUpstreams({ photon: () => null, nominatim: () => flindersNominatim });
    const first = await searchPlaces("Flinders Street Station");
    expect(first).toMatchObject({ degraded: true, results: [] });

    const submitted = await searchPlaces("Flinders Street Station", { submit: true });
    expect(submitted.degraded).toBe(false);
    expect(submitted.results[0]).toMatchObject({
      label: "Flinders Street, Melbourne VIC 3000",
      source: "nominatim",
    });
    // The breaker kept the second search from waiting on Photon again.
    expect(calls.filter((u) => u.includes("photon"))).toHaveLength(1);
    const nominatimUrl = new URL(calls.find((u) => u.includes("nominatim"))!);
    expect(nominatimUrl.pathname).toBe("/search");
    expect(nominatimUrl.searchParams.get("countrycodes")).toBe("au");
    expect(nominatimUrl.searchParams.get("bounded")).toBe("1");

    // Cached: the same query is answered without another upstream call.
    const again = await searchPlaces("flinders street station");
    expect(again.results[0].source).toBe("nominatim");
    expect(calls).toHaveLength(2);
  });

  it("reverse-geocodes through Nominatim when Photon is down", async () => {
    stubUpstreams({
      photon: () => null,
      nominatim: () => ({
        address: {
          road: "Wilson Avenue",
          suburb: "Parkville",
          state: "Victoria",
          postcode: "3052",
        },
      }),
    });
    const out = await reverseGeocode({ lat: -37.7983, lng: 144.961 });
    expect(out).toMatchObject({ label: "Wilson Avenue, Parkville VIC 3052", source: "nominatim" });
  });

  it("ignores queries shorter than two characters", async () => {
    const calls = stubUpstreams({});
    expect(await searchPlaces(" a ")).toEqual({ results: [], degraded: false });
    expect(calls).toHaveLength(0);
  });
});
