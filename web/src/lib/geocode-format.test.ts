import { describe, expect, it } from "vitest";
import {
  coordKey,
  formatNominatimAddress,
  formatPhotonAddress,
  nominatimPlaceToResult,
  photonFeatureToResult,
  stateAbbreviation,
} from "./geocode-format";

describe("geocoder formatting", () => {
  it("formats Photon properties as an Australian address", () => {
    expect(
      formatPhotonAddress({
        name: "State Library Victoria",
        housenumber: "328",
        street: "Swanston Street",
        district: "Melbourne",
        city: "Melbourne",
        state: "Victoria",
        postcode: "3000",
      }),
    ).toBe("State Library Victoria, 328 Swanston Street, Melbourne VIC 3000");
  });

  it("drops a name that just repeats the street and falls back to city/country", () => {
    expect(
      formatPhotonAddress({
        name: "Lygon Street",
        street: "Lygon Street",
        locality: "Carlton",
        state: "Victoria",
      }),
    ).toBe("Lygon Street, Carlton VIC");
    expect(formatPhotonAddress({ country: "Australia" })).toBe("Australia");
  });

  it("maps a Photon feature (GeoJSON lon/lat order) to a result", () => {
    expect(
      photonFeatureToResult({
        geometry: { coordinates: [144.961, -37.7983] },
        properties: { street: "Grattan Street", city: "Parkville" },
      }),
    ).toEqual({
      lat: -37.7983,
      lng: 144.961,
      label: "Grattan Street, Parkville",
      source: "photon",
    });
    expect(photonFeatureToResult({ properties: {} })).toBeNull();
  });

  it("formats Nominatim addresses (the response seen for Melbourne Uni)", () => {
    expect(
      formatNominatimAddress({
        road: "Wilson Avenue",
        suburb: "Parkville",
        city: "Melbourne",
        state: "Victoria",
        postcode: "3052",
      }),
    ).toBe("Wilson Avenue, Parkville VIC 3052");
    expect(formatNominatimAddress({}, "fallback")).toBe("fallback");
  });

  it("maps a Nominatim search hit (the response seen for Flinders Street Station)", () => {
    expect(
      nominatimPlaceToResult({
        lat: "-37.8184161",
        lon: "144.9664779",
        name: "Flinders Street",
        display_name: "Flinders Street, Melbourne, Victoria, 3000, Australia",
        address: {
          road: "Flinders Street",
          suburb: "Melbourne",
          city: "Melbourne",
          state: "Victoria",
          postcode: "3000",
        },
      }),
    ).toEqual({
      lat: -37.8184161,
      lng: 144.9664779,
      label: "Flinders Street, Melbourne VIC 3000",
      source: "nominatim",
    });
    expect(
      nominatimPlaceToResult({
        lat: "-37.8098",
        lon: "144.9652",
        name: "State Library Victoria",
        address: {
          house_number: "328",
          road: "Swanston Street",
          suburb: "Melbourne",
          state: "Victoria",
          postcode: "3000",
        },
      })?.label,
    ).toBe("State Library Victoria, 328 Swanston Street, Melbourne VIC 3000");
    expect(
      nominatimPlaceToResult({ lat: "-37.8", lon: "144.9", display_name: "Somewhere" })?.label,
    ).toBe("Somewhere");
    expect(nominatimPlaceToResult({ name: "No coordinates" })).toBeNull();
    expect(nominatimPlaceToResult({ lat: "-37.8", lon: "144.9" })).toBeNull();
  });

  it("abbreviates states and builds cache keys", () => {
    expect(stateAbbreviation("New South Wales")).toBe("NSW");
    expect(stateAbbreviation("Bavaria")).toBe("Bavaria");
    expect(coordKey({ lat: -37.796312, lng: 144.961449 })).toBe("-37.7963,144.9614");
  });
});
