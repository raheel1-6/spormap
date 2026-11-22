/**
 * Choropleth map on Google Maps: children of the focused region filled by their top sport
 * category, focused region outlined in rust with a soft glow, same-level neighbours dimmed,
 * faint district outlines for orientation, and collision-aware HTML labels.
 */
import type { Feature, FeatureCollection } from "geojson";
import { cameraFor, easeInOutCubic, interpolateCamera } from "../../lib/camera.ts";
import { CATEGORY_BY_ID, EMPTY_COLOR } from "../../lib/categories.ts";
import { upper, type Locale } from "../../lib/format.ts";
import { placeLabels, type LabelCandidate } from "../../lib/labels.ts";
import { getRegion, type NavState, type RegionIndex, type RegionMeta } from "../../lib/regions.ts";
import { categoryName, regionName } from "../../lib/render.ts";

export interface MapViewOptions {
  /** Cloud Map ID: switches to the vector renderer (cloud style + eased camera). */
  mapId?: string | undefined;
  index: RegionIndex;
  locale: Locale;
  /** Base URL for data files, ending in "/". */
  dataUrl: string;
  onTap: (id: string) => void;
  onLongPress: (id: string, x: number, y: number) => void;
  onHover: (id: string | null, x: number, y: number) => void;
  /** Space covered by overlays (panel, search, breadcrumb) to keep regions clear of. */
  padding: () => google.maps.Padding;
}

const LONG_PRESS_MS = 500;
const CAMERA_MS = 600;
const MIN_ZOOM = 7;
const MAX_ZOOM = 17;
// Keeps panning near İstanbul; generous so padded fits of edge regions (Şile, Silivri) are never clamped.
const ISTANBUL_RESTRICTION = { west: 26.6, south: 39.9, east: 31.2, north: 42.3 };

type Role = "context" | "fill" | "ghost" | "glow" | "outline";

export class MapView {
  readonly map: google.maps.Map;
  private readonly layers: Record<Role, google.maps.Data>;
  private readonly geometry = new Map<string, Feature>();
  private readonly districtLoads = new Map<string, Promise<void>>();
  private readonly labels: ReturnType<typeof createLabelLayer>;
  private nav: NavState | null = null;
  private hovered: string | null = null;
  private pressTimer: number | undefined;
  private suppressClick = false;
  private scheme: "light" | "dark" = "light";
  private readonly added: Record<Role, Set<string>> = {
    context: new Set(),
    fill: new Set(),
    ghost: new Set(),
    glow: new Set(),
    outline: new Set(),
  };
  private visible: Record<Role, Set<string>> = {
    context: new Set(),
    fill: new Set(),
    ghost: new Set(),
    glow: new Set(),
    outline: new Set(),
  };
  /** Resolves on the map's first "idle": fitting bounds earlier uses a stale viewport size. */
  private readonly ready: Promise<void>;
  private animation = 0;

  constructor(
    element: HTMLElement,
    private readonly maps: typeof google.maps,
    private readonly opts: MapViewOptions,
  ) {
    this.map = new maps.Map(element, {
      center: { lat: 41.05, lng: 28.95 },
      zoom: 9,
      minZoom: MIN_ZOOM,
      // Smooth fits: without fractional zoom a wide region snaps to the next whole level and gets clipped.
      isFractionalZoomEnabled: true,
      maxZoom: MAX_ZOOM,
      backgroundColor: "transparent",
      disableDefaultUI: true,
      zoomControl: true,
      zoomControlOptions: { position: maps.ControlPosition.RIGHT_TOP },
      clickableIcons: false,
      keyboardShortcuts: true,
      gestureHandling: "greedy",
      // Flat, north-up paper map: tilt distorts region shapes and rotation turns the labels.
      // (Only vector maps can tilt/rotate; this keeps them off once a Map ID is added.)
      tiltInteractionEnabled: false,
      headingInteractionEnabled: false,
      rotateControl: false,
      // The Map ID only has a light cloud style (everything hidden). Always request it; the site
      // does its own dark mode on top, so Google must never switch to its default dark street map.
      colorScheme: maps.ColorScheme.LIGHT,
      restriction: { latLngBounds: ISTANBUL_RESTRICTION, strictBounds: false },
      // No street basemap: every Google feature hidden, the page's paper + dot grid shows through.
      // No street basemap. Raster: every Google feature hidden here, the page paper + dot grid shows
      // through. Vector (Map ID): this is ignored and the Map ID's cloud style must hide everything.
      ...(opts.mapId ? { mapId: opts.mapId } : { styles: [{ stylers: [{ visibility: "off" }] }] }),
    });

    const layer = (zIndex: number, clickable: boolean) => {
      const data = new maps.Data({ map: this.map });
      data.setStyle({ zIndex, clickable });
      return data;
    };
    this.layers = {
      context: layer(1, true),
      fill: layer(2, true),
      ghost: layer(3, false),
      glow: layer(4, false),
      outline: layer(5, false),
    };

    for (const role of ["context", "fill"] as const) {
      const data = this.layers[role];
      data.addListener("click", (e: google.maps.Data.MouseEvent) => {
        if (this.suppressClick) {
          this.suppressClick = false;
          return;
        }
        this.opts.onTap(String(e.feature.getProperty("id")));
      });
      // Hover touches only the hovered feature (overrideStyle) instead of restyling every feature.
      data.addListener("mouseover", (e: google.maps.Data.MouseEvent) => {
        this.hovered = String(e.feature.getProperty("id"));
        this.prefetch(this.hovered);
        data.revertStyle();
        data.overrideStyle(e.feature, role === "fill" ? { strokeWeight: 2.5 } : { fillOpacity: 0.6 });
        const p = pointerOf(e);
        this.opts.onHover(this.hovered, p.x, p.y);
      });
      data.addListener("mousemove", (e: google.maps.Data.MouseEvent) => {
        const p = pointerOf(e);
        this.opts.onHover(this.hovered, p.x, p.y);
      });
      data.addListener("mouseout", () => {
        this.hovered = null;
        data.revertStyle();
        this.opts.onHover(null, 0, 0);
      });
      // Long-press (touch) shows the tooltip instead of drilling in.
      data.addListener("mousedown", (e: google.maps.Data.MouseEvent) => {
        window.clearTimeout(this.pressTimer);
        const id = String(e.feature.getProperty("id"));
        this.prefetch(id); // a press usually precedes a tap
        const p = pointerOf(e);
        this.pressTimer = window.setTimeout(() => {
          this.suppressClick = true;
          this.opts.onLongPress(id, p.x, p.y);
        }, LONG_PRESS_MS);
      });
      data.addListener("mouseup", () => window.clearTimeout(this.pressTimer));
    }
    this.map.addListener("dragstart", () => {
      window.clearTimeout(this.pressTimer);
      window.cancelAnimationFrame(this.animation); // the user takes over the camera
    });

    this.labels = createLabelLayer(maps, this);
    this.labels.setMap(this.map);

    this.ready = new Promise((resolve) => maps.event.addListenerOnce(this.map, "idle", () => resolve()));
    // Re-fit the focused region when the map's size changes (rotation, window resize, sheet height).
    let resizeTimer: number | undefined;
    new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => this.fit(), 150);
    }).observe(element);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyScheme = () => {
      const forced = document.documentElement.dataset["theme"];
      this.scheme = forced === "dark" || (forced !== "light" && media.matches) ? "dark" : "light";
      this.restyle();
    };
    media.addEventListener("change", applyScheme);
    applyScheme();
  }

  async loadOverview(): Promise<void> {
    const fc = await fetchJson<FeatureCollection>(`${this.opts.dataUrl}geo/overview.geojson`);
    for (const f of fc.features) this.geometry.set(String(f.properties?.["id"]), f);
    this.setFeatures(
      "ghost",
      this.regionsAtLevel("ilce").map((r) => r.id),
    );
  }

  /** Mahalle geometry is split per district and fetched on first drill-in (or earlier, see prefetch). */
  private ensureDistrict(districtId: string): Promise<void> {
    let pending = this.districtLoads.get(districtId);
    if (!pending) {
      pending = fetchJson<FeatureCollection>(`${this.opts.dataUrl}geo/mahalle/${districtId}.geojson`).then(
        (fc) => {
          for (const f of fc.features) this.geometry.set(String(f.properties?.["id"]), f);
        },
      );
      pending.catch(() => this.districtLoads.delete(districtId)); // allow a retry after a network error
      this.districtLoads.set(districtId, pending);
    }
    return pending;
  }

  /** Warms the district's mahalle file when the user is likely to open it (hover, long-press). */
  prefetch(id: string): void {
    if (this.opts.index.regions[id]?.level === "ilce") void this.ensureDistrict(id).catch(() => {});
  }

  async show(nav: NavState, { animate = true } = {}): Promise<void> {
    const { index } = this.opts;
    const focus = getRegion(index, nav.focus);
    if (focus.level === "ilce") await this.ensureDistrict(focus.id);
    this.nav = nav;

    const siblings = focus.parent
      ? this.regionsAtLevel(focus.level)
          .filter((r) => r.id !== focus.id)
          .map((r) => r.id)
      : [];
    this.setFeatures("context", siblings);
    this.setFeatures("fill", focus.children);
    this.setFeatures("glow", focus.parent ? [focus.id] : []);
    this.setFeatures("outline", focus.parent ? [focus.id] : []);
    this.restyle();

    await this.ready;
    this.fit(animate);
    // First load only: if the renderer was still initialising, the first camera move can be
    // dropped. Re-fit once when the map settles (no-op when it already fits).
    if (!animate) this.maps.event.addListenerOnce(this.map, "idle", () => this.fit(false));
    this.labels.update(
      focus.children.map((id) => getRegion(index, id)),
      nav.selected,
    );
  }

  /**
   * Fits the focused region. Vector maps (Map ID) get our own ~600 ms eased camera move;
   * raster maps fall back to Google's fitBounds. Reduced motion always jumps.
   */
  private fit(animate = false): void {
    if (!this.nav) return;
    const bbox = getRegion(this.opts.index, this.nav.focus).bbox;
    const padding = this.opts.padding();
    window.cancelAnimationFrame(this.animation);
    if (this.map.getRenderingType() !== this.maps.RenderingType.VECTOR) {
      const [w, s, e, n] = bbox;
      this.map.fitBounds(new this.maps.LatLngBounds({ lat: s, lng: w }, { lat: n, lng: e }), padding);
      return;
    }
    const div = this.map.getDiv();
    const pad = {
      top: padding.top ?? 0,
      right: padding.right ?? 0,
      bottom: padding.bottom ?? 0,
      left: padding.left ?? 0,
    };
    const target = cameraFor(bbox, div.clientWidth, div.clientHeight, pad, MIN_ZOOM, MAX_ZOOM);
    const center = this.map.getCenter();
    const zoom = this.map.getZoom();
    if (!animate || !center || zoom === undefined || prefersReducedMotion()) {
      this.map.moveCamera({ center: { lat: target.lat, lng: target.lng }, zoom: target.zoom });
      return;
    }
    const from = { lat: center.lat(), lng: center.lng(), zoom };
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / CAMERA_MS);
      const cam = interpolateCamera(from, target, easeInOutCubic(t));
      this.map.moveCamera({ center: { lat: cam.lat, lng: cam.lng }, zoom: cam.zoom });
      if (t < 1) this.animation = window.requestAnimationFrame(step);
    };
    this.animation = window.requestAnimationFrame(step);
  }

  get locale(): Locale {
    return this.opts.locale;
  }

  private regionsAtLevel(level: RegionMeta["level"]): RegionMeta[] {
    return Object.values(this.opts.index.regions).filter((r) => r.level === level && this.geometry.has(r.id));
  }

  /**
   * Shows exactly `ids` in a layer. Features are added to a layer once and then only toggled
   * through the style (`visible`), so navigating never re-parses or re-adds geometry.
   */
  private setFeatures(role: Role, ids: string[]): void {
    const added = this.added[role];
    const missing = ids.filter((id) => !added.has(id) && this.geometry.has(id));
    if (missing.length) {
      this.layers[role].addGeoJson({
        type: "FeatureCollection",
        features: missing.map((id) => this.geometry.get(id)!),
      });
      for (const id of missing) added.add(id);
    }
    this.visible[role] = new Set(ids);
  }

  private restyle(): void {
    const css = getComputedStyle(document.documentElement);
    const v = (name: string) => css.getPropertyValue(name).trim();
    const selected = this.nav?.selected ?? null;
    const shown = (role: Role, id: string) => this.visible[role].has(id);
    const fillOf = (id: string) => {
      const top = this.opts.index.regions[id]?.top[0];
      return (top ? CATEGORY_BY_ID.get(top)?.color : undefined)?.[this.scheme] ?? EMPTY_COLOR[this.scheme];
    };

    this.layers.fill.setStyle((f) => {
      const id = String(f.getProperty("id"));
      if (!shown("fill", id)) return { visible: false };
      const isSelected = id === selected;
      return {
        zIndex: isSelected ? 3 : 2,
        fillColor: isSelected ? v("--region-selected") : fillOf(id),
        fillOpacity: 1,
        strokeColor: v("--paper"),
        strokeWeight: 1,
        cursor: "pointer",
      };
    });
    this.layers.context.setStyle((f) => {
      const id = String(f.getProperty("id"));
      if (!shown("context", id)) return { visible: false };
      return {
        zIndex: 1,
        fillColor: fillOf(id),
        fillOpacity: 0.35,
        strokeColor: v("--paper"),
        strokeOpacity: 0.6,
        strokeWeight: 0.8,
        cursor: "pointer",
      };
    });
    this.layers.ghost.setStyle({
      zIndex: 3,
      clickable: false,
      fillOpacity: 0,
      strokeColor: v("--outline-rust"),
      strokeOpacity: 0.16,
      strokeWeight: 0.7,
    });
    this.layers.glow.setStyle((f) => ({
      visible: shown("glow", String(f.getProperty("id"))),
      zIndex: 4,
      clickable: false,
      fillOpacity: 0,
      strokeColor: v("--outline-rust"),
      strokeOpacity: 0.18,
      strokeWeight: 12,
    }));
    this.layers.outline.setStyle((f) => ({
      visible: shown("outline", String(f.getProperty("id"))),
      zIndex: 5,
      clickable: false,
      fillOpacity: 0,
      strokeColor: v("--outline-rust"),
      strokeOpacity: 1,
      strokeWeight: 3,
    }));
  }
}

/** HTML labels drawn in an overlay pane, re-placed on every redraw (pan/zoom). */
function createLabelLayer(maps: typeof google.maps, view: MapView) {
  class LabelLayer extends maps.OverlayView {
    private readonly root = document.createElement("div");
    private items: { region: RegionMeta; el: HTMLElement; w: number; h: number }[] = [];
    private selected: string | null = null;

    override onAdd(): void {
      this.root.className = "map-labels";
      this.getPanes()?.floatPane.append(this.root); // above the Data layer polygons
    }

    override onRemove(): void {
      this.root.remove();
    }

    update(regions: RegionMeta[], selected: string | null): void {
      this.selected = selected;
      this.root.replaceChildren();
      this.items = regions.map((region) => {
        const el = document.createElement("div");
        el.className = `region-label region-label--${region.level}${region.id === selected ? " region-label--selected" : ""}`;
        el.setAttribute("aria-hidden", "true");
        const top = region.top[0];
        el.innerHTML = `<span class="region-label__name"></span>${top ? '<span class="region-label__cat"></span>' : ""}`;
        el.querySelector(".region-label__name")!.textContent = regionName(region, view.locale);
        if (top)
          el.querySelector(".region-label__cat")!.textContent = upper(
            categoryName(top, view.locale),
            view.locale,
          );
        this.root.append(el);
        return { region, el, w: 0, h: 0 };
      });
      // Measure after insertion (fonts are loaded by now; re-measure on each update is cheap).
      for (const item of this.items) {
        item.w = item.el.offsetWidth;
        item.h = item.el.offsetHeight;
      }
      this.draw();
    }

    override draw(): void {
      const projection = this.getProjection();
      if (!projection || !this.items.length) return;
      const px = (lng: number, lat: number) => projection.fromLatLngToDivPixel(new maps.LatLng(lat, lng))!;
      const candidates: LabelCandidate[] = this.items.map(({ region, w, h }) => {
        const p = px(region.label[0], region.label[1]);
        const [west, south, east, north] = region.bbox;
        const regionWidth = Math.abs(px(east, north).x - px(west, south).x);
        return {
          id: region.id,
          x: p.x,
          y: p.y,
          width: w,
          height: h,
          regionWidth,
          priority: (region.id === this.selected ? 1e9 : 0) + regionWidth,
        };
      });
      const visible = placeLabels(candidates);
      this.items.forEach((item, i) => {
        const c = candidates[i]!;
        item.el.style.transform = `translate(${Math.round(c.x - item.w / 2)}px, ${Math.round(c.y - item.h / 2)}px)`;
        item.el.style.visibility = visible.has(item.region.id) ? "visible" : "hidden";
      });
    }
  }
  return new LabelLayer();
}

function pointerOf(e: google.maps.Data.MouseEvent): { x: number; y: number } {
  const dom = e.domEvent as MouseEvent | TouchEvent | undefined;
  if (dom && "touches" in dom && dom.touches[0])
    return { x: dom.touches[0].clientX, y: dom.touches[0].clientY };
  if (dom && "clientX" in dom) return { x: dom.clientX, y: dom.clientY };
  return { x: 0, y: 0 };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
