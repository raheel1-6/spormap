/**
 * Boundary pipeline: OSM admin boundaries for İstanbul → simplified GeoJSON + region index.
 *
 *   node pipeline/build-boundaries.ts [--refresh]
 *
 * Outputs (committed, served statically):
 *   public/data/geo/overview.geojson        il + 2 yaka + 39 ilçe polygons
 *   public/data/geo/mahalle/<ilce>.geojson   mahalle polygons, one file per district (lazy-loaded)
 *   pipeline/out/boundaries.json             region metadata consumed by build-index.ts
 *
 * Levels: province = relation 223474 (admin_level 4), ilçe = admin_level 6, mahalle = admin_level 8.
 * Data © OpenStreetMap contributors, ODbL.
 */
import mapshaper from "mapshaper";
import osmtogeojson from "osmtogeojson";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  bboxContains,
  bboxOf,
  polygonsOf,
  pointInGeometry,
  round,
  type BBox,
  type PolygonalGeometry,
  type Position,
} from "../src/lib/geo.ts";
import { slugify, stripMahalleSuffix } from "../src/lib/slug.ts";
import { yakaOf } from "../src/data/yaka.ts";
import { overpass } from "./overpass.ts";

const ROOT = join(import.meta.dirname, "..");
const CACHE = join(ROOT, "pipeline/cache");
const OUT = join(ROOT, "pipeline/out");
const GEO = join(ROOT, "public/data/geo");
const refresh = process.argv.includes("--refresh");

/** Simplification tolerances (metres). Overview is seen zoomed out; mahalle up close. */
const OVERVIEW_INTERVAL = 60;
const MAHALLE_INTERVAL = 12;

type Poly = Polygon | MultiPolygon;
type Props = Record<string, unknown>;

export interface BoundaryRecord {
  id: string;
  slug: string;
  name: { tr: string; en: string };
  level: "il" | "yaka" | "ilce" | "mahalle";
  parent: string | null;
  label: Position;
  bbox: BBox;
}

async function main() {
  console.log("Fetching OSM boundaries…");
  const raw = await overpass(
    `[out:json][timeout:600];
     rel(223474)->.prov;
     .prov map_to_area->.ist;
     (.prov; rel(area.ist)["boundary"="administrative"]["admin_level"~"^(6|8)$"];);
     out geom;`,
    join(CACHE, "osm-boundaries.json"),
    refresh,
  );
  const osmDataAt = raw.osm3s?.timestamp_osm_base ?? null;

  const all = osmtogeojson(raw).features.filter(
    (f): f is Feature<Poly, Props> =>
      (f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon") &&
      String(f.id ?? "").startsWith("relation/"),
  );
  const tagsOf = (f: Feature<Poly, Props>) =>
    (f.properties["tags"] ?? f.properties) as Record<string, string>;
  const byLevel = (level: string) => all.filter((f) => tagsOf(f)["admin_level"] === level);

  // ---------- ilçe ----------
  const districts = byLevel("6").map((f) => {
    const tags = tagsOf(f);
    const name = tags["name:tr"] ?? tags["name"] ?? "";
    const slug = slugify(name);
    const side = yakaOf(slug);
    if (!side) throw new Error(`District "${name}" (${slug}) is not in src/data/yaka.ts`);
    return { id: slug, slug, name: { tr: name, en: tags["name:en"] ?? name }, side, geometry: f.geometry };
  });
  if (districts.length !== 39) throw new Error(`Expected 39 districts, got ${districts.length}`);
  console.log(`  ${districts.length} ilçe`);

  // ---------- mahalle: assign to the district containing most of its vertices ----------
  const districtBoxes = districts.map((d) => ({
    d,
    bbox: bboxOf(d.geometry as unknown as PolygonalGeometry),
  }));
  const usedSlugs = new Map<string, Set<string>>();
  const mahalleler: {
    id: string;
    slug: string;
    name: { tr: string; en: string };
    parent: string;
    geometry: Poly;
  }[] = [];
  let orphans = 0;
  for (const f of byLevel("8")) {
    const tags = tagsOf(f);
    const rawName = tags["name:tr"] ?? tags["name"];
    if (!rawName) continue;
    const parent = assignParent(f.geometry, districtBoxes);
    if (!parent) {
      orphans++;
      continue;
    }
    const name = stripMahalleSuffix(rawName);
    const taken = usedSlugs.get(parent) ?? new Set<string>();
    let slug = slugify(name);
    for (let n = 2; taken.has(slug); n++) slug = `${slugify(name)}-${n}`;
    taken.add(slug);
    usedSlugs.set(parent, taken);
    const nameEn = tags["name:en"] ? stripMahalleSuffix(tags["name:en"]) : name;
    mahalleler.push({
      id: `${parent}--${slug}`,
      slug,
      name: { tr: name, en: nameEn },
      parent,
      geometry: f.geometry,
    });
  }
  console.log(`  ${mahalleler.length} mahalle (${orphans} outside every district, skipped)`);

  // ---------- simplify + dissolve with mapshaper ----------
  console.log("Simplifying…");
  const ilceFc = fc(districts.map((d) => feature(d.geometry, { id: d.id, side: d.side })));
  const ilceSimple = await ms(
    `-i ilce.json -clean -simplify interval=${OVERVIEW_INTERVAL} keep-shapes -clean -o out.json format=geojson precision=0.00001`,
    { "ilce.json": ilceFc },
  );
  const yakaSimple = await ms(
    `-i ilce.json -dissolve2 side copy-fields=side -each "id=side" -o out.json format=geojson precision=0.00001`,
    { "ilce.json": ilceSimple },
  );
  const ilSimple = await ms(
    `-i ilce.json -dissolve2 -each "id='istanbul'" -o out.json format=geojson precision=0.00001`,
    {
      "ilce.json": ilceSimple,
    },
  );

  const mahalleFc = fc(mahalleler.map((m) => feature(m.geometry, { id: m.id, parent: m.parent })));
  const mahalleSimple = await ms(
    `-i m.json -clean -simplify interval=${MAHALLE_INTERVAL} keep-shapes -clean -o out.json format=geojson precision=0.00001`,
    { "m.json": mahalleFc },
  );

  // Label anchors: mapshaper's "inner" point is well inside concave shapes.
  const labels = new Map<string, Position>();
  for (const layer of [ilSimple, yakaSimple, ilceSimple, mahalleSimple]) {
    const pts = await ms(`-i in.json -points inner -o out.json format=geojson precision=0.00001`, {
      "in.json": layer,
    });
    for (const p of pts.features) {
      const coords = (p.geometry as unknown as { coordinates: Position }).coordinates;
      labels.set(String(p.properties?.["id"]), [round(coords[0]), round(coords[1])]);
    }
  }

  // ---------- records ----------
  const geomById = new Map<string, Poly>();
  for (const layer of [ilSimple, yakaSimple, ilceSimple, mahalleSimple]) {
    for (const f of layer.features) geomById.set(String(f.properties?.["id"]), f.geometry as Poly);
  }
  const rec = (r: Omit<BoundaryRecord, "label" | "bbox">): BoundaryRecord => {
    const g = geomById.get(r.id);
    if (!g) throw new Error(`No simplified geometry for ${r.id}`);
    const label = labels.get(r.id);
    if (!label) throw new Error(`No label point for ${r.id}`);
    return { ...r, label, bbox: bboxOf(g as PolygonalGeometry).map((v) => round(v)) as BBox };
  };
  const records: BoundaryRecord[] = [
    rec({
      id: "istanbul",
      slug: "istanbul",
      name: { tr: "İstanbul", en: "Istanbul" },
      level: "il",
      parent: null,
    }),
    rec({
      id: "avrupa-yakasi",
      slug: "avrupa-yakasi",
      name: { tr: "Avrupa Yakası", en: "European Side" },
      level: "yaka",
      parent: "istanbul",
    }),
    rec({
      id: "anadolu-yakasi",
      slug: "anadolu-yakasi",
      name: { tr: "Anadolu Yakası", en: "Asian Side" },
      level: "yaka",
      parent: "istanbul",
    }),
    ...districts.map((d) => rec({ id: d.id, slug: d.slug, name: d.name, level: "ilce", parent: d.side })),
    ...mahalleler
      .filter((m) => geomById.has(m.id))
      .map((m) => rec({ id: m.id, slug: m.slug, name: m.name, level: "mahalle", parent: m.parent })),
  ];

  // ---------- write ----------
  await rm(join(GEO, "mahalle"), { recursive: true, force: true });
  await mkdir(join(GEO, "mahalle"), { recursive: true });
  await mkdir(OUT, { recursive: true });

  const levelOf = new Map(records.map((r) => [r.id, r.level]));
  const overview = fc(
    [ilSimple, yakaSimple, ilceSimple].flatMap((layer) =>
      layer.features.map((f) =>
        feature(f.geometry as Poly, {
          id: f.properties?.["id"],
          level: levelOf.get(String(f.properties?.["id"])),
        }),
      ),
    ),
  );
  await writeFile(join(GEO, "overview.geojson"), JSON.stringify(overview));

  for (const d of districts) {
    const features = mahalleSimple.features
      .filter((f) => f.properties?.["parent"] === d.id)
      .map((f) => feature(f.geometry as Poly, { id: f.properties?.["id"], level: "mahalle" }));
    await writeFile(join(GEO, "mahalle", `${d.id}.geojson`), JSON.stringify(fc(features)));
  }

  await writeFile(join(OUT, "boundaries.json"), JSON.stringify({ osmDataAt, records }, null, 1));
  console.log(`Wrote ${records.length} regions. OSM data as of ${osmDataAt}.`);
}

function assignParent(
  geometry: Poly,
  districts: { d: { id: string; geometry: Poly }; bbox: BBox }[],
): string | null {
  const vertices = polygonsOf(geometry as PolygonalGeometry).flatMap((p) => p[0] ?? []);
  const step = Math.max(1, Math.floor(vertices.length / 60)); // sample ≤ ~60 vertices
  const votes = new Map<string, number>();
  for (let i = 0; i < vertices.length; i += step) {
    const v = vertices[i]!;
    for (const { d, bbox } of districts) {
      if (bboxContains(bbox, v) && pointInGeometry(v, d.geometry as PolygonalGeometry)) {
        votes.set(d.id, (votes.get(d.id) ?? 0) + 1);
      }
    }
  }
  let best: string | null = null;
  let max = 0;
  for (const [id, n] of votes) if (n > max) [best, max] = [id, n];
  return best;
}

function feature(geometry: Poly, properties: Props): Feature<Poly, Props> {
  return { type: "Feature", properties, geometry };
}

function fc(features: Feature[]): FeatureCollection {
  return { type: "FeatureCollection", features };
}

async function ms(commands: string, input: Record<string, unknown>): Promise<FeatureCollection> {
  const out = await mapshaper.applyCommands(commands, input);
  const text = out["out.json"];
  if (text === undefined) throw new Error(`mapshaper produced no output for: ${commands}`);
  return JSON.parse(typeof text === "string" ? text : new TextDecoder().decode(text)) as FeatureCollection;
}

await main();
