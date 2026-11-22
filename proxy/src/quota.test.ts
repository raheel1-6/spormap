import { describe, expect, it } from "vitest";
import { limitsFrom, takeQuota, type CounterStorage } from "./quota.ts";

function memoryStorage(): CounterStorage & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return {
    data,
    async get<T>(key: string) {
      return data.get(key) as T | undefined;
    },
    async put(entries) {
      for (const [k, v] of Object.entries(entries)) data.set(k, v);
    },
  };
}

const day1 = new Date("2026-11-22T10:00:00Z");
const day2 = new Date("2026-11-23T00:00:01Z");
const nextMonth = new Date("2026-12-01T00:00:01Z");

describe("takeQuota", () => {
  it("allows calls up to the daily limit, then refuses", async () => {
    const s = memoryStorage();
    const limits = { daily: 3, monthly: 100 };
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await takeQuota(s, limits, day1));
    expect(results.map((r) => r.ok)).toEqual([true, true, true, false]);
    expect(results[3]).toMatchObject({ reason: "daily", day: 3, month: 3 });
  });

  it("resets the daily count on a new UTC day but keeps the month", async () => {
    const s = memoryStorage();
    const limits = { daily: 2, monthly: 100 };
    await takeQuota(s, limits, day1);
    await takeQuota(s, limits, day1);
    const next = await takeQuota(s, limits, day2);
    expect(next).toMatchObject({ ok: true, day: 1, month: 3 });
  });

  it("enforces the monthly limit across days and resets next month", async () => {
    const s = memoryStorage();
    const limits = { daily: 10, monthly: 3 };
    await takeQuota(s, limits, day1);
    await takeQuota(s, limits, day1);
    await takeQuota(s, limits, day2);
    expect(await takeQuota(s, limits, day2)).toMatchObject({ ok: false, reason: "monthly" });
    expect(await takeQuota(s, limits, nextMonth)).toMatchObject({ ok: true, day: 1, month: 1 });
  });

  it("does not count refused calls", async () => {
    const s = memoryStorage();
    const limits = { daily: 1, monthly: 100 };
    await takeQuota(s, limits, day1);
    await takeQuota(s, limits, day1);
    await takeQuota(s, limits, day1);
    expect(s.data.get("m:2026-11")).toBe(1);
  });
});

describe("limitsFrom", () => {
  it("reads Worker vars and falls back on bad values", () => {
    expect(limitsFrom({ DAILY_LIMIT: "20", MONTHLY_LIMIT: "500" })).toEqual({ daily: 20, monthly: 500 });
    expect(limitsFrom({ DAILY_LIMIT: "abc" })).toEqual({ daily: 30, monthly: 850 });
    expect(limitsFrom({ DAILY_LIMIT: "0" }).daily).toBe(0); // 0 = ratings switched off
  });
});
