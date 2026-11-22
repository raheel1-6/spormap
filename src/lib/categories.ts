import config from "../data/categories.json" with { type: "json" };

export type OsmRule = Record<string, string | string[]>;

export interface Category {
  id: string;
  name: { tr: string; en: string };
  color: { light: string; dark: string };
  places: string[];
  keywords: { tr: string[]; en: string[] };
  osm: OsmRule[];
}

export const CATEGORIES: Category[] = config.categories as Category[];
export const EMPTY_COLOR: { light: string; dark: string } = config.emptyColor;
export const CATEGORY_BY_ID: ReadonlyMap<string, Category> = new Map(CATEGORIES.map((c) => [c.id, c]));

const PRIORITY = new Map(CATEGORIES.map((c, i) => [c.id, i]));

/** `sport=*` may hold several values: "soccer;basketball". */
function tagValues(tags: Record<string, string>, key: string): string[] {
  return (tags[key] ?? "")
    .split(";")
    .map((v) => v.trim())
    .filter(Boolean);
}

function ruleMatches(rule: OsmRule, tags: Record<string, string>): boolean {
  return Object.entries(rule).every(([key, expected]) => {
    const wanted = Array.isArray(expected) ? expected : [expected];
    return tagValues(tags, key).some((v) => wanted.includes(v));
  });
}

/** First category (in priority order) with a matching OSM rule, or null. */
export function classifyOsm(
  tags: Record<string, string>,
  categories: Category[] = CATEGORIES,
): string | null {
  return categories.find((c) => c.osm.some((rule) => ruleMatches(rule, tags)))?.id ?? null;
}

/**
 * Categories ordered by descending count. Tie-break: category priority (order in
 * categories.json), so the result is deterministic. Zero counts are dropped.
 */
export function topCategories(counts: Record<string, number>): string[] {
  return Object.entries(counts)
    .filter(([, n]) => n > 0)
    .sort(([a, na], [b, nb]) => nb - na || (PRIORITY.get(a) ?? 99) - (PRIORITY.get(b) ?? 99))
    .map(([id]) => id);
}
