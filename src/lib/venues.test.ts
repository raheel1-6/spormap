import { describe, expect, it } from "vitest";
import type { RegionMeta } from "./regions.ts";
import { districtOf, groupByCategory, venuesIn, type OsmVenue } from "./venues.ts";

const v = (id: string, cat: string, m: string, name = id): OsmVenue => ({ id, name, cat, m, ll: [29, 41] });
const region = (id: string, level: RegionMeta["level"], parent: string | null): RegionMeta => ({
  id,
  slug: id,
  name: { tr: id, en: id },
  level,
  parent,
  children: [],
  label: [0, 0],
  bbox: [0, 0, 1, 1],
  venues: 0,
  counts: {},
  top: [],
});

const kadikoy = region("kadikoy", "ilce", "anadolu-yakasi");
const moda = region("kadikoy--moda", "mahalle", "kadikoy");
const list = [
  v("a", "fitness", "kadikoy--moda", "Zeytin Spor"),
  v("b", "halisaha", "kadikoy--moda"),
  v("c", "fitness", "kadikoy--goztepe", "Ada Fit"),
  v("d", "halisaha", "kadikoy--goztepe"),
];

describe("venue helpers", () => {
  it("finds the district file for a region", () => {
    const index = {
      meta: { generatedAt: "", osmDataAt: null, attribution: "" },
      root: "istanbul",
      regions: {},
    };
    expect(districtOf(index, kadikoy)).toBe("kadikoy");
    expect(districtOf(index, moda)).toBe("kadikoy");
    expect(districtOf(index, region("istanbul", "il", null))).toBeNull();
  });

  it("filters venues to a mahalle, keeps all for a district, none above", () => {
    expect(venuesIn(moda, list).map((x) => x.id)).toEqual(["a", "b"]);
    expect(venuesIn(kadikoy, list)).toHaveLength(4);
    expect(venuesIn(region("anadolu-yakasi", "yaka", "istanbul"), list)).toEqual([]);
  });

  it("groups by category, ties broken by category priority, names sorted in Turkish order", () => {
    const groups = groupByCategory(list);
    // 2 halı saha vs 2 fitness: halisaha comes first in categories.json.
    expect(groups.map((g) => g.cat)).toEqual(["halisaha", "fitness"]);
    expect(groups[1]!.venues.map((x) => x.name)).toEqual(["Ada Fit", "Zeytin Spor"]);
  });
});
