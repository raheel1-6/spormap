import { describe, expect, it } from "vitest";
import {
  ancestry,
  goTo,
  pathOf,
  resolvePath,
  tap,
  up,
  type RegionIndex,
  type RegionMeta,
} from "./regions.ts";

function region(
  id: string,
  level: RegionMeta["level"],
  parent: string | null,
  children: string[] = [],
): RegionMeta {
  const slug = id.includes("--") ? id.split("--")[1]! : id;
  return {
    id,
    slug,
    name: { tr: slug, en: slug },
    level,
    parent,
    children,
    label: [0, 0],
    bbox: [0, 0, 1, 1],
    venues: 0,
    counts: {},
    top: [],
  };
}

const index: RegionIndex = {
  meta: { generatedAt: "", osmDataAt: null, attribution: "" },
  root: "istanbul",
  regions: Object.fromEntries(
    [
      region("istanbul", "il", null, ["anadolu-yakasi", "avrupa-yakasi"]),
      region("anadolu-yakasi", "yaka", "istanbul", ["kadikoy"]),
      region("avrupa-yakasi", "yaka", "istanbul", ["besiktas"]),
      region("kadikoy", "ilce", "anadolu-yakasi", ["kadikoy--caddebostan", "kadikoy--moda"]),
      region("besiktas", "ilce", "avrupa-yakasi", []),
      region("kadikoy--caddebostan", "mahalle", "kadikoy"),
      region("kadikoy--moda", "mahalle", "kadikoy"),
    ].map((r) => [r.id, r]),
  ),
};

describe("hierarchy navigation", () => {
  const start = { focus: "istanbul", selected: null };

  it("drills into regions with children", () => {
    const s1 = tap(index, start, "anadolu-yakasi");
    expect(s1).toEqual({ focus: "anadolu-yakasi", selected: null });
    expect(tap(index, s1, "kadikoy")).toEqual({ focus: "kadikoy", selected: null });
  });

  it("selects leaves without changing focus", () => {
    const s = tap(index, { focus: "kadikoy", selected: null }, "kadikoy--moda");
    expect(s).toEqual({ focus: "kadikoy", selected: "kadikoy--moda" });
    expect(tap(index, s, "kadikoy--caddebostan").selected).toBe("kadikoy--caddebostan");
  });

  it("goes up: first clears the selection, then moves to the parent, stopping at the root", () => {
    let s = { focus: "kadikoy", selected: "kadikoy--moda" as string | null };
    s = up(index, s);
    expect(s).toEqual({ focus: "kadikoy", selected: null });
    s = up(index, s);
    expect(s.focus).toBe("anadolu-yakasi");
    s = up(index, up(index, s));
    expect(s.focus).toBe("istanbul");
  });

  it("jumps to any region", () => {
    expect(goTo(index, "kadikoy--moda")).toEqual({ focus: "kadikoy", selected: "kadikoy--moda" });
    expect(goTo(index, "besiktas")).toEqual({ focus: "avrupa-yakasi", selected: "besiktas" }); // leaf district (no mahalle)
  });

  it("builds the breadcrumb chain root first", () => {
    expect(ancestry(index, "kadikoy--moda").map((r) => r.id)).toEqual([
      "istanbul",
      "anadolu-yakasi",
      "kadikoy",
      "kadikoy--moda",
    ]);
  });
});

describe("paths", () => {
  it("skips the yaka segment below the yaka level", () => {
    expect(pathOf(index, "istanbul")).toBe("/istanbul");
    expect(pathOf(index, "anadolu-yakasi")).toBe("/istanbul/anadolu-yakasi");
    expect(pathOf(index, "kadikoy")).toBe("/istanbul/kadikoy");
    expect(pathOf(index, "kadikoy--caddebostan")).toBe("/istanbul/kadikoy/caddebostan");
  });

  it("round-trips through resolvePath", () => {
    for (const id of Object.keys(index.regions)) {
      expect(resolvePath(index, pathOf(index, id))).toBe(id);
    }
    expect(resolvePath(index, "/istanbul/nowhere")).toBeNull();
    expect(resolvePath(index, "/ankara")).toBeNull();
  });
});
