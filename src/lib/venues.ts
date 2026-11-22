/**
 * OSM venues (ODbL; stored and shipped statically) and helpers shared by the build, the
 * browser and the pipeline. Google Places results are a separate, live-only type (places.ts).
 */
import { CATEGORIES } from "./categories.ts";
import type { Position } from "./geo.ts";
import type { RegionIndex, RegionMeta } from "./regions.ts";

export interface OsmVenue {
  /** OSM element: "n123", "w456", "r789". */
  id: string;
  name: string;
  /** Category id (categories.json). */
  cat: string;
  /** Mahalle id. */
  m: string;
  /** [lng, lat]. */
  ll: Position;
  /** Badges: o = outdoor, b = municipal (belediye). */
  f?: string;
}

/** District whose venue file holds this region's venues (venues are stored per ilçe). */
export function districtOf(_index: RegionIndex, region: RegionMeta): string | null {
  if (region.level === "ilce") return region.id;
  if (region.level === "mahalle") return region.parent;
  return null;
}

/** Venues inside a district or mahalle; empty above district level (too many to list). */
export function venuesIn(region: RegionMeta, districtVenues: OsmVenue[]): OsmVenue[] {
  if (region.level === "ilce") return districtVenues;
  if (region.level === "mahalle") return districtVenues.filter((v) => v.m === region.id);
  return [];
}

const PRIORITY = new Map(CATEGORIES.map((c, i) => [c.id, i]));

/** Groups venues into category sections: biggest section first, ties by category priority. */
export function groupByCategory(venues: OsmVenue[]): { cat: string; venues: OsmVenue[] }[] {
  const groups = new Map<string, OsmVenue[]>();
  for (const v of venues) groups.set(v.cat, [...(groups.get(v.cat) ?? []), v]);
  return [...groups.entries()]
    .map(([cat, list]) => ({ cat, venues: list.sort((a, b) => a.name.localeCompare(b.name, "tr")) }))
    .sort(
      (a, b) =>
        b.venues.length - a.venues.length || (PRIORITY.get(a.cat) ?? 99) - (PRIORITY.get(b.cat) ?? 99),
    );
}
