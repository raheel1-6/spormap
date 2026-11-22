import { describe, expect, it } from "vitest";
import { filterVenues, parseSport, regionCount, sortChildren, sportChips, withSport } from "./filter.ts";
import type { RegionMeta } from "./regions.ts";
import type { OsmVenue } from "./venues.ts";

const region = (id: string, counts: Record<string, number>): RegionMeta => ({
  id,
  slug: id,
  name: { tr: id, en: id },
  level: "ilce",
  parent: null,
  children: [],
  label: [0, 0],
  bbox: [0, 0, 1, 1],
  venues: Object.values(counts).reduce((a, b) => a + b, 0),
  counts,
  top: [],
});

describe("URL param", () => {
  it("accepts known category ids only", () => {
    expect(parseSport("?spor=halisaha")).toBe("halisaha");
    expect(parseSport("?spor=pizza")).toBeNull();
    expect(parseSport("")).toBeNull();
  });

  it("sets and clears the param, keeping others", () => {
    expect(withSport("?perf", "tenis")).toBe("?perf=&spor=tenis");
    expect(withSport("?spor=tenis", null)).toBe("");
    expect(withSport("", "golf")).toBe("?spor=golf");
  });
});

describe("counts and venues", () => {
  const r = region("kadikoy", { fitness: 20, halisaha: 5, tenis: 3 });
  it("counts one sport or all", () => {
    expect(regionCount(r, null)).toBe(28);
    expect(regionCount(r, "tenis")).toBe(3);
    expect(regionCount(r, "golf")).toBe(0);
  });

  it("filters venues by category", () => {
    const v = (id: string, cat: string): OsmVenue => ({ id, name: id, cat, m: "x", ll: [0, 0] });
    expect(filterVenues([v("a", "tenis"), v("b", "fitness")], "tenis").map((x) => x.id)).toEqual(["a"]);
    expect(filterVenues([v("a", "tenis")], null)).toHaveLength(1);
  });
});

describe("sportChips", () => {
  const r = region("x", { fitness: 9, halisaha: 9, tenis: 4, yuzme: 2, golf: 1, buz: 1, su: 1 });

  it("shows the biggest sports first, ties by category order, rest behind +N", () => {
    const { shown, hidden } = sportChips(r, null, 3);
    expect(shown.map((c) => c.id)).toEqual(["halisaha", "fitness", "tenis"]);
    expect(hidden.map((c) => c.id)).toEqual(["yuzme", "buz", "golf", "su"]);
  });

  it("keeps the active sport visible even when it would be hidden", () => {
    const { shown, hidden } = sportChips(r, "su", 3);
    expect(shown.map((c) => c.id)).toEqual(["halisaha", "fitness", "su"]);
    expect(hidden.map((c) => c.id)).toContain("tenis");
  });

  it("shows an active sport with no venues here so it can be cleared", () => {
    const { shown } = sportChips(region("y", { fitness: 2 }), "golf", 3);
    expect(shown).toContainEqual({ id: "golf", count: 0 });
  });
});

describe("sortChildren", () => {
  it("orders by the chosen sport's count", () => {
    const a = region("a", { tenis: 1, fitness: 10 });
    const b = region("b", { tenis: 5 });
    expect(sortChildren([a, b], "tenis").map((r) => r.id)).toEqual(["b", "a"]);
    expect(sortChildren([a, b], null).map((r) => r.id)).toEqual(["a", "b"]);
  });
});
