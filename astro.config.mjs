// @ts-check
import { defineConfig } from "astro/config";

// Static site for GitHub Pages. Until the custom domain (public/CNAME) is live, Pages serves the
// site under /spormap/; the deploy workflow passes that prefix in via SITE_BASE.
export default defineConfig({
  site: process.env.SITE_ORIGIN ?? "https://spormap.com.tr",
  base: process.env.SITE_BASE || "/",
  output: "static",
  trailingSlash: "ignore",
  build: { format: "directory" },
  i18n: {
    defaultLocale: "tr",
    locales: ["tr", "en"],
    routing: { prefixDefaultLocale: false },
  },
});
