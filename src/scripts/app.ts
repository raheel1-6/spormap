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

  const titleFor = (id: string) => {
    const r = getRegion(index, id);
    const name = regionName(r, locale);
    return locale === "tr"
      ? `${name} spor mekanları · İstanbul Spor Haritası`
      : `Sports venues in ${name} · Istanbul Sports Map`;
  };

  function render(next: NavState, { push = true } = {}) {
    const changed = current(next) !== current(nav) || next.focus !== nav.focus;
    nav = next;
    const swap = () => {
      panelBody.innerHTML = renderRegionPanel(ctx, nav);
      crumbs.innerHTML = renderBreadcrumb(ctx, nav);
      panelBody.closest("[data-panel]")?.scrollTo({ top: 0 });
      crumbs.scrollLeft = crumbs.scrollWidth;
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
    if (push && changed) history.pushState({ id }, "", href(ctx, id));
    hideTooltip();
    void map?.show(nav);
  }

  // Links inside the panel and breadcrumb navigate in place.
  shell.addEventListener("click", (e) => {
    const link = (e.target as Element).closest<HTMLAnchorElement>("a[data-region]");
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    render(goTo(index, link.dataset["region"]!));
  });

  window.addEventListener("popstate", () => {
    const id = resolvePath(index, location.pathname.slice(base.length)) ?? index.root;
    render(goTo(index, id), { push: false });
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !(e.target instanceof HTMLInputElement)) render(up(index, nav));
  });

  // ---------- tooltip (hover on desktop, long-press on touch) ----------
  function showTooltip(id: string, x: number, y: number) {
    const r = index.regions[id];
    if (!r) return;
    const cats = r.top.slice(0, 3).map((c) => esc(upper(categoryName(c, locale), locale)));
    tooltip.innerHTML = `<strong class="tooltip__name">${esc(regionName(r, locale))}</strong>
      <span class="tooltip__count">${esc(formatCount(r.venues, locale))} ${locale === "tr" ? "mekan" : "venues"}</span>
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

  // ---------- map ----------
  try {
    const maps = await loadGoogleMaps(import.meta.env.PUBLIC_GOOGLE_MAPS_KEY, locale);
    map = new MapView(mapEl, maps, {
      index,
      locale,
      dataUrl: `${base}/data/`,
      onTap: (id) => render(tap(index, nav, id)),
      onLongPress: showTooltip,
      onHover: (id, x, y) =>
        id && window.matchMedia("(hover: hover)").matches ? showTooltip(id, x, y) : hideTooltip(),
      padding: overlayPadding,
    });
    if (import.meta.env.DEV)
      (window as unknown as { __spormap: unknown }).__spormap = { map: map.map, index };
    await map.loadOverview();
    await map.show(nav, { animate: false });
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
