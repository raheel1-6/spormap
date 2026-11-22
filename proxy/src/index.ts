/**
 * Places proxy (Cloudflare Worker). The browser never sees the Places API key.
 *
 *   POST /v1/search  { query, bbox: [w, s, e, n], lang: "tr" | "en" }
 *   → { places: Place[] }   (live from Google, Cache-Control: no-store, nothing stored here)
 *
 * Guards, cheapest first: allowed Origin, per-IP rate limit (optional binding), query must be one
 * of our sport keywords, bbox must be small and inside İstanbul, optional Turnstile check, and
 * finally the hard cost cap: a global daily/monthly counter of Google calls (quota.ts), so the
 * free tier can't be exceeded even though Google's own Places quota may not be adjustable.
 */
import categories from "../../src/data/categories.json" with { type: "json" };
import { limitsFrom, type QuotaLimits, type QuotaResult } from "./quota.ts";

/** Minimal view of the QuotaCounter Durable Object namespace used here. */
export interface QuotaNamespace {
  idFromName(name: string): unknown;
  get(id: unknown): { take(limits: QuotaLimits): Promise<QuotaResult> };
}

export interface Env {
  /** Server key restricted to "Places API (New)". Set with `wrangler secret put PLACES_API_KEY`. */
  PLACES_API_KEY: string;
  /** Comma-separated origins allowed to call the proxy. */
  ALLOWED_ORIGINS: string;
  /** Optional Cloudflare Turnstile secret; when set, requests must carry a valid token. */
  TURNSTILE_SECRET?: string;
  /** Optional Workers rate-limit binding (wrangler.toml [[unsafe.bindings]] / ratelimits). */
  RATE_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
  /** Global Google-call counter (Durable Object). Required in production; see wrangler.toml. */
  QUOTA?: QuotaNamespace;
  /** Max Google calls per UTC day / month (defaults 30 / 850). "0" switches ratings off. */
  DAILY_LIMIT?: string;
  MONTHLY_LIMIT?: string;
}

export interface Place {
  id: string;
  name: string;
  rating: number | null;
  count: number;
  ll: [number, number];
  address: string;
  type: string | null;
  mapsUrl: string | null;
}

/** İstanbul with a margin; requests outside are refused. */
const ISTANBUL = { w: 27.8, s: 40.7, e: 30.1, n: 41.7 };
/** Largest search box (degrees). A whole district fits; the whole city does not. */
const MAX_SPAN = 0.7;
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.rating",
  "places.userRatingCount",
  "places.location",
  "places.formattedAddress",
  "places.primaryType",
  "places.googleMapsUri",
].join(",");

/** Only these search phrases are accepted, so the key can't be used for arbitrary searches. */
export const ALLOWED_QUERIES: ReadonlySet<string> = new Set([
  "spor tesisi",
  "sports venue",
  ...categories.categories.flatMap((c) => [...c.keywords.tr, ...c.keywords.en]),
]);

export async function handle(req: Request, env: Env, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = env.ALLOWED_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const cors = allowed.includes(origin)
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, CF-Turnstile-Response",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      }
    : null;
  const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...(cors ?? {}) },
    });

  if (!cors) return reply(403, { error: "origin" });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST" || new URL(req.url).pathname !== "/v1/search")
    return reply(404, { error: "not_found" });

  if (env.RATE_LIMITER) {
    const ip = req.headers.get("CF-Connecting-IP") ?? "unknown";
    if (!(await env.RATE_LIMITER.limit({ key: ip })).success) return reply(429, { error: "rate_limited" });
  }

  let body: { query?: unknown; bbox?: unknown; lang?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return reply(400, { error: "bad_json" });
  }
  const query = typeof body.query === "string" ? body.query.trim().toLocaleLowerCase("tr-TR") : "";
  if (!ALLOWED_QUERIES.has(query)) return reply(400, { error: "query" });
  const bbox = validBBox(body.bbox);
  if (!bbox) return reply(400, { error: "bbox" });
  const lang = body.lang === "en" ? "en" : "tr";

  if (env.TURNSTILE_SECRET) {
    const token = req.headers.get("CF-Turnstile-Response") ?? "";
    if (
      !(await verifyTurnstile(token, env.TURNSTILE_SECRET, req.headers.get("CF-Connecting-IP"), fetchImpl))
    ) {
      return reply(403, { error: "turnstile" });
    }
  }

  // Hard cost cap, checked last so rejected requests never consume it. Fail closed: without the
  // counter binding, Google is never called.
  if (!env.QUOTA) return reply(503, { error: "quota", reason: "not_configured" });
  const quota = await env.QUOTA.get(env.QUOTA.idFromName("global")).take(limitsFrom(env));
  if (!quota.ok) return reply(503, { error: "quota", reason: quota.reason });

  const [w, s, e, n] = bbox;
  const upstream = await fetchImpl("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": env.PLACES_API_KEY,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: lang,
      regionCode: "TR",
      pageSize: 20,
      locationRestriction: {
        rectangle: { low: { latitude: s, longitude: w }, high: { latitude: n, longitude: e } },
      },
    }),
  });
  if (upstream.status === 429) return reply(503, { error: "quota" });
  if (!upstream.ok) return reply(502, { error: "upstream", status: upstream.status });

  const data = (await upstream.json()) as { places?: GooglePlace[] };
  return reply(200, { places: (data.places ?? []).map(toPlace).filter((p): p is Place => p !== null) });
}

interface GooglePlace {
  id?: string;
  displayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  location?: { latitude?: number; longitude?: number };
  formattedAddress?: string;
  primaryType?: string;
  googleMapsUri?: string;
}

function toPlace(p: GooglePlace): Place | null {
  const lat = p.location?.latitude;
  const lng = p.location?.longitude;
  if (!p.id || !p.displayName?.text || lat === undefined || lng === undefined) return null;
  return {
    id: p.id,
    name: p.displayName.text,
    rating: p.rating ?? null,
    count: p.userRatingCount ?? 0,
    ll: [lng, lat],
    address: p.formattedAddress ?? "",
    type: p.primaryType ?? null,
    mapsUrl: p.googleMapsUri ?? null,
  };
}

function validBBox(value: unknown): [number, number, number, number] | null {
  if (
    !Array.isArray(value) ||
    value.length !== 4 ||
    !value.every((v) => typeof v === "number" && Number.isFinite(v))
  ) {
    return null;
  }
  const [w, s, e, n] = value as [number, number, number, number];
  if (w >= e || s >= n) return null;
  if (e - w > MAX_SPAN || n - s > MAX_SPAN) return null;
  if (w < ISTANBUL.w || e > ISTANBUL.e || s < ISTANBUL.s || n > ISTANBUL.n) return null;
  return [w, s, e, n];
}

async function verifyTurnstile(token: string, secret: string, ip: string | null, fetchImpl: typeof fetch) {
  if (!token) return false;
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  const res = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  return res.ok && ((await res.json()) as { success?: boolean }).success === true;
}
