/**
 * Live Google ratings for the current district/mahalle, fetched through the Places proxy only
 * when the visitor asks (button), to stay inside the free monthly quota. Results are kept in
 * memory for this page view only and never written to storage (Google terms, DECISIONS D1).
 */
import { formatCount, formatRating, upper, type Locale } from "../lib/format.ts";
import { esc } from "../lib/html.ts";
import { rankPlaces, type Place, type RankedPlace } from "../lib/places.ts";
import type { RegionMeta } from "../lib/regions.ts";
import { regionName } from "../lib/render.ts";

const T = {
  tr: {
    button: "★ Google puanlarını göster",
    loading: "Google puanları yükleniyor…",
    heading: (name: string, n: number) => `${name} · Google'da en iyi ${n} mekan`,
    none: "Google'da bu bölge için yeterince değerlendirilmiş spor mekanı bulunamadı.",
    quota: "Bu ayın ücretsiz Google sorgu kotası doldu. OpenStreetMap listesi gösteriliyor.",
    error: "Google puanları şu an alınamadı.",
    attribution: "Puanlar ve değerlendirme sayıları: Google Haritalar",
    open: "Google Haritalar'da aç",
    reviews: "değerlendirme",
  },
  en: {
    button: "★ Show Google ratings",
    loading: "Loading Google ratings…",
    heading: (name: string, n: number) => `${name} · top ${n} on Google`,
    none: "Google has no sufficiently reviewed sports venues here.",
    quota: "This month's free Google quota is used up. Showing the OpenStreetMap list.",
    error: "Google ratings are unavailable right now.",
    attribution: "Ratings and review counts: Google Maps",
    open: "Open in Google Maps",
    reviews: "reviews",
  },
} as const;

/** Generic sport query; category-specific queries arrive with the filter chips (W5). */
const QUERY = "spor tesisi";

export interface LiveRatings {
  /** Renders the button (or cached results) into the panel's live slot for this region. */
  mount(slot: HTMLElement, region: RegionMeta): void;
}

export function createLiveRatings(opts: {
  proxyUrl: string | undefined;
  locale: Locale;
  /** Called with the ranked places when results are shown (pins), or [] when cleared. */
  onResults: (places: RankedPlace[]) => void;
}): LiveRatings {
  const t = T[opts.locale];
  const memory = new Map<string, RankedPlace[]>(); // this page view only

  const render = (slot: HTMLElement, region: RegionMeta, places: RankedPlace[]) => {
    if (!places.length) {
      slot.innerHTML = `<p class="live-note">${esc(t.none)}</p>`;
      return;
    }
    slot.innerHTML = `<h2 class="list-heading">${esc(upper(t.heading(regionName(region, opts.locale), places.length), opts.locale))}</h2>
      <ul class="venue-list">${places
        .map(
          (p) => `<li><button type="button" class="venue-row" data-venue="${esc(p.id)}">
            <span class="venue-row__line">
              <span class="venue-row__name">${esc(p.name)}</span>
              <span class="venue-row__leader" aria-hidden="true"></span>
              <span class="venue-row__rating">${esc(formatRating(p.rating, opts.locale))}</span>
              <span class="venue-row__count">(${esc(formatCount(p.count, opts.locale))})</span>
            </span>
            <span class="venue-row__sub">${esc(p.address)}${
              p.mapsUrl
                ? ` · <a href="${esc(p.mapsUrl)}" target="_blank" rel="noopener" class="live-link">${esc(t.open)} ↗</a>`
                : ""
            }</span>
          </button></li>`,
        )
        .join("")}</ul>
      <p class="live-attribution">${esc(t.attribution)}</p>`;
  };

  return {
    mount(slot, region) {
      if (!opts.proxyUrl || (region.level !== "ilce" && region.level !== "mahalle")) return;
      const cached = memory.get(region.id);
      if (cached) {
        render(slot, region, cached);
        opts.onResults(cached);
        return;
      }
      slot.innerHTML = `<button type="button" class="live-button">${esc(t.button)}</button>`;
      slot.querySelector("button")!.addEventListener("click", async () => {
        slot.innerHTML = `<p class="live-note" role="status">${esc(t.loading)}</p>`;
        try {
          const res = await fetch(`${opts.proxyUrl!.replace(/\/$/, "")}/v1/search`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: QUERY, bbox: region.bbox, lang: opts.locale }),
          });
          if (res.status === 503) throw new Error("quota");
          if (!res.ok) throw new Error(String(res.status));
          const { places } = (await res.json()) as { places: Place[] };
          const ranked = rankPlaces(places);
          memory.set(region.id, ranked);
          if (!slot.isConnected) return; // user navigated away meanwhile
          render(slot, region, ranked);
          opts.onResults(ranked);
        } catch (error) {
          if (!slot.isConnected) return;
          slot.innerHTML = `<p class="live-note">${esc((error as Error).message === "quota" ? t.quota : t.error)}</p>`;
        }
      });
    },
  };
}
