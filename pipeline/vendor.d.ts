declare module "mapshaper" {
  const mapshaper: {
    /** Runs mapshaper commands on in-memory inputs; resolves to output filename → contents. */
    applyCommands(
      commands: string,
      input?: Record<string, unknown>,
    ): Promise<Record<string, string | Uint8Array>>;
  };
  export default mapshaper;
}

declare module "osmtogeojson" {
  import type { FeatureCollection } from "geojson";
  export default function osmtogeojson(data: unknown, options?: Record<string, unknown>): FeatureCollection;
}
