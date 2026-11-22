/**
 * Full data rebuild: boundaries, then venues + region index. Flags (e.g. --refresh) apply to both.
 *   npm run data              uses cached Overpass responses when present
 *   npm run data -- --refresh fetches fresh OSM data
 */
await import("./build-boundaries.ts");
await import("./build-index.ts");

export {};
