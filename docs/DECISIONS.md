# Decisions

Living record of choices that affect architecture, cost, privacy or licensing.
Status: **agreed** (owner confirmed) · **proposed** (waiting for owner) · **assumed** (reversible default).

## D1 · Ratings source: Google, live, never stored — agreed (option A, 2026-11-22)

Google Maps Platform terms (as understood on 2026-11-22; re-verify before launch):

- Only `place_id` may be stored indefinitely; lat/lng may be cached up to 30 days.
- Ratings, review counts, names, addresses, hours: no storing, no pre-fetching, no derived datasets.
- Places content must not be shown with or near a non-Google map (the 2025 EEA carve-out does not apply to Türkiye).
- Google attribution must be shown wherever Places content appears.

Consequences:

| Spec item | Becomes |
|---|---|
| Monthly precomputed dataset of venues + ratings | Monthly precomputed dataset of **OSM** venues (ODbL). Ratings fetched live per request. |
| Choropleth "top category by aggregate weighted score" | Top category by **OSM venue count** per category (tie-break: higher count → fixed category priority order in `categories.json`). |
| Weighted ranking `(v/(v+m))·R + (m/(v+m))·C` | Unchanged, computed per response; `C` = mean rating of that response. Never stored. |
| Room cache with TTL | Caches only OSM/static data. Google fields live in memory for the screen's lifetime only. |
| Venue detail (photo, hours, phone) | Live Place Details call when the screen opens. |

## D2 · Map renderer: Google Maps SDK for Android — agreed by consequence of D1

MapLibre Native would be better on both axes the owner asked about (vector-tile performance, full
control of labels and paper styling), but D1 forbids showing Google ratings on a non-Google map.
So: Maps SDK + `maps-compose`, cloud map style with every basemap feature hidden and land coloured
`#DED2BA`; regions drawn as polygons; labels as generated bitmap markers with our own collision pass.

Mitigations for the trade-offs:

- Performance: draw only the focused level's children (≤ 39 ilçe, ≤ ~70 mahalle per district) plus
  simplified ghost outlines; mahalle geometry loaded per district (M3 profiles this).
- Look: the dot grid and glow can't be painted *under* Google's tiles; the dot grid becomes a
  transparent ground overlay and the glow a second wide, low-alpha polyline.
- The Google logo/attribution must stay visible (bottom-left; the breadcrumb sits above it).
- Maps SDK for Android map loads are free with no cap; the Android API key is restricted to the
  app's package + signing SHA-1 and to the Maps SDK only.

## D3 · Boundaries: OpenStreetMap only — agreed

ilçe = `admin_level=6`, mahalle = `admin_level=8`, province = `admin_level=4` (İstanbul).
Yaka = dissolve of district sets (25 Avrupa, 14 Anadolu; Adalar counted as Anadolu).
ODbL attribution "© OpenStreetMap katkıda bulunanlar" shown on the map and in About.

## D4 · Hosting must be free — proposed, needs owner confirmation of the limits below

| Piece | Service | Free limit | Card needed? |
|---|---|---|---|
| Static dataset (boundaries, OSM venues, categories JSON) + `assetlinks.json` + web fallback for deep links | GitHub Pages on `spormap.com.tr` | 100 GB/month bandwidth | No |
| Monthly OSM rebuild | GitHub Actions | Free for public repos; 2,000 min/month private | No |
| Places proxy (holds the key, checks App Check, no storage) | Cloudflare Workers | 100k requests/day | No |
| App Check, Crashlytics | Firebase Spark plan | Free | No |
| Map display | Maps SDK for Android | Unlimited, $0 | **Yes**: Google requires a billing account even for $0 usage |
| Ratings (Text Search / Place Details with rating fields = Enterprise SKU) | Places API (New) | ~1,000 free calls per Enterprise SKU per month (verify current table) | Same billing account |

**The hard limit:** about 1,000 rating lookups per month across *all users* (~33/day). Each panel
open costs one Text Search call (up to 20 rated venues); each venue detail costs one Place Details
call. API quotas will be capped at the free tier so Google can never bill; once the month's quota
is used, panels show the OSM venues without ratings and a short note.

Not free regardless of design: **Google Play developer registration, US$25 one-time.** Sideloading
the APK is free. The `.com.tr` domain renewal is already the owner's.

Switching to a web app would not help: the Places free tier is the same, and Maps JavaScript API
loads are capped (Android map loads are not).

## D5 · Build stack — assumed

AGP 9.5.2 (built-in Kotlin), Kotlin 2.4.21, Gradle 9.9.2, JDK 21 toolchain targeting Java 17 bytecode,
compileSdk 37.2, targetSdk 37, minSdk 26. Package `tr.com.spormap`.
Fonts: Fraunces and Inter variable TTFs bundled (SIL OFL 1.1, `/licenses`).
Static analysis: detekt 1.23.8 + ktlint 1.8 (Android Studio style, trailing commas allowed).
Convention plugins (`build-logic/`) are deferred until there are more than three modules (M3).
