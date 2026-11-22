/**
 * HTML for the breadcrumb and region panel. Shared by Astro (static pages, crawlers, no-JS)
 * and the client (live updates), so both always produce identical markup.
 */
import { CATEGORY_BY_ID } from "./categories.ts";
import { formatCount, upper, type Locale } from "./format.ts";
import { esc } from "./html.ts";
import {
  ancestry,
  current,
  getRegion,
  pathOf,
  type NavState,
  type RegionIndex,
  type RegionMeta,
} from "./regions.ts";
import { groupByCategory, venuesIn, type OsmVenue } from "./venues.ts";

export interface RenderContext {
  index: RegionIndex;
  locale: Locale;
  /** Site base path without trailing slash ("" or "/spormap"). */
  base: string;
}

const T = {
  tr: {
    crumbs: "Konum",
    current: "Şu anki seviye",
    turkiye: "Türkiye",
    venues: (n: string) => `${n} mekan`,
    none: "Henüz kayıtlı mekan yok",
    children: { yaka: "Yakalar", ilce: "İlçeler", mahalle: "Mahalleler", il: "" },
    updated: "Son güncelleme",
    source: "Mekan ve sınır verisi",
    noneHere: "Bu bölgede OpenStreetMap'te kayıtlı spor mekanı yok.",
    osmHeading: (name: string, n: string) => `${name} · ${n} mekan`,
    badges: { o: "Açık hava", b: "Belediye tesisi" },
  },
  en: {
    crumbs: "Location",
    current: "Current level",
    turkiye: "Türkiye",
    venues: (n: string) => `${n} venues`,
    none: "No venues recorded yet",
    children: { yaka: "Sides", ilce: "Districts", mahalle: "Neighbourhoods", il: "" },
    updated: "Last updated",
    source: "Venue and boundary data",
    noneHere: "No sports venues recorded in OpenStreetMap here.",
    osmHeading: (name: string, n: string) => `${name} · ${n} venues`,
    badges: { o: "Outdoor", b: "Municipal facility" },
  },
} as const;

export function href(ctx: RenderContext, id: string): string {
  // Trailing slash matches how GitHub Pages serves directory pages (avoids a 301 per link).
  return `${ctx.base}${pathOf(ctx.index, id)}/`;
}

export function categoryName(id: string, locale: Locale): string {
  return CATEGORY_BY_ID.get(id)?.name[locale] ?? id;
}

export function regionName(region: RegionMeta, locale: Locale): string {
  return region.name[locale] || region.name.tr;
}

export function renderBreadcrumb(ctx: RenderContext, nav: NavState): string {
  const t = T[ctx.locale];
  const chain = ancestry(ctx.index, current(nav));
  const items = [`<li><span aria-disabled="true">${esc(t.turkiye)}</span></li>`];
  chain.forEach((r, i) => {
    const name = esc(regionName(r, ctx.locale));
    items.push(
      i === chain.length - 1
        ? `<li><span aria-current="page">${name}</span></li>`
        : `<li><a href="${esc(href(ctx, r.id))}" data-region="${esc(r.id)}">${name}</a></li>`,
    );
  });
  return `<ol>${items.join("")}</ol>`;
}

const PIN_GLYPH = `<svg class="venue-row__pin" width="10" height="14" viewBox="0 0 10 14" aria-hidden="true"><path d="M5 0a5 5 0 0 0-5 5c0 3.7 5 9 5 9s5-5.3 5-9a5 5 0 0 0-5-5z"/><circle cx="5" cy="5" r="1.8" fill="var(--paper)"/></svg>`;

/** OSM venues of a district or mahalle, in category sections. Rows link to their map pins. */
export function renderVenues(ctx: RenderContext, region: RegionMeta, venues: OsmVenue[]): string {
  const t = T[ctx.locale];
  if (region.level !== "ilce" && region.level !== "mahalle") return "";
  const live = `<div class="live-slot" data-live></div>`;
  if (!venues.length) return `${live}<p class="panel-empty">${esc(t.noneHere)}</p>`;
  const showMahalle = region.level === "ilce";
  return `${live}<h2 class="list-heading">${esc(upper(t.osmHeading(regionName(region, ctx.locale), formatCount(venues.length, ctx.locale)), ctx.locale))}</h2>
    ${groupByCategory(venues)
      .map(
        (g) => `<h3 class="section-header">${esc(upper(categoryName(g.cat, ctx.locale), ctx.locale))}</h3>
      <ul class="venue-list">${g.venues
        .map((v) => {
          const badges = [...(v.f ?? "")]
            .map(
              (b) =>
                `<span class="venue-row__badge" title="${esc(t.badges[b as "o" | "b"] ?? "")}">${b === "o" ? "A" : "B"}</span>`,
            )
            .join("");
          const sub = showMahalle
            ? ctx.index.regions[v.m]
              ? regionName(ctx.index.regions[v.m]!, ctx.locale)
              : ""
            : "";
          return `<li><button type="button" class="venue-row" data-venue="${esc(v.id)}">
            <span class="venue-row__line">
              <span class="venue-row__name">${esc(v.name)}${badges}</span>
              <span class="venue-row__leader" aria-hidden="true"></span>
              ${PIN_GLYPH}
            </span>
            ${sub ? `<span class="venue-row__sub">${esc(sub)}</span>` : ""}
          </button></li>`;
        })
        .join("")}</ul>`,
      )
      .join("")}`;
}

/** Panel for a region: eyebrow path, italic title, ornament, summary, venues and child regions. */
export function renderRegionPanel(ctx: RenderContext, nav: NavState, venues: OsmVenue[] = []): string {
  const t = T[ctx.locale];
  const region = getRegion(ctx.index, current(nav));
  const eyebrow = ancestry(ctx.index, region.id)
    .slice(0, -1)
    .filter((r) => r.level !== "yaka" || region.level === "ilce" || region.level === "yaka")
    .map((r) => upper(regionName(r, ctx.locale), ctx.locale))
    .join("  ·  ");

  const top = region.top.slice(0, 3).map((c) => esc(categoryName(c, ctx.locale)));
  const summary = region.venues
    ? `${esc(t.venues(formatCount(region.venues, ctx.locale)))}${top.length ? ` · ${top.join(", ")}` : ""}`
    : esc(t.none);

  const children = region.children
    .map((id) => getRegion(ctx.index, id))
    .sort((a, b) => b.venues - a.venues || a.name.tr.localeCompare(b.name.tr, "tr"));

  const childList = children.length
    ? `<h2 class="section-header">${esc(upper(t.children[children[0]!.level], ctx.locale))}</h2>
       <ul class="venue-list">${children
         .map((c) => {
           const topCat = c.top[0] ? categoryName(c.top[0], ctx.locale) : "";
           return `<li><a class="venue-row" href="${esc(href(ctx, c.id))}" data-region="${esc(c.id)}">
             <span class="venue-row__line">
               <span class="venue-row__name">${esc(regionName(c, ctx.locale))}</span>
               <span class="venue-row__leader" aria-hidden="true"></span>
               <span class="venue-row__rating">${esc(formatCount(c.venues, ctx.locale))}</span>
             </span>
             <span class="venue-row__sub">${esc(topCat || t.none)}</span>
           </a></li>`;
         })
         .join("")}</ul>`
    : "";

  const dataDate = ctx.index.meta.osmDataAt ? new Date(ctx.index.meta.osmDataAt) : null;
  const updated = dataDate
    ? new Intl.DateTimeFormat(ctx.locale === "tr" ? "tr-TR" : "en-GB", {
        month: "long",
        year: "numeric",
      }).format(dataDate)
    : "";

  return `<header>
      ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ""}
      <h1 class="panel-title">${esc(regionName(region, ctx.locale))}</h1>
      <div class="ornament" aria-hidden="true">✦ ✦ ✦</div>
      <p class="panel-summary">${summary}</p>
    </header>
    ${renderVenues(ctx, region, venuesIn(region, venues))}
    ${childList}
    <footer class="panel-footer">
      ${region.level === "ilce" || region.level === "mahalle" ? `<p><b>A</b> ${esc(t.badges.o)} · <b>B</b> ${esc(t.badges.b)}</p>` : ""}
      <p>${esc(t.source)}: ${esc(ctx.index.meta.attribution)}</p>
      ${updated ? `<p>${esc(t.updated)}: ${esc(updated)}</p>` : ""}
    </footer>`;
}
