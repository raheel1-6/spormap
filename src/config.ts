/**
 * Public, non-secret map configuration.
 * The Map ID selects the cloud style "spormap-paper" (Google Cloud → Map Styles), which hides
 * every basemap feature, and enables Advanced Markers (venue pins). It is not a credential; the
 * API key is (see PUBLIC_GOOGLE_MAPS_KEY).
 */
export const GOOGLE_MAP_ID = "98571d0a25e40b97dc0c9ea0";

/**
 * Vector rendering (smooth fractional zoom, 600 ms eased camera) is the default. ?raster forces
 * the raster renderer for comparison or troubleshooting; browsers without WebGL fall back to it
 * automatically. Both use the same Map ID and cloud style.
 */
export function forceRaster(): boolean {
  return new URLSearchParams(location.search).has("raster");
}
