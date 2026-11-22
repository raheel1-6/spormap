/**
 * Client entry: one region index, one navigation state, three views (map, panel, breadcrumb)
 * kept in sync, and the URL mirroring the region path. Static HTML is already correct for the
 * initial region, so nothing here is needed for crawlers or no-JS visitors.
 */
import { formatCount, upper, type Locale } from "../lib/format.ts";
import { esc } from "../lib/html.ts";
import {
  current,
  getRegion,
  goTo,
  resolvePath,
  tap,
  up,
  type NavState,
  type RegionIndex,
} from "../lib/regions.ts";
import {
  categoryName,
  href,
  regionName,
  renderBreadcrumb,
  renderRegionPanel,
  type RenderContext,
} from "../lib/render.ts";
import { loadGoogleMaps } from "./map/google.ts";
import { MapView } from "./map/view.ts";
import { createPerfProbe } from "./perf.ts";
import { GOOGLE_MAP_ID, forceRaster } from "../config.ts";
import { districtOf, venuesIn, type OsmVenue } from "../lib/venues.ts";
import { createLiveRatings } from "./live.ts";
import { filterVenues, parseSport, regionCount, withSport, type Sport } from "../lib/filter.ts";

const shell = document.querySelector<HTMLElement>("[data-app]");
if (shell) void boot(shell);

async function boot(shell: HTMLElement) {
  const locale = (shell.dataset["locale"] ?? "tr") as Locale;
  const base = shell.dataset["base"] ?? "";
  const panelBody = shell.querySelector<HTMLElement>("[data-panel-body]")!;
  const crumbs = shell.querySelector<HTMLElement>("[data-crumbs]")!;
  const tooltip = shell.querySelector<HTMLElement>("[data-tooltip]")!;
  const mapEl = shell.querySelector<HTMLElement>("[data-map]")!;

  const index = (await (await fetch(`${base}/data/regions.json`)).json()) as RegionIndex;
  const ctx: RenderContext = { index, locale, base };
  let nav: NavState = goTo(index, shell.dataset["region"] ?? index.root);
  let map: MapView | null = null;
  const perf = createPerfProbe();
  // Sport filter (?spor=halisaha): survives drilling up/down and is part of the URL.
  let sport: Sport = parseSport(location.search);
  let chipsExpanded = false;
  const panelHtml = (venues: OsmVenue[]) => renderRegionPanel(ctx, nav, venues, { sport, chipsExpanded });
  const cachedVenues = () => {
    const d = currentDistrict();
    return (d && venueCache.get(d)) || [];
  };
  const urlFor = (id: string) => href(ctx, id) + withSport(location.search, sport);

  const titleFor = (id: string) => {
    const r = getRegion(index, id);
    const name = regionName(r, locale);
    return locale === "tr"
      ? `${name} spor mekanları · İstanbul Spor Haritası`
      : `Sports venues in ${name} · Istanbul Sports Map`;
  };

  // ---------- OSM venues: one static file per district, fetched once ----------
  const venueFiles = new Map<string, Promise<OsmVenue[]>>();
  const venueCache = new Map<string, OsmVenue[]>();
  function districtVenues(districtId: string): Promise<OsmVenue[]> {
    let pending = venueFiles.get(districtId);
    if (!pending) {
      pending = fetch(`${base}/data/venues/${districtId}.json`)
        .then((r) => (r.ok ? (r.json() as Promise<OsmVenue[]>) : []))
        .then((list) => (venueCache.set(districtId, list), list));
      pending.catch(() => venueFiles.delete(districtId));
      venueFiles.set(districtId, pending);
    }
    return pending;
  }
  const currentDistrict = () => districtOf(index, getRegion(index, current(nav)));

  // Live Google ratings (only when a proxy URL is configured at build time).
  const live = createLiveRatings({
    proxyUrl: import.meta.env.PUBLIC_PLACES_PROXY_URL,
    locale,
    onResults: (places) => void map?.setPins(places),
  });
  const mountLive = () => {
    const slot = panelBody.querySelector<HTMLElement>("[data-live]");
    if (slot) live.mount(slot, getRegion(index, current(nav)), sport);
  };

  /** Panel venues + map pins for the current region; re-renders the panel once data arrives. */
  async function syncVenues() {
    const region = getRegion(index, current(nav));
    const district = currentDistrict();
    if (!district) {
      void map?.setPins([]);
      return;
    }
    const hadData = venueCache.has(district);
    const list = await districtVenues(district).catch(() => []);
    if (current(nav) !== region.id) return; // user moved on
    if (!hadData) {
      panelBody.innerHTML = panelHtml(list);
      mountLive();
    }
    void map?.setPins(filterVenues(venuesIn(region, list), sport));
  }

  /** Switches the sport filter: panel, map colours, pins, Google search and URL all follow. */
  function setSport(next: Sport) {
    if (next === sport) return;
    sport = next;
    panelBody.innerHTML = panelHtml(cachedVenues());
    mountLive();
    map?.setSport(sport);
    void syncVenues();
    hideTooltip();
    history.pushState({ id: current(nav) }, "", urlFor(current(nav)));
  }

  function selectVenue(id: string | null, { scroll = false } = {}) {
    for (const row of panelBody.querySelectorAll<HTMLElement>(".venue-row--active"))
      row.classList.remove("venue-row--active");
    map?.highlightPin(id);
    if (!id) return;
    const row = panelBody.querySelector<HTMLElement>(`[data-venue="${CSS.escape(id)}"]`);
    row?.classList.add("venue-row--active");
    if (scroll) row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function render(next: NavState, { push = true } = {}) {
    const changed = current(next) !== current(nav) || next.focus !== nav.focus;
    if (changed) perf?.navigationStarted();
    nav = next;
    if (changed) chipsExpanded = false;
    const swap = () => {
      panelBody.innerHTML = panelHtml(cachedVenues());
      crumbs.innerHTML = renderBreadcrumb(ctx, nav);
      panelBody.closest("[data-panel]")?.scrollTo({ top: 0 });
      crumbs.scrollLeft = crumbs.scrollWidth;
      mountLive();
    };
    // Crossfade the panel (View Transitions where supported; reduced motion disables it in CSS).
    if (changed && !document.hidden && "startViewTransition" in document) {
      // Transitions reject when skipped (e.g. tab hidden); the swap still happens.
      const t = document.startViewTransition(swap);
      t.finished.catch(() => {});
      t.ready.catch(() => {});
    } else swap();
    const id = current(nav);
    document.title = titleFor(id);
    if (push && changed) history.pushState({ id }, "", urlFor(id));
    hideTooltip();
    void map?.show(nav);
    void syncVenues();
  }

  // Panel venue rows ↔ map pins: hover/focus emphasises the pin, click selects it.
  panelBody.addEventListener("pointerover", (e) => {
    const row = (e.target as Element).closest<HTMLElement>("[data-venue]");
    map?.highlightPin(row?.dataset["venue"] ?? null);
  });
  panelBody.addEventListener("pointerleave", () =>
    map?.highlightPin(panelBody.querySelector<HTMLElement>(".venue-row--active")?.dataset["venue"] ?? null),
  );
  panelBody.addEventListener("click", (e) => {
    const target = e.target as Element;
    const row = target.closest<HTMLElement>("[data-venue]");
    if (row) selectVenue(row.dataset["venue"]!);
    // Sport chips are real links (?spor=…) so they work without JS; with JS they filter in place.
    const chip = target.closest<HTMLAnchorElement>("a[data-sport]");
    if (chip && !(e as MouseEvent).metaKey && !(e as MouseEvent).ctrlKey) {
      e.preventDefault();
      setSport(chip.dataset["sport"] || null);
    }
    if (target.closest("[data-chips-more]")) {
      chipsExpanded = true;
      panelBody.innerHTML = panelHtml(cachedVenues());
      mountLive();
      panelBody.querySelector<HTMLElement>(".sport-chips .chip:last-child")?.focus();
    }
  });

  // Links inside the panel and breadcrumb navigate in place.
  shell.addEventListener("click", (e) => {
    const link = (e.target as Element).closest<HTMLAnchorElement>("a[data-region]");
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    render(goTo(index, link.dataset["region"]!));
  });

  // Warm a district's mahalle file as soon as its link is hovered or focused.
  const warm = (e: Event) => {
    const link = (e.target as Element).closest<HTMLAnchorElement>("a[data-region]");
    if (link) map?.prefetch(link.dataset["region"]!);
  };
  shell.addEventListener("pointerover", warm);
  shell.addEventListener("focusin", warm);

  window.addEventListener("popstate", () => {
    const id = resolvePath(index, location.pathname.slice(base.length)) ?? index.root;
    const urlSport = parseSport(location.search);
    if (urlSport !== sport) {
      sport = urlSport;
      map?.setSport(sport);
    }
    render(goTo(index, id), { push: false });
    // render() skips the panel when only the filter changed; refresh it for that case.
    panelBody.innerHTML = panelHtml(cachedVenues());
    mountLive();
    void syncVenues();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !(e.target instanceof HTMLInputElement)) render(up(index, nav));
  });

  // ---------- tooltip (hover on desktop, long-press on touch) ----------
  function showTooltip(id: string, x: number, y: number) {
    const r = index.regions[id];
    if (!r) return;
    const cats = r.top.slice(0, 3).map((c) => esc(upper(categoryName(c, locale), locale)));
    const what = sport
      ? categoryName(sport, locale).toLocaleLowerCase("tr-TR")
      : locale === "tr"
        ? "mekan"
        : "venues";
    tooltip.innerHTML = `<strong class="tooltip__name">${esc(regionName(r, locale))}</strong>
      <span class="tooltip__count">${esc(formatCount(regionCount(r, sport), locale))} ${esc(what)}</span>
      ${cats.length ? `<span class="tooltip__cats">${cats.join(" · ")}</span>` : ""}`;
    tooltip.hidden = false;
    const rect = tooltip.getBoundingClientRect();
    const left = Math.min(Math.max(8, x + 14), window.innerWidth - rect.width - 8);
    const top = Math.min(Math.max(8, y + 14), window.innerHeight - rect.height - 8);
    tooltip.style.transform = `translate(${left}px, ${top}px)`;
  }
  function hideTooltip() {
    tooltip.hidden = true;
  }

  // Arrived with ?spor=…: the static panel shows all sports, so redraw it filtered.
  if (sport) {
    panelBody.innerHTML = panelHtml(cachedVenues());
    mountLive();
  }

  // ---------- map ----------
  try {
    const maps = await loadGoogleMaps(import.meta.env.PUBLIC_GOOGLE_MAPS_KEY, locale);
    map = new MapView(mapEl, maps, {
      mapId: GOOGLE_MAP_ID,
      raster: forceRaster(),
      index,
      locale,
      dataUrl: `${base}/data/`,
      onTap: (id) => render(tap(index, nav, id)),
      onLongPress: showTooltip,
      onHover: (id, x, y) =>
        id && window.matchMedia("(hover: hover)").matches ? showTooltip(id, x, y) : hideTooltip(),
      padding: overlayPadding,
      onPinClick: (id) => selectVenue(id, { scroll: true }),
    });
    // Debug handle for profiling (dev server, or ?perf on the live site).
    if (import.meta.env.DEV || perf)
      (window as unknown as { __spormap: unknown }).__spormap = { map: map.map, index };
    perf?.attach(map.map);
    map.setSport(sport);
    await map.loadOverview();
    await map.show(nav, { animate: false });
    void syncVenues();
    shell.classList.add("map-ready");
  } catch (error) {
    console.error(error);
    shell.classList.add("map-failed");
  }
}

/**
 * Keeps regions clear of the search bar, breadcrumb and zoom control. On wide screens the panel
 * is its own grid column beside the map; on phones the map ends above the bottom sheet.
 */
function overlayPadding(): google.maps.Padding {
  const wide = window.matchMedia("(min-width: 768px)").matches;
  if (wide) return { top: 76, left: 24, bottom: 76, right: 64 };
  return { top: 72, left: 12, right: 12, bottom: 100 };
}
