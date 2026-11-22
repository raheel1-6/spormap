# İstanbul Spor Haritası

A paper-styled, hierarchical map of İstanbul (İl › Yaka › İlçe › Mahalle) showing the best
sport venues in each area with live Google ratings. Static site on GitHub Pages at
[raheel1-6.github.io/spormap](https://raheel1-6.github.io/spormap/) (custom domain later).

Key decisions (platform, Google terms, free-tier limits) are in [docs/DECISIONS.md](docs/DECISIONS.md).

## Develop

```powershell
. E:\SporHaritasi\toolchain\env.ps1
npm install
npm run dev       # http://localhost:4321
npm run verify    # format check, lint, type check, tests, build
npm run data      # rebuild OSM boundaries + venue counts (add -- --refresh to refetch)
```

## Layout

| Path                        | Contents                                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/styles/tokens.css`     | Colour tokens (light + dimmed dark), fonts, base styles                                        |
| `src/styles/components.css` | Paper components as classes, shared by Astro templates and client scripts                      |
| `src/components/`           | `PaperPanel`, `PanelHeader`, `SectionHeader`, `VenueRow`, `Chip`, `Breadcrumb`                 |
| `src/lib/format.ts`         | Locale-aware rating/count formatting, Turkish uppercasing                                      |
| `src/pages/`                | `index.astro` + `[...path].astro`: one static page per region; `tasarim.astro`: design preview |
| `src/scripts/`              | Client: `app.ts` (state, URL, panel), `map/view.ts` (Google map, choropleth, labels)           |
| `src/lib/`                  | Shared logic: hierarchy (`regions.ts`), geometry, labels, categories, HTML rendering           |
| `proxy/`                    | Cloudflare Worker: Places API proxy for live ratings (docs/PROXY.md)                           |
| `pipeline/`                 | OSM → GeoJSON + region index (`npm run data`)                                                  |
| `public/data/`              | Generated: `regions.json`, `geo/overview.geojson`, `geo/mahalle/*`, `venues/*`                 |
| `.github/workflows/`        | `ci.yml` (branches, PRs) and `deploy.yml` (main → GitHub Pages)                                |

## Milestones

- [x] W1 Setup, theme, fonts, CI, Pages deploy
- [x] W2 Boundary pipeline + İstanbul → Yaka → İlçe map (mahalle drill-in included)
- [x] W3 Mahalle level, lazy loading, performance (see docs/PERFORMANCE.md)
- [x] W4 OSM venue lists + pins, Places proxy (deploy: docs/PROXY.md)
- [ ] W5 Venue panel / bottom sheet, chips, ranking, tooltip
- [ ] W6 Venue detail, search, favorites, region URLs
- [ ] W7 English, accessibility, dark mode polish, layouts
- [ ] W8 Tests, cost review, launch checklist

## Attribution

Map data © OpenStreetMap contributors (ODbL). Ratings © Google. Fonts: Fraunces, Inter (SIL OFL 1.1).
