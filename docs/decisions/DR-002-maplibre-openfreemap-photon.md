# DR-002: Replace Google Maps and OpenCage with MapLibre, OpenFreeMap and Photon

- **Decision:** render maps with MapLibre GL and OpenFreeMap vector tiles, geocode through Photon (Nominatim as an explicit fallback, a bundled suburb list as the last resort), and keep every map feature working without an API key.
- **Status:** accepted on 6 October 2026, during the revival (recorded on 6 October 2026, after the fact).
- **Supersedes:** nothing.

## Context

The 2021 app used the Google Maps JavaScript API for the nearest-van map and the order map, and OpenCage to turn a van's GPS position into an address. The Google key was hard-coded in two Handlebars views and is still in the repository's old history (it is redacted from the current tree; its owner should revoke it). OpenCage needed a key in the environment.

The revival is a public portfolio demo with no budget. Any key it ships with is either exposed in the browser or has to be paid for, and a dead key breaks the most visible feature on the site.

## Decision

- MapLibre GL in the browser with OpenFreeMap's free vector tiles, styled for light and dark themes, and a small bundled offline basemap if the tiles fail.
- All geocoding goes through the app's own Route Handlers (`/api/geocode/*`), which rate-limit callers and send a contact string in the User-Agent as the free services ask.
- Photon (komoot) for search and reverse geocoding. After a failure it is skipped for a minute (a simple circuit breaker).
- Nominatim only for an explicit search when the visitor presses Enter, because its usage policy forbids autocomplete, and never more than once a second.
- A bundled list of Melbourne suburbs as the fully local last resort.

## Options considered

1. **Google Maps with a new, referrer-restricted key.** The most polished tiles and geocoding, but a billing account, a key in the browser and a dependency on the owner keeping it alive.
2. **Mapbox.** Excellent vector maps; still a token and a usage quota.
3. **Leaflet with OpenStreetMap raster tiles.** Key-less and simple, but the OSM tile servers are not for production traffic and raster tiles cannot follow the dark theme.
4. **MapLibre, OpenFreeMap and Photon** (chosen). Open source, key-less, vector tiles that can be themed, and a geocoder built on OpenStreetMap data.

## Why

Nothing to leak, nothing to pay, nothing to expire. Vector tiles let the map match the site's light and dark themes, and routing geocoding through the server keeps the free services' usage policies enforceable in one place.

## What happened

- The map, place search and "set my van's location" all work without keys, locally and on Vercel.
- Photon was sometimes slow when called from Vercel, which made the search box feel broken. The circuit breaker plus the bundled suburb list fixed the experience; Nominatim on Enter covers searches the suburb list cannot.
- The nearest-van ranking still uses the 2021 distance (Euclidean in degrees, not great-circle) so the parity tests against the original code pass. At Melbourne's latitude a degree of longitude is about 21% shorter than a degree of latitude, so east-west distances are overstated by about 27% and two vans at similar distances can swap places. The methods page says so.
- Free services carry no service level. I have not measured their availability, so I cannot claim one.

## What I'd change

- Log geocoder latency and failures, and set an explicit budget for when a paid fallback is needed.
- Make a separate decision about moving the ranking to haversine distance, with the parity tests updated deliberately rather than quietly.
