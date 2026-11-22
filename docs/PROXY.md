# Places proxy (live Google ratings)

`proxy/` is a Cloudflare Worker that holds the Places API key and forwards a narrow set of
searches to **Places API (New) — Text Search**. The site works without it (OpenStreetMap lists
and pins only); with it, district and mahalle panels get a **★ Google puanlarını göster** button.

## What it allows

- `POST /v1/search` with `{ query, bbox, lang }` from allowed origins only
  (`ALLOWED_ORIGINS` in `wrangler.toml`).
- `query` must be one of the sport keywords in `src/data/categories.json` (or "spor tesisi").
- `bbox` must lie inside İstanbul and span at most 0.7° (any district fits; the whole city doesn't).
- 20 searches per minute per visitor IP (Workers rate-limit binding, free).
- Optional Cloudflare Turnstile check when `TURNSTILE_SECRET` is set.
- Responses are `Cache-Control: no-store`; nothing is stored anywhere (Google terms, D1).

Field mask: `id, displayName, rating, userRatingCount, location, formattedAddress, primaryType,
googleMapsUri`. `rating`/`userRatingCount` make each call a **Text Search Enterprise** request.

## Cost: keep it free

1. The visitor has to press the button, and results are reused while the page stays open, so
   browsing alone costs nothing.
2. **Hard cap, enforced by the proxy:** a global counter (SQLite-backed Durable Object, free on
   Workers) counts every search sent to Google and refuses once **30 per UTC day** or **850 per
   UTC month** is reached (`DAILY_LIMIT` / `MONTHLY_LIMIT` in `wrangler.toml`; `"0"` switches
   ratings off). Only requests that pass every other check are counted, and without the counter
   binding the proxy never calls Google (fails closed). ~1,000 Text Search (Enterprise) calls a
   month are free; check the current pricing table and lower the limits if that changes. When
   the cap is hit, the panel says so and keeps the OSM list.
3. Google's own Places quota page may say "not adjustable". That's fine: the proxy cap above is
   what keeps you in the free tier. If you _can_ lower _Text Search requests per day_, set it to
   30 as a second line of defence.
4. Budget alert at $1 (Billing → Budgets & alerts).

## One-time setup (owner)

1. **Enable the API:** Google Cloud → APIs & Services → Library → **Places API (New)** → Enable.
2. **Create a server key** (separate from the browser Maps key): Credentials → Create
   credentials → API key → _API restrictions_: **Places API (New)** only. Leave application
   restrictions as "None" (the Worker calls from Cloudflare's servers). Copy it.
3. **Cloudflare account:** sign up at dash.cloudflare.com (free, no card).
4. **Deploy** from this repo in PowerShell. Windows blocks `.ps1` scripts by default, so call
   `npx.cmd` by its full path rather than loading `env.ps1`:

   ```powershell
   cd E:\SporHaritasi\spormap\proxy
   & "E:\SporHaritasi\toolchain\node-v26.13.1-win-x64\npx.cmd" wrangler@4 login
   & "E:\SporHaritasi\toolchain\node-v26.13.1-win-x64\npx.cmd" wrangler@4 secret put PLACES_API_KEY
   & "E:\SporHaritasi\toolchain\node-v26.13.1-win-x64\npx.cmd" wrangler@4 deploy
   ```

   `wrangler login` opens a browser to authorise; `secret put` asks you to paste the server key
   (it's stored encrypted in Cloudflare, never in the repo). `deploy` prints the Worker URL,
   e.g. `https://spormap-places.<your-subdomain>.workers.dev`.

5. **Tell the site:** GitHub → repo Settings → Secrets and variables → Actions → Variables →
   `PLACES_PROXY_URL` = the Worker URL. The next deploy shows the ratings button.

## Tests

`npx vitest run proxy` — origin lock, keyword allowlist, bbox limits, request shape, field
mapping, quota handling, rate limit and Turnstile.
