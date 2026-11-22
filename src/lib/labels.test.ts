import { describe, expect, it } from "vitest";
import { placeLabels, type LabelCandidate } from "./labels.ts";

const label = (id: string, x: number, y: number, priority: number, regionWidth = 500): LabelCandidate => ({
  id,
  x,
  y,
  width: 80,
  height: 24,
  regionWidth,
  priority,
});

describe("placeLabels", () => {
  it("keeps the higher-priority label when two overlap", () => {
    const visible = placeLabels([label("small", 100, 100, 1), label("big", 120, 105, 5)]);
    expect([...visible]).toEqual(["big"]);
  });

  it("shows labels that don't overlap", () => {
    expect(placeLabels([label("a", 0, 0, 1), label("b", 300, 0, 1)]).size).toBe(2);
  });

  it("hides labels wider than their region on screen", () => {
    expect(placeLabels([label("tiny", 0, 0, 9, 40)]).size).toBe(0);
  });

  it("respects padding between labels", () => {
    // 80px wide labels 84px apart: they touch only once 4px padding is added on each side.
    expect(placeLabels([label("a", 0, 0, 2), label("b", 84, 0, 1)], 0).size).toBe(2);
    expect(placeLabels([label("a", 0, 0, 2), label("b", 84, 0, 1)], 4).size).toBe(1);
  });
});
