# İstanbul Spor Haritası

Native Android app: a hierarchical, paper-styled map of İstanbul (İl › Yaka › İlçe › Mahalle)
showing the best sport venues in each area, with live Google ratings.

Key decisions (compliance, renderer, free hosting) are in [docs/DECISIONS.md](docs/DECISIONS.md).

## Modules

| Module | Contents |
|---|---|
| `:app` | Activity, navigation, screens (M1: theme showcase) |
| `:core:designsystem` | Colours (light + dim dark), Fraunces/Inter typography, paper components: `PaperPanel`, `Eyebrow`, `PanelTitle`, `Ornament`, `SectionHeader`, `VenueRow`, `SporChip`, `Breadcrumb`, `DotGridBackground`, `RegionLabel` |
| `:core:model` | Pure Kotlin domain code (locale-aware rating/count formatting so far) |

## Build (Windows, local toolchain on E:)

```powershell
. E:\SporHaritasi\toolchain\env.ps1
.\gradlew.bat ktlintCheck detekt test :app:lintDebug :app:assembleDebug
```

`env.ps1` points `JAVA_HOME`, `ANDROID_HOME` and `GRADLE_USER_HOME` at `E:\SporHaritasi\toolchain`.
CI (`.github/workflows/ci.yml`) runs the same checks plus a minified release build.

## Milestones

- [x] M1 Project setup, theme, fonts, CI
- [ ] M2 Boundary pipeline + İstanbul → Yaka → İlçe map
- [ ] M3 Mahalle level, lazy loading, profiling
- [ ] M4 Backend (static OSM dataset + Places proxy)
- [ ] M5 Venue panel / bottom sheet
- [ ] M6 Venue detail, search, favorites, deep links
- [ ] M7 Localization, accessibility, dark mode, tablet layout
- [ ] M8 Testing, cost review, release checklist

## Attribution

Map data © OpenStreetMap contributors (ODbL). Ratings © Google. Fonts: Fraunces, Inter (SIL OFL 1.1).
