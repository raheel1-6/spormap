import { describe, expect, it } from "vitest";
import { CATEGORIES, classifyOsm, topCategories } from "./categories.ts";

describe("category config", () => {
  it("has the 15 sport categories with unique ids and both languages", () => {
    expect(CATEGORIES).toHaveLength(15);
    expect(new Set(CATEGORIES.map((c) => c.id)).size).toBe(15);
    for (const c of CATEGORIES) {
      expect(c.name.tr && c.name.en).toBeTruthy();
      expect(c.color.light).toMatch(/^#[0-9A-F]{6}$/i);
      expect(c.color.dark).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });
});

describe("classifyOsm", () => {
  it("maps typical OSM tags", () => {
    expect(classifyOsm({ leisure: "pitch", sport: "soccer" })).toBe("halisaha");
    expect(classifyOsm({ leisure: "fitness_centre" })).toBe("fitness");
    expect(classifyOsm({ leisure: "swimming_pool" })).toBe("yuzme");
    expect(classifyOsm({ leisure: "stadium", sport: "multi" })).toBe("stadyum");
    expect(classifyOsm({ amenity: "cafe" })).toBeNull();
  });

  it("prefers the specific sport over the generic venue type", () => {
    expect(classifyOsm({ leisure: "fitness_centre", sport: "yoga" })).toBe("yoga");
    expect(classifyOsm({ leisure: "sports_centre", sport: "tennis" })).toBe("tenis");
  });

  it("reads multi-valued sport tags", () => {
    expect(classifyOsm({ leisure: "pitch", sport: "basketball;soccer" })).toBe("halisaha");
  });
});

describe("topCategories", () => {
  it("orders by count and drops zeros", () => {
    expect(topCategories({ fitness: 3, tenis: 5, golf: 0 })).toEqual(["tenis", "fitness"]);
  });

  it("breaks ties by priority order in categories.json", () => {
    // halisaha is listed before fitness, so it wins a tie.
    expect(topCategories({ fitness: 4, halisaha: 4 })).toEqual(["halisaha", "fitness"]);
    expect(topCategories({ stadyum: 2, yoga: 2 })).toEqual(["yoga", "stadyum"]);
  });
});
