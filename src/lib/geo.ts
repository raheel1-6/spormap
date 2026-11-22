/**
 * Small planar geometry helpers on [lng, lat] coordinates. Accurate enough at city scale
 * for point-in-polygon, bounding boxes and relative areas; not for distances.
 */

export type Position = [number, number];
export type Ring = Position[];
export type PolygonCoords = Ring[]; // outer ring first, then holes
export type MultiPolygonCoords = PolygonCoords[];
export type BBox = [west: number, south: number, east: number, north: number];

export interface PolygonalGeometry {
  type: "Polygon" | "MultiPolygon";
  coordinates: PolygonCoords | MultiPolygonCoords;
}

/** Normalises Polygon / MultiPolygon to a list of polygons. */
export function polygonsOf(geometry: PolygonalGeometry): MultiPolygonCoords {
  return geometry.type === "Polygon"
    ? [geometry.coordinates as PolygonCoords]
    : (geometry.coordinates as MultiPolygonCoords);
}

/** Ray casting; points exactly on an edge may fall either way. */
export function pointInRing([x, y]: Position, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** True when the point is inside the outer ring and outside every hole of any polygon. */
export function pointInGeometry(point: Position, geometry: PolygonalGeometry): boolean {
  return polygonsOf(geometry).some(
    ([outer, ...holes]) =>
      outer !== undefined && pointInRing(point, outer) && !holes.some((h) => pointInRing(point, h)),
  );
}

export function bboxOf(geometry: PolygonalGeometry): BBox {
  let w = Infinity;
  let s = Infinity;
  let e = -Infinity;
  let n = -Infinity;
  for (const polygon of polygonsOf(geometry)) {
    for (const [x, y] of polygon[0] ?? []) {
      if (x < w) w = x;
      if (x > e) e = x;
      if (y < s) s = y;
      if (y > n) n = y;
    }
  }
  return [w, s, e, n];
}

export function bboxContains([w, s, e, n]: BBox, [x, y]: Position): boolean {
  return x >= w && x <= e && y >= s && y <= n;
}

export function unionBBox(boxes: BBox[]): BBox {
  return boxes.reduce<BBox>(
    ([w, s, e, n], [w2, s2, e2, n2]) => [Math.min(w, w2), Math.min(s, s2), Math.max(e, e2), Math.max(n, n2)],
    [Infinity, Infinity, -Infinity, -Infinity],
  );
}

/** Shoelace area of a ring in squared degrees (sign = winding). */
export function ringArea(ring: Ring): number {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    sum += (xj + xi) * (yj - yi);
  }
  return sum / 2;
}

/** Unsigned area minus holes, in squared degrees. Use only for comparing regions. */
export function geometryArea(geometry: PolygonalGeometry): number {
  return polygonsOf(geometry).reduce(
    (total, [outer, ...holes]) =>
      total + Math.abs(ringArea(outer ?? [])) - holes.reduce((h, ring) => h + Math.abs(ringArea(ring)), 0),
    0,
  );
}

export function round(value: number, decimals = 5): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
