/**
 * Public, non-secret map configuration.
 * The Map ID selects the vector renderer and its cloud style "spormap-paper" (Google Cloud →
 * Map Styles), which hides every basemap feature. It is not a credential; the API key is
 * (see PUBLIC_GOOGLE_MAPS_KEY).
 */
export const GOOGLE_MAP_ID = "98571d0a25e40b97dc0c9ea0";

/**
 * Vector map (smooth fractional zoom, 600 ms eased camera) is the default. ?raster forces the
 * old raster renderer for comparison or troubleshooting. Browsers without WebGL fall back to
 * raster automatically, and the map code handles both.
 */
export function useVectorMap(): boolean {
  return !new URLSearchParams(location.search).has("raster");
}
