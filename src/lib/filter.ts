/**
 * Sport filter: one category (or none = "Tümü"). Shared by panel, map and URL handling.
 * The filter stays on while drilling up and down, so "show me football pitches" works across
 * the whole city, a district and a mahalle alike.
 */
import { CATEGORY_BY_ID, CATEGORIES } from "./categories.ts";
import type { RegionMeta } from "./regions.ts";
import type { OsmVenue } from "./venues.ts";

/** Category id, or null for all sports. */
export type Sport = string | null;

export const SPORT_PARAM = "spor";

/** Reads ?spor=<category id> (unknown ids are ignored). */
export function parseSport(search: string): Sport {
  const id = new URLSearchParams(search).get(SPORT_PARAM);
  return id && CATEGORY_BY_ID.has(id) ? id : null;
}

/** Returns `search` with the sport param set or removed (other params kept). */
export function withSport(search: string, sport: Sport): string {
  const params = new URLSearchParams(search);
  if (sport) params.set(SPORT_PARAM, sport);
  else params.delete(SPORT_PARAM);
  const s = params.toString();
  return s ? `?${s}` : "";
}

/** Venues in the region for the chosen sport (all when none). */
export function regionCount(region: RegionMeta, sport: Sport): number {
  return sport ? (region.counts[sport] ?? 0) : region.venues;
}

export function filterVenues(venues: OsmVenue[], sport: Sport): OsmVenue[] {
  return sport ? venues.filter((v) => v.cat === sport) : venues;
}

const PRIORITY = new Map(CATEGORIES.map((c, i) => [c.id, i]));

export interface ChipSpec {
  id: string;
  count: number;
}

/**
 * Sport chips for a region: sports present there, most venues first (ties by category order).
 * The first `visible` are shown, the rest sit behind "+N". The active sport is always visible,
 * even with 0 venues here, so it can be switched off.
 */
export function sportChips(
  region: RegionMeta,
  active: Sport,
  visible = 5,
): { shown: ChipSpec[]; hidden: ChipSpec[] } {
  const all = Object.entries(region.counts)
    .filter(([, n]) => n > 0)
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count || (PRIORITY.get(a.id) ?? 99) - (PRIORITY.get(b.id) ?? 99));
  if (active && !all.some((c) => c.id === active)) all.unshift({ id: active, count: 0 });
  const shown = all.slice(0, visible);
  const hidden = all.slice(visible);
  const activeHidden = hidden.findIndex((c) => c.id === active);
  if (activeHidden >= 0) {
    // Swap the active chip into view in place of the last visible one.
    const [chip] = hidden.splice(activeHidden, 1);
    hidden.unshift(shown.pop()!);
    shown.push(chip!);
  }
  return { shown, hidden };
}

/** Child regions ordered for the panel: most venues of the chosen sport first, then by name. */
export function sortChildren(children: RegionMeta[], sport: Sport): RegionMeta[] {
  return [...children].sort(
    (a, b) => regionCount(b, sport) - regionCount(a, sport) || a.name.tr.localeCompare(b.name.tr, "tr"),
  );
}
