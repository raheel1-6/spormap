import { describe, expect, it } from "vitest";
import { cameraFor, easeInOutCubic, interpolateCamera, project, unproject } from "./camera.ts";
import type { BBox } from "./geo.ts";

const kadikoy: BBox = [29.01579, 40.95134, 29.11123, 41.0123];
const none = { top: 0, right: 0, bottom: 0, left: 0 };

describe("projection", () => {
  it("round-trips lng/lat", () => {
    const [x, y] = project(29.0, 41.0);
    const [lng, lat] = unproject(x, y);
    expect(lng).toBeCloseTo(29.0, 9);
    expect(lat).toBeCloseTo(41.0, 9);
  });
});

describe("cameraFor", () => {
  it("centres the bbox without padding and fits its larger side", () => {
    const cam = cameraFor(kadikoy, 800, 600, none);
    const [cx] = project((kadikoy[0] + kadikoy[2]) / 2, 0);
    expect(project(cam.lng, cam.lat)[0]).toBeCloseTo(cx, 9);
    expect(cam.lat).toBeGreaterThan(kadikoy[1]);
    expect(cam.lat).toBeLessThan(kadikoy[3]);
    // The bbox must fit: its pixel width at that zoom is at most the viewport width.
    const [x0] = project(kadikoy[0], 0);
    const [x1] = project(kadikoy[2], 0);
    expect((x1 - x0) * 256 * 2 ** cam.zoom).toBeLessThanOrEqual(800 + 1e-6);
  });

  it("shifts the centre away from a one-sided panel", () => {
    const plain = cameraFor(kadikoy, 800, 600, none);
    const padded = cameraFor(kadikoy, 800, 600, { top: 0, right: 300, bottom: 0, left: 0 });
    expect(padded.zoom).toBeLessThan(plain.zoom);
    // With space taken on the right, the map centre moves right (east) of the bbox centre.
    expect(padded.lng).toBeGreaterThan((kadikoy[0] + kadikoy[2]) / 2);
  });

  it("clamps zoom", () => {
    expect(cameraFor([29, 41, 29.0001, 41.0001], 800, 600, none, 7, 17).zoom).toBe(17);
  });
});

describe("animation helpers", () => {
  it("eases from 0 to 1 symmetrically", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
  });

  it("interpolates endpoints exactly", () => {
    const a = { lat: 41, lng: 28.9, zoom: 9 };
    const b = { lat: 40.98, lng: 29.06, zoom: 12.5 };
    expect(interpolateCamera(a, b, 0)).toMatchObject({ zoom: 9 });
    const end = interpolateCamera(a, b, 1);
    expect(end.lat).toBeCloseTo(40.98, 9);
    expect(end.lng).toBeCloseTo(29.06, 9);
    expect(end.zoom).toBe(12.5);
  });
});
