import { describe, expect, it } from "vitest";
import { rankPlaces, type Place } from "./places.ts";

const p = (name: string, rating: number | null, count: number): Place => ({
  id: name,
  name,
  rating,
  count,
  ll: [29, 41],
  address: "",
  type: null,
  mapsUrl: null,
});

describe("rankPlaces", () => {
  it("prefers many solid reviews over a few near-perfect ones", () => {
    // C ≈ 4.55. Few: 22/52·4.9 + 30/52·4.55 ≈ 4.70; Many: 900/930·4.75 + 30/930·4.55 ≈ 4.74.
    const ranked = rankPlaces([p("Few", 4.9, 22), p("Many", 4.75, 900), p("Meh", 4.0, 300)]);
    expect(ranked.map((r) => r.name)).toEqual(["Many", "Few", "Meh"]);
  });

  it("matches the formula with C = mean rating of the set", () => {
    const [top] = rankPlaces([p("A", 5, 30), p("B", 4, 30)], { m: 30 });
    // C = 4.5; A: 0.5·5 + 0.5·4.5 = 4.75
    expect(top!.score).toBeCloseTo(4.75, 10);
    expect(top!.rating).toBe(5); // true rating is kept for display
  });

  it("hides places below the minimum review count and unrated places", () => {
    const ranked = rankPlaces([p("Tiny", 5, 3), p("Unrated", null, 0), p("Ok", 4.2, 40)], { minCount: 20 });
    expect(ranked.map((r) => r.name)).toEqual(["Ok"]);
  });

  it("still uses low-count places for the mean", () => {
    const withTiny = rankPlaces([p("Tiny", 1, 3), p("A", 4.5, 50)], { m: 30 });
    const without = rankPlaces([p("A", 4.5, 50)], { m: 30 });
    expect(withTiny[0]!.score).toBeLessThan(without[0]!.score);
  });

  it("returns nothing for empty or unrated input", () => {
    expect(rankPlaces([])).toEqual([]);
    expect(rankPlaces([p("x", null, 0)])).toEqual([]);
  });
});
