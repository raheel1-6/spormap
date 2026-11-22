import { describe, expect, it } from "vitest";
import {
  bboxOf,
  geometryArea,
  pointInGeometry,
  pointInRing,
  unionBBox,
  type PolygonalGeometry,
  type Ring,
} from "./geo.ts";

const square: Ring = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
  [0, 0],
];
const hole: Ring = [
  [4, 4],
  [6, 4],
  [6, 6],
  [4, 6],
  [4, 4],
];
// U shape: concave, the notch (x 4..6, y 4..10) is outside.
const uShape: Ring = [
  [0, 0],
  [10, 0],
  [10, 10],
  [6, 10],
  [6, 4],
  [4, 4],
  [4, 10],
  [0, 10],
  [0, 0],
];

describe("pointInRing", () => {
  it("handles inside and outside points", () => {
    expect(pointInRing([5, 5], square)).toBe(true);
    expect(pointInRing([15, 5], square)).toBe(false);
    expect(pointInRing([-1, -1], square)).toBe(false);
  });

  it("handles concave rings", () => {
    expect(pointInRing([2, 8], uShape)).toBe(true);
    expect(pointInRing([5, 8], uShape)).toBe(false);
    expect(pointInRing([5, 2], uShape)).toBe(true);
  });
});

describe("pointInGeometry", () => {
  it("excludes holes", () => {
    const donut: PolygonalGeometry = { type: "Polygon", coordinates: [square, hole] };
    expect(pointInGeometry([5, 5], donut)).toBe(false);
    expect(pointInGeometry([2, 2], donut)).toBe(true);
  });

  it("checks every part of a multipolygon (islands)", () => {
    const island: Ring = [
      [20, 20],
      [22, 20],
      [22, 22],
      [20, 22],
      [20, 20],
    ];
    const multi: PolygonalGeometry = { type: "MultiPolygon", coordinates: [[square], [island]] };
    expect(pointInGeometry([21, 21], multi)).toBe(true);
    expect(pointInGeometry([15, 15], multi)).toBe(false);
  });
});

describe("bbox and area", () => {
  it("computes bounding boxes and unions", () => {
    expect(bboxOf({ type: "Polygon", coordinates: [uShape] })).toEqual([0, 0, 10, 10]);
    expect(
      unionBBox([
        [0, 0, 1, 1],
        [-2, 0.5, 0.5, 3],
      ]),
    ).toEqual([-2, 0, 1, 3]);
  });

  it("subtracts holes from area regardless of winding", () => {
    const reversed = [...square].reverse();
    expect(geometryArea({ type: "Polygon", coordinates: [reversed, hole] })).toBe(96);
  });
});
