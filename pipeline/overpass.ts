import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/** Public Overpass instances, tried in order. Please keep request volume low (monthly rebuilds). */
const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const USER_AGENT = "spormap-pipeline/0.1 (+https://github.com/raheel1-6/spormap)";

export interface OverpassResult {
  osm3s?: { timestamp_osm_base?: string };
  elements: unknown[];
}

/**
 * Runs an Overpass query, caching the raw response at `cachePath`.
 * Pass `refresh` to ignore the cache (the monthly CI job does).
 */
export async function overpass(query: string, cachePath: string, refresh = false): Promise<OverpassResult> {
  if (!refresh && existsSync(cachePath)) {
    return JSON.parse(await readFile(cachePath, "utf8")) as OverpassResult;
  }
  let lastError: unknown;
  for (const endpoint of ENDPOINTS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ data: query }),
          signal: AbortSignal.timeout(400_000),
        });
        const text = await res.text();
        if (!res.ok || !text.startsWith("{"))
          throw new Error(`${endpoint} → HTTP ${res.status}: ${text.slice(0, 120)}`);
        const json = JSON.parse(text) as OverpassResult & { remark?: string };
        if (json.remark?.includes("runtime error")) throw new Error(`${endpoint} → ${json.remark}`);
        await mkdir(dirname(cachePath), { recursive: true });
        await writeFile(cachePath, text);
        return json;
      } catch (error) {
        lastError = error;
        console.warn(`  overpass attempt ${attempt} failed: ${(error as Error).message}`);
        await new Promise((r) => setTimeout(r, 5000 * attempt));
      }
    }
  }
  throw lastError;
}
