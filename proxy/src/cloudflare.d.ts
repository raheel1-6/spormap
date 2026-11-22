/** Minimal types for the parts of the Workers runtime this proxy uses (full: @cloudflare/workers-types). */
declare module "cloudflare:workers" {
  interface DurableObjectStorage {
    get<T>(key: string): Promise<T | undefined>;
    put(entries: Record<string, unknown>): Promise<void>;
  }
  interface DurableObjectState {
    readonly storage: DurableObjectStorage;
  }
  export abstract class DurableObject<Env = unknown> {
    protected readonly ctx: DurableObjectState;
    protected readonly env: Env;
    constructor(ctx: DurableObjectState, env: Env);
  }
}
