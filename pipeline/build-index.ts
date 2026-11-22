/**
 * Venue + index pipeline: OSM sport venues → category → mahalle, aggregated up the hierarchy.
 *
 *   node pipeline/build-index.ts [--refresh]
 *
 * Needs pipeline/out/boundaries.json and public/data/geo/mahalle/*.geojson (build-boundaries.ts).
 * Outputs (committed, served statically):
 *   public/data/regions.json          region index: names, hierarchy, label points, bboxes, counts
 *   public/data/venues/<ilce>.json    OSM venues per district (no Google content, see docs/DECISIONS.md)
 *
 * Data © OpenStreetMap contributors, ODbL.
 */
import type { FeatureCollection } from "geojson";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { classifyOsm, topCategories } from "../src/lib/categories.ts";
import {
  bboxContains,
  bboxOf,
  pointInGeometry,
  round,
  type BBox,
  type PolygonalGeometry,
  type Position,
} from "../src/lib/geo.ts";
import type { RegionIndex, RegionMeta } from "../src/lib/regions.ts";
import type { BoundaryRecord } from "./build-boundaries.ts";
import { overpass } from "./overpass.ts";

const ROOT = join(import.meta.dirname, "..");
const DATA = join(ROOT, "public/data");
const refresh = process.argv.includes("--refresh");

const LEISURE =
  "fitness_centre|sports_centre|stadium|pitch|swimming_pool|water_park|track|fitness_station|ice_rink|golf_course|miniature_golf|horse_riding|sports_hall|dojo";

/** Compact venue record shipped to the browser. */
export interface OsmVenue {
  id: string; // "n123", "w456", "r789"
  name: string;
  cat: string;
  m: string; // mahalle id
  ll: Position;
  /** Badges: o = outdoor, b = municipal (belediye). */
  f?: string;
}

interface OsmElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

async function main() {
  const { osmDataAt, records } = JSON.parse(
    await readFile(join(ROOT, "pipeline/out/boundaries.json"), "utf8"),
  ) as {
    osmDataAt: string | null;
    records: BoundaryRecord[];
  };

  console.log("Fetching OSM sport venues…");
  const raw = await overpass(
    `[out:json][timeout:600];
     rel(223474)->.prov; .prov map_to_area->.ist;
     ( nwr(area.ist)["leisure"~"^(${LEISURE})$"]["name"];
       nwr(area.ist)["sport"]["name"]; );
     out center tags;`,
    join(ROOT, "pipeline/cache/osm-venues.json"),
    refresh,
  );

  // Mahalle polygons for point-in-polygon, with bbox prefilter.
  const mahalleShapes: { id: string; bbox: BBox; geometry: PolygonalGeometry }[] = [];
  for (const file of await readdir(join(DATA, "geo/mahalle"))) {
    const fc = JSON.parse(await readFile(join(DATA, "geo/mahalle", file), "utf8")) as FeatureCollection;
    for (const f of fc.features) {
      const geometry = f.geometry as unknown as PolygonalGeometry;
      mahalleShapes.push({ id: String(f.properties?.["id"]), bbox: bboxOf(geometry), geometry });
    }
  }

  const venues: OsmVenue[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const el of raw.elements as OsmElement[]) {
    const tags = el.tags ?? {};
    if (["private", "no", "customers"].includes(tags["access"] ?? "")) continue;
    const cat = classifyOsm(tags);
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!cat || lat === undefined || lon === undefined || !tags["name"]) continue;
    const id = `${el.type[0]}${el.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const ll: Position = [round(lon, 6), round(lat, 6)];
    const m = mahalleShapes.find((s) => bboxContains(s.bbox, ll) && pointInGeometry(ll, s.geometry));
    if (!m) {
      skipped++;
      continue;
    }
    const flags =
      (["pitch", "track", "fitness_station", "golf_course", "horse_riding"].includes(tags["leisure"] ?? "") ||
      tags["covered"] === "no"
        ? "o"
        : "") +
      (/belediye/i.test(`${tags["operator"] ?? ""} ${tags["name"]}`) || tags["operator:type"] === "government"
        ? "b"
        : "");
    venues.push({ id, name: tags["name"], cat, m: m.id, ll, ...(flags ? { f: flags } : {}) });
  }
  console.log(`  ${venues.length} venues classified (${skipped} outside mahalle polygons)`);

  // ---------- aggregate ----------
  const regions: Record<string, RegionMeta> = {};
  for (const r of records) {
    regions[r.id] = { ...r, children: [], venues: 0, counts: {}, top: [] };
  }
  for (const r of records) if (r.parent) regions[r.parent]?.children.push(r.id);
  for (const v of venues) {
    for (let id: string | null = v.m; id; id = regions[id]?.parent ?? null) {
      const region = regions[id]!;
      region.venues++;
      region.counts[v.cat] = (region.counts[v.cat] ?? 0) + 1;
    }
  }
  for (const region of Object.values(regions)) {
    region.top = topCategories(region.counts);
    region.children.sort((a, b) => regions[a]!.name.tr.localeCompare(regions[b]!.name.tr, "tr"));
  }

  const index: RegionIndex = {
    meta: {
      generatedAt: new Date().toISOString(),
      osmDataAt,
      attribution: "© OpenStreetMap katkıda bulunanlar (ODbL)",
    },
    root: "istanbul",
    regions,
  };
  await writeFile(join(DATA, "regions.json"), JSON.stringify(index));

  await rm(join(DATA, "venues"), { recursive: true, force: true });
  await mkdir(join(DATA, "venues"), { recursive: true });
  for (const district of Object.values(regions).filter((r) => r.level === "ilce")) {
    const list = venues
      .filter((v) => regions[v.m]?.parent === district.id)
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));
    await writeFile(join(DATA, "venues", `${district.id}.json`), JSON.stringify(list));
  }

  const ist = regions["istanbul"]!;
  console.log(
    `  İstanbul: ${ist.venues} venues, top: ${ist.top
      .slice(0, 5)
      .map((c) => `${c} ${ist.counts[c]}`)
      .join(", ")}`,
  );
}

await main();
