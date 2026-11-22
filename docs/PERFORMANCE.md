# Performance

Budgets and measurements for the map. Re-run `node pipeline/stats.ts` after data changes and
open any page with `?perf` on a real phone to see fps, worst frame, tap-to-settled time and
data downloads.

## Data budget (gzipped, as served by GitHub Pages)

| File                                                            | Size                               | Loaded                                       |
| --------------------------------------------------------------- | ---------------------------------- | -------------------------------------------- |
| `data/regions.json`                                             | ~60 KB                             | once, all pages                              |
| `data/geo/overview.geojson` (İl, Yaka, 39 İlçe; 11.3k vertices) | ~61 KB                             | once                                         |
| `data/geo/mahalle/<ilce>.geojson`                               | 4–24 KB (Kadıköy 4 KB, Şile 24 KB) | on first drill-in, prefetched on hover/press |
| all 39 mahalle files together (964 polygons, 50.0k vertices)    | 238 KB                             | never all at once                            |

Mahalle simplification tolerance scales with district size (`sqrt(area)/300`, 10–45 m): each
district is seen fitted to the screen, so rural districts need far less detail than central ones.

## Runtime (W3, 2026-11-22)

Measured in the desktop app's browser pane (development build, raster map, ~480 px wide map),
scripted: drill-in = link click until the map's `idle` event; pan/zoom = 2.5 s of `panBy`/`setZoom`
every 16 ms.

|                                  | Before W3            | After W3             |
| -------------------------------- | -------------------- | -------------------- |
| Drill into a Yaka                | 1,209 ms             | 357 ms               |
| Drill into Şile (incl. download) | 1,890 ms             | 317 ms               |
| Pan over Şile, worst frame       | 778 ms               | 9 ms (120 fps)       |
| Zoom over Çatalca                | 44 fps, worst 992 ms | 80 fps, worst 100 ms |

What changed: size-adaptive simplification (−44% vertices), features added to each Data layer
once and toggled by style instead of removed/re-added on every tap, hover restyles only the
hovered feature, per-district loads de-duplicated and prefetched.

**Not yet measured on a mid-range phone.** The target is 60 fps pan/zoom; use `?perf` on a real
device (e.g. a 2–3 year old mid-range Android) and record the numbers here.

## Vector map (Map ID) — default since 2026-11-22

The Map ID uses the cloud style `spormap-paper` (light variant; every feature hidden), so only our
own regions show on the page's paper and dot grid. The site always requests the light scheme and
draws its own dark mode. `?raster` forces the raster renderer; browsers without WebGL fall back
to it automatically.

Camera moves use our own 600 ms ease (`src/lib/camera.ts`, honours reduced motion). Measured on
the live site in the browser pane (frames during the camera move into each region):

| Drill target        | fps | worst frame |
| ------------------- | --- | ----------- |
| Anadolu Yakası      | 119 | 33 ms       |
| Kadıköy             | 118 | 33 ms       |
| İstanbul (zoom out) | 120 | 17 ms       |
| Çatalca             | 119 | 25 ms       |

Tap-to-settled: 530 ms on average (the 600 ms ease minus the first frame). With Google's default
style still attached the same map ran at ~17 fps, so the cloud style matters for performance too.
