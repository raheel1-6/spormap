/**
 * Google Places results as returned by the proxy. Live only: held in memory while shown,
 * never stored (Google Maps Platform terms; docs/DECISIONS.md D1).
 */
export interface Place {
  id: string;
  name: string;
  rating: number | null;
  count: number;
  ll: [number, number];
  address: string;
  type: string | null;
  mapsUrl: string | null;
}

export interface RankOptions {
  /** Prior weight m in (v/(v+m))·R + (m/(v+m))·C. */
  m?: number;
  /** Places with fewer reviews are hidden. */
  minCount?: number;
}

export interface RankedPlace extends Place {
  rating: number;
  score: number;
}

/**
 * Bayesian-weighted ranking: score = (v/(v+m))·R + (m/(v+m))·C, where R is the place's rating,
 * v its review count and C the mean rating of the result set. Few-review places are pulled
 * towards the mean, so 4.9 from 8 reviews doesn't beat 4.7 from 900. The true rating and count
 * are always what's displayed; the score only orders the list.
 */
export function rankPlaces(places: Place[], { m = 30, minCount = 20 }: RankOptions = {}): RankedPlace[] {
  const rated = places.filter((p): p is Place & { rating: number } => p.rating !== null && p.count > 0);
  if (!rated.length) return [];
  const C = rated.reduce((sum, p) => sum + p.rating, 0) / rated.length;
  return rated
    .filter((p) => p.count >= minCount)
    .map((p) => ({ ...p, score: (p.count / (p.count + m)) * p.rating + (m / (p.count + m)) * C }))
    .sort((a, b) => b.score - a.score || b.count - a.count || a.name.localeCompare(b.name, "tr"));
}
