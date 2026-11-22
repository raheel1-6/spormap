/**
 * Loads the Google Maps JavaScript API once. The browser key is public by design and must be
 * restricted in Google Cloud to this site's address and to the Maps JavaScript API.
 * Without a key Google renders a "for development purposes only" map, which is fine locally.
 */
let loading: Promise<typeof google.maps> | null = null;

export function loadGoogleMaps(key: string | undefined, language: string): Promise<typeof google.maps> {
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const callback = `__spormapMapsReady${Date.now()}`;
    (window as unknown as Record<string, unknown>)[callback] = () => resolve(google.maps);
    const params = new URLSearchParams({ v: "weekly", loading: "async", callback, language, region: "TR" });
    if (key) params.set("key", key);
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.append(script);
  });
  return loading;
}
