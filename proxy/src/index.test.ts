import { describe, expect, it, vi } from "vitest";
import { ALLOWED_QUERIES, handle, type Env } from "./index.ts";

const ORIGIN = "https://raheel1-6.github.io";
const env: Env = { PLACES_API_KEY: "test-key", ALLOWED_ORIGINS: `${ORIGIN},http://localhost:4321` };
const kadikoy = [29.01579, 40.95134, 29.11123, 41.0123];

function request(body: unknown, { origin = ORIGIN, method = "POST", path = "/v1/search" } = {}) {
  return new Request(`https://proxy.example${path}`, {
    method,
    headers: { Origin: origin, "Content-Type": "application/json" },
    ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
  });
}

const googleOk = () =>
  vi.fn(async () =>
    Response.json({
      places: [
        {
          id: "ChIJ1",
          displayName: { text: "Kort Tenis" },
          rating: 4.8,
          userRatingCount: 312,
          location: { latitude: 40.97, longitude: 29.06 },
          formattedAddress: "Caddebostan, Kadıköy",
          primaryType: "sports_club",
          googleMapsUri: "https://maps.google.com/?cid=1",
        },
        { id: "broken" }, // missing name/location → dropped
      ],
    }),
  );

describe("places proxy", () => {
  it("refuses unknown origins", async () => {
    const res = await handle(request({}, { origin: "https://evil.example" }), env, googleOk());
    expect(res.status).toBe(403);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("answers CORS preflight for allowed origins", async () => {
    const res = await handle(request(null, { method: "OPTIONS" }), env, googleOk());
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
  });

  it("only accepts sport keywords", async () => {
    expect(ALLOWED_QUERIES.has("halı saha")).toBe(true);
    const res = await handle(request({ query: "pizza", bbox: kadikoy }), env, googleOk());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "query" });
  });

  it("refuses boxes that are too big or outside İstanbul", async () => {
    const fetchMock = googleOk();
    const tooBig = await handle(
      request({ query: "halı saha", bbox: [28, 40.8, 29.9, 41.5] }),
      env,
      fetchMock,
    );
    const ankara = await handle(
      request({ query: "halı saha", bbox: [32.8, 39.9, 32.9, 40] }),
      env,
      fetchMock,
    );
    expect(tooBig.status).toBe(400);
    expect(ankara.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls Places Text Search with the key, field mask and a location restriction", async () => {
    const fetchMock = googleOk();
    const res = await handle(request({ query: "Halı Saha", bbox: kadikoy, lang: "tr" }), env, fetchMock);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://places.googleapis.com/v1/places:searchText");
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Goog-Api-Key"]).toBe("test-key");
    expect(headers["X-Goog-FieldMask"]).toContain("places.rating");
    const sent = JSON.parse(init.body as string);
    expect(sent.textQuery).toBe("halı saha");
    expect(sent.locationRestriction.rectangle.low).toEqual({ latitude: 40.95134, longitude: 29.01579 });

    expect(await res.json()).toEqual({
      places: [
        {
          id: "ChIJ1",
          name: "Kort Tenis",
          rating: 4.8,
          count: 312,
          ll: [29.06, 40.97],
          address: "Caddebostan, Kadıköy",
          type: "sports_club",
          mapsUrl: "https://maps.google.com/?cid=1",
        },
      ],
    });
  });

  it("reports Google quota exhaustion as 503 quota", async () => {
    const res = await handle(
      request({ query: "tenis kortu", bbox: kadikoy }),
      env,
      vi.fn(async () => new Response("{}", { status: 429 })),
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "quota" });
  });

  it("enforces the rate limiter and Turnstile when configured", async () => {
    const limited = await handle(
      request({ query: "tenis kortu", bbox: kadikoy }),
      { ...env, RATE_LIMITER: { limit: async () => ({ success: false }) } },
      googleOk(),
    );
    expect(limited.status).toBe(429);

    const noToken = await handle(
      request({ query: "tenis kortu", bbox: kadikoy }),
      { ...env, TURNSTILE_SECRET: "secret" },
      googleOk(),
    );
    expect(noToken.status).toBe(403);
  });
});
