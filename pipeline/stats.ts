/**
 * Prints size and vertex statistics for the generated geometry (used for docs/PERFORMANCE.md).
 *   node pipeline/stats.ts
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const GEO = join(import.meta.dirname, "../public/data/geo");

async function describe(path: string) {
  const text = await readFile(path, "utf8");
  const fc = JSON.parse(text) as { features: { geometry: { coordinates: unknown } }[] };
  const vertices = fc.features.reduce(
    (n, f) => n + JSON.stringify(f.geometry.coordinates).split("],[").length,
    0,
  );
  return {
    bytes: (await stat(path)).size,
    gzip: gzipSync(text).length,
    vertices,
    features: fc.features.length,
  };
}

const overview = await describe(join(GEO, "overview.geojson"));
console.log(
  `overview: ${overview.features} features, ${overview.vertices} vertices, ${kb(overview.bytes)} (${kb(overview.gzip)} gz)`,
);

const rows = [];
for (const file of await readdir(join(GEO, "mahalle"))) {
  rows.push({ district: file.replace(".geojson", ""), ...(await describe(join(GEO, "mahalle", file))) });
}
rows.sort((a, b) => b.vertices - a.vertices);
const total = rows.reduce((t, r) => ({ v: t.v + r.vertices, b: t.b + r.bytes, g: t.g + r.gzip }), {
  v: 0,
  b: 0,
  g: 0,
});
console.log(`mahalle: ${rows.length} files, ${total.v} vertices, ${kb(total.b)} (${kb(total.g)} gz)`);
for (const r of [...rows.slice(0, 4), ...rows.filter((r) => r.district === "kadikoy")]) {
  console.log(
    `  ${r.district.padEnd(14)} ${String(r.features).padStart(3)} mahalle ${String(r.vertices).padStart(6)} vertices ${kb(r.gzip).padStart(8)} gz`,
  );
}

function kb(n: number) {
  return `${(n / 1024).toFixed(0)} KB`;
}
