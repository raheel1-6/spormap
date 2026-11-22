interface ImportMetaEnv {
  /** Browser key for the Maps JavaScript API (public; restricted by HTTP referrer in Google Cloud). */
  readonly PUBLIC_GOOGLE_MAPS_KEY?: string;
  /** Base URL of the Places proxy Worker (docs/PROXY.md). Unset = OSM-only, no ratings button. */
  readonly PUBLIC_PLACES_PROXY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
