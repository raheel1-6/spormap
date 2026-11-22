/**
 * Public, non-secret map configuration.
 * The Map ID selects the vector renderer and its cloud style (set up in Google Cloud → Map
 * Management). It is not a credential; the API key is (see PUBLIC_GOOGLE_MAPS_KEY).
 */
export const GOOGLE_MAP_ID = "98571d0a25e40b97dc0c9ea0";

/**
 * Vector rendering is opt-in with ?vector until the Map ID's cloud style is confirmed to hide
 * every basemap feature (otherwise Google's street map would show through the paper look).
 */
export function useVectorMap(): boolean {
  return new URLSearchParams(location.search).has("vector");
}
