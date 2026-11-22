/**
 * Web Mercator camera math, so the map can be animated to "fit these bounds" with our own easing
 * (Google's fitBounds jumps on long moves). Coordinates are normalised world units: x, y in [0, 1].
 */
import type { BBox } from "./geo.ts";

export interface Camera {
  lat: number;
  lng: number;
  zoom: number;
}

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const TILE = 256;

export function project(lng: number, lat: number): [number, number] {
  const sin = Math.sin((lat * Math.PI) / 180);
  return [(lng + 180) / 360, 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)];
}

export function unproject(x: number, y: number): [lng: number, lat: number] {
  const lng = x * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI;
  return [lng, lat];
}

/** Camera that fits `bbox` into a `width`×`height` viewport inside `padding`, like fitBounds. */
export function cameraFor(
  bbox: BBox,
  width: number,
  height: number,
  padding: Padding,
  minZoom = 0,
  maxZoom = 22,
): Camera {
  const [w, s, e, n] = bbox;
  const [x0, y0] = project(w, n);
  const [x1, y1] = project(e, s);
  const availW = Math.max(1, width - padding.left - padding.right);
  const availH = Math.max(1, height - padding.top - padding.bottom);
  const zoomX = Math.log2(availW / (TILE * Math.max(x1 - x0, 1e-9)));
  const zoomY = Math.log2(availH / (TILE * Math.max(y1 - y0, 1e-9)));
  const zoom = Math.min(maxZoom, Math.max(minZoom, Math.min(zoomX, zoomY)));
  const scale = TILE * 2 ** zoom;
  // Shift the centre so the bbox sits in the middle of the padded area, not of the whole map.
  const cx = (x0 + x1) / 2 + (padding.right - padding.left) / 2 / scale;
  const cy = (y0 + y1) / 2 + (padding.bottom - padding.top) / 2 / scale;
  const [lng, lat] = unproject(cx, cy);
  return { lat, lng, zoom };
}

export const easeInOutCubic = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Camera at progress `t` (0..1) between two cameras, centre interpolated in Mercator space. */
export function interpolateCamera(from: Camera, to: Camera, t: number): Camera {
  const [fx, fy] = project(from.lng, from.lat);
  const [tx, ty] = project(to.lng, to.lat);
  const [lng, lat] = unproject(fx + (tx - fx) * t, fy + (ty - fy) * t);
  return { lat, lng, zoom: from.zoom + (to.zoom - from.zoom) * t };
}
