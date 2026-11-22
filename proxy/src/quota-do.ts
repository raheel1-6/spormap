/**
 * Durable Object holding the global Google-call counter. One instance ("global") serves every
 * request, and Durable Objects process calls one at a time, so the count can't be overrun by
 * concurrent visitors. SQLite-backed (available on the Workers Free plan).
 */
import { DurableObject } from "cloudflare:workers";
import { takeQuota, type QuotaLimits, type QuotaResult } from "./quota.ts";

export class QuotaCounter extends DurableObject {
  async take(limits: QuotaLimits): Promise<QuotaResult> {
    return takeQuota(this.ctx.storage, limits);
  }

  /** Current counts without consuming anything (for monitoring). */
  async peek(): Promise<{ day: number; month: number }> {
    const now = new Date().toISOString();
    return {
      day: (await this.ctx.storage.get<number>(`d:${now.slice(0, 10)}`)) ?? 0,
      month: (await this.ctx.storage.get<number>(`m:${now.slice(0, 7)}`)) ?? 0,
    };
  }
}
