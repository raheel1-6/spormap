/**
 * Hard cap on Google calls, enforced by the proxy itself (Google's Places quota page may not
 * let you lower the limit). Counts every search forwarded to Google, per UTC day and per UTC
 * month; once either limit is reached the proxy answers "quota" without calling Google.
 *
 * Pure logic over a tiny key/value interface so it can be tested without Cloudflare; the
 * Durable Object in quota-do.ts supplies durable storage and serialises concurrent requests.
 */
export interface CounterStorage {
  get<T>(key: string): Promise<T | undefined>;
  put(entries: Record<string, unknown>): Promise<void>;
}

export interface QuotaLimits {
  daily: number;
  monthly: number;
}

export interface QuotaResult {
  ok: boolean;
  reason?: "daily" | "monthly";
  /** Calls counted today / this month, including this one when ok. */
  day: number;
  month: number;
}

/** Defaults keep a single month under ~1,000 free Text Search (Enterprise) calls with margin. */
export const DEFAULT_LIMITS: QuotaLimits = { daily: 30, monthly: 850 };

export async function takeQuota(
  storage: CounterStorage,
  limits: QuotaLimits,
  now: Date = new Date(),
): Promise<QuotaResult> {
  const dayKey = `d:${now.toISOString().slice(0, 10)}`;
  const monthKey = `m:${now.toISOString().slice(0, 7)}`;
  const day = (await storage.get<number>(dayKey)) ?? 0;
  const month = (await storage.get<number>(monthKey)) ?? 0;
  if (day >= limits.daily) return { ok: false, reason: "daily", day, month };
  if (month >= limits.monthly) return { ok: false, reason: "monthly", day, month };
  await storage.put({ [dayKey]: day + 1, [monthKey]: month + 1 });
  return { ok: true, day: day + 1, month: month + 1 };
}

/** Parses limits from Worker vars, falling back to the defaults for missing or invalid values. */
export function limitsFrom(env: { DAILY_LIMIT?: string; MONTHLY_LIMIT?: string }): QuotaLimits {
  const num = (value: string | undefined, fallback: number) => {
    if (value === undefined || value.trim() === "") return fallback;
    const n = Number(value);
    return Number.isInteger(n) && n >= 0 ? n : fallback;
  };
  return {
    daily: num(env.DAILY_LIMIT, DEFAULT_LIMITS.daily),
    monthly: num(env.MONTHLY_LIMIT, DEFAULT_LIMITS.monthly),
  };
}
