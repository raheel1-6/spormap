import type { BBox, Position } from "./geo.ts";

/** Hierarchy levels. "turkiye" exists only as an inactive breadcrumb (future expansion). */
export type Level = "il" | "yaka" | "ilce" | "mahalle";

export interface LocalizedName {
  tr: string;
  en: string;
}

export interface RegionMeta {
  id: string;
  /** URL segment; unique among siblings. */
  slug: string;
  name: LocalizedName;
  level: Level;
  parent: string | null;
  children: string[];
  /** Point inside the polygon used for the label (pole of inaccessibility-like). */
  label: Position;
  bbox: BBox;
  /** OSM sport venues inside the region, total and per category id. */
  venues: number;
  counts: Record<string, number>;
  /** Category ids by descending count (see topCategories). */
  top: string[];
}

export interface DatasetMeta {
  generatedAt: string;
  osmDataAt: string | null;
  attribution: string;
}

export interface RegionIndex {
  meta: DatasetMeta;
  root: string;
  regions: Record<string, RegionMeta>;
}

export function getRegion(index: RegionIndex, id: string): RegionMeta {
  const region = index.regions[id];
  if (!region) throw new Error(`Unknown region: ${id}`);
  return region;
}

/** Root-first chain of regions ending at `id`. */
export function ancestry(index: RegionIndex, id: string): RegionMeta[] {
  const chain: RegionMeta[] = [];
  for (
    let r: RegionMeta | undefined = getRegion(index, id);
    r;
    r = r.parent ? index.regions[r.parent] : undefined
  ) {
    chain.unshift(r);
  }
  return chain;
}

export function hasChildren(region: RegionMeta): boolean {
  return region.children.length > 0;
}

/**
 * Navigation state: `focus` is the region whose children are on screen; `selected` is a leaf
 * (mahalle) picked inside it, if any. The breadcrumb is ancestry(selected ?? focus).
 */
export interface NavState {
  focus: string;
  selected: string | null;
}

/** Tapping a region: drill into it if it has children, otherwise select it as a leaf. */
export function tap(index: RegionIndex, state: NavState, id: string): NavState {
  const region = getRegion(index, id);
  if (hasChildren(region)) return { focus: id, selected: null };
  return { focus: region.parent ?? state.focus, selected: id };
}

/** Back / "up one level": clear a leaf selection first, then move focus to the parent. */
export function up(index: RegionIndex, state: NavState): NavState {
  if (state.selected) return { focus: state.focus, selected: null };
  const parent = getRegion(index, state.focus).parent;
  return parent ? { focus: parent, selected: null } : state;
}

/** Jump to any region (search result, breadcrumb, deep link). */
export function goTo(index: RegionIndex, id: string): NavState {
  const region = getRegion(index, id);
  return hasChildren(region) ? { focus: id, selected: null } : { focus: region.parent ?? id, selected: id };
}

export function current(state: NavState): string {
  return state.selected ?? state.focus;
}

/**
 * Site path for a region, mirroring the hierarchy but skipping the Yaka level for districts:
 * /istanbul, /istanbul/avrupa-yakasi, /istanbul/kadikoy, /istanbul/kadikoy/caddebostan
 */
export function pathOf(index: RegionIndex, id: string): string {
  const chain = ancestry(index, id).filter((r, i, all) => !(r.level === "yaka" && i < all.length - 1));
  return "/" + chain.map((r) => r.slug).join("/");
}

/** Inverse of pathOf. Returns null for unknown paths. */
export function resolvePath(index: RegionIndex, path: string): string | null {
  const segments = path.split("/").filter(Boolean);
  const root = getRegion(index, index.root);
  if (segments[0] !== root.slug) return null;
  let region = root;
  for (const segment of segments.slice(1)) {
    const candidates = region.children.map((c) => getRegion(index, c));
    // Districts live under a Yaka but their URL skips it, so also look one level deeper.
    const next =
      candidates.find((c) => c.slug === segment) ??
      candidates
        .filter((c) => c.level === "yaka")
        .flatMap((y) => y.children.map((c) => getRegion(index, c)))
        .find((c) => c.slug === segment);
    if (!next) return null;
    region = next;
  }
  return region.id;
}
