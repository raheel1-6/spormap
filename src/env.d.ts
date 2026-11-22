interface ImportMetaEnv {
  /** Browser key for the Maps JavaScript API (public; restricted by HTTP referrer in Google Cloud). */
  readonly PUBLIC_GOOGLE_MAPS_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
