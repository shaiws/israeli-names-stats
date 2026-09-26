# Israeli Baby Name Stats

Hebrew RTL web app for exploring first-name statistics in Israel: search by name or by Gregorian / Hebrew year, see yearly totals, top names, and trends.

**Live site:** https://shaiws.github.io/israeli-names-stats/

Deployed from this repository to GitHub Pages.

## Features

- Search a Hebrew first name (with suggestions)
- Filter by Gregorian year (for example 2020) or Hebrew year (for example 5780 or Hebrew letter forms)
- Year view: distinct names, birth counts in the dataset, top names by sex and sector
- Name view: counts over time, peak year, totals
- Sex and population-sector filters

## Data sources

| Layer | Source | Years | What you get |
|-------|--------|-------|--------------|
| Full history | Israel CBS/LAMAS (abynamesil) | 1949-2024 | Counts by name, sex, sector, and year |
| Latest trends | Population and Immigration Authority (curated top lists) | 2025 / 5786 | Top-10 ranks; 2025 includes published counts |

Notes:

- CBS omits cells with fewer than 5 babies for a name/sex/sector/year.
- There is no public CBS full table yet for births in 2025; that release usually follows about 18 months after year-end.
- Population Authority updates are labeled **Updated** in the UI and are not a full name universe.
- Hebrew/Gregorian birth-year mapping uses an approximate offset (Hebrew year is roughly Gregorian + 3760 or 3761).

## Run locally

Requirements: Node.js 20+, npm, and Python 3 (only if you re-run ingest).

`ash
npm install
npm run ingest   # rebuilds public/data from CBS / curated lists
npm run dev      # http://localhost:5173 (binds 0.0.0.0)
`

Production build:

`ash
npm run build
npm run preview
`

## Project layout

- scripts/ingest.py -- builds public/data/*.json
- src/ -- React + TypeScript + Tailwind + Recharts
- .github/workflows/deploy-pages.yml -- builds and deploys to GitHub Pages on main

Pre-built JSON under public/data/ is committed so CI can build without Python.

## License

App code may be used freely for this project. Underlying statistics belong to CBS/LAMAS and the Population and Immigration Authority; attribute those sources when you republish figures.
## Android (Flutter) app

Play package id: **il.shaiws.namesstats**

Sources live in [`mobile/`](mobile/). Store listing draft: [`mobile/STORE_LISTING.md`](mobile/STORE_LISTING.md).

### Build a release App Bundle (.aab)

Prerequisites on the machine: Flutter stable, Android SDK (`ANDROID_HOME`), JDK 17+, and a local upload keystore.

1. Place signing config at `mobile/android/key.properties` (gitignored) pointing at your upload `.jks` (see Flutter docs).
2. From `mobile/`:

```bash
flutter pub get
flutter build appbundle --release
```

Output: `mobile/build/app/outputs/bundle/release/app-release.aab`

Upload that AAB in Google Play Console (Create app → Production/Internal testing → Create new release). Do not commit `key.properties` or the keystore.
