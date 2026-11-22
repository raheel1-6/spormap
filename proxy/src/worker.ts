/** Worker entry: request handling lives in index.ts (tested in Node); this adds Cloudflare bindings. */
import { handle, type Env } from "./index.ts";

export { QuotaCounter } from "./quota-do.ts";

export default {
  fetch: (req: Request, env: Env) => handle(req, env),
};
