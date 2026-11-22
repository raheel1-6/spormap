# Decisions

Record of choices that affect architecture, cost, privacy or licensing.
Status: **agreed** (owner confirmed) · **proposed** (waiting for owner) · **assumed** (reversible default).

## D0 · Platform: static website on GitHub Pages — agreed (2026-11-22)

Replaces the native Android plan. Reasons: free hosting, one indexable page per region
(search traffic), shareable URLs without App Links, works on iOS too, no Play fee.
The Android M1 work (Kotlin/Compose theme) is preserved on the `android` branch.

Stack: Astro (static output, one page per region) + TypeScript islands for the map, panel and
search. Fonts: Fraunces + Inter variable (SIL OFL 1.1, self-hosted via Fontsource).
Address: `https://raheel1-6.github.io/spormap/` (free). `spormap.com.tr` is not registered; owner chose to stay on the free address for now (2026-11-22). Adding a domain later only needs DNS records plus the Pages custom-domain setting; the build picks up the new base path automatically.

## D1 · Ratings: Google, live, never stored — agreed (option A)

Google Maps Platform terms (as understood on 2026-11-22; re-verify before launch):

- Only `place_id` may be stored indefinitely; lat/lng may be cached up to 30 days.
- Ratings, review counts, names, addresses, hours: no storing, pre-fetching or derived datasets.
- Places content must not be shown with or near a non-Google map.
- Google attribution must be shown wherever Places content appears.

| Original spec                                         | Becomes                                                                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Monthly precomputed dataset of venues + ratings       | Monthly precomputed dataset of **OSM** venues (ODbL), built in GitHub Actions. Ratings fetched live.          |
| Choropleth "top category by aggregate weighted score" | Top category by **OSM venue count** (tie-break: higher count → category priority order in `categories.json`). |
| Weighted ranking `(v/(v+m))·R + (m/(v+m))·C`          | Unchanged, computed in the browser per response; `C` = mean of that response. Never stored.                   |
| Region pages with ratings for SEO                     | Static pages list OSM venues; ratings are filled in client-side.                                              |

## D2 · Map: Google Maps JavaScript API — agreed by consequence of D1

Vector map with a cloud style (Map ID) hiding every basemap feature, land coloured `#DED2BA`.
Regions drawn from our OSM GeoJSON (Data layer, or a Maps Datasets upload if profiling favours it),
labels as HTML overlays with a collision pass. The dot grid sits on the page behind a transparent
map background. Google logo and attribution stay visible at the bottom-left, under the breadcrumb.

The browser key is public by nature: restricted to `https://raheel1-6.github.io/spormap/*` (+ localhost for
development) and to the Maps JavaScript API only.

## D3 · Boundaries: OpenStreetMap only — agreed

ilçe = `admin_level=6`, mahalle = `admin_level=8`, İstanbul = `admin_level=4`.
Yaka = dissolve of district sets (25 Avrupa, 14 Anadolu; Adalar counted as Anadolu).
Attribution "© OpenStreetMap katkıda bulunanlar" on the map and in the footer.

## D4 · Everything free — agreed in principle; limits below need owner sign-off

| Piece                                                            | Service                          | Free limit                                        | Card?                                        |
| ---------------------------------------------------------------- | -------------------------------- | ------------------------------------------------- | -------------------------------------------- |
| Site, region pages, OSM data files                               | GitHub Pages                     | 100 GB/month soft bandwidth, 1 GB site            | No                                           |
| Monthly OSM rebuild, CI                                          | GitHub Actions                   | Unlimited minutes on public repos                 | No                                           |
| Places proxy (holds the Places key, rate-limits, stores nothing) | Cloudflare Worker                | 100k requests/day                                 | No (free Cloudflare account)                 |
| Bot protection for the proxy                                     | Cloudflare Turnstile             | Free                                              | No                                           |
| Map display                                                      | Maps JavaScript API              | ~10,000 free map loads/month (Essentials; verify) | **Yes**, billing account required even at $0 |
| Ratings                                                          | Places API (New), Enterprise SKU | ~1,000 free calls/month (verify)                  | Same account                                 |

GitHub Pages cannot run server code, so the Places proxy has to live elsewhere; the Cloudflare
Worker is the only piece outside GitHub. Quotas in Google Cloud will be capped at the free tiers,
so Google can never bill: past the cap the map (or ratings) stop for the rest of the month and the
site shows the OSM list without ratings.

## D5 · Tooling — assumed

Node 26 locally (24 in CI), Astro 7, TypeScript 6 (strictest), ESLint 10 + typescript-eslint,
Prettier, Vitest. `npm run verify` = format check, lint, `astro check`, tests, build; CI runs it on
branches and pull requests, and the Pages deploy runs it before publishing `main`.
