// @ts-check
import { defineConfig } from "astro/config";

// Static site for GitHub Pages, served at raheel1-6.github.io/spormap/ (no custom domain yet;
// spormap.com.tr is not registered). The deploy workflow passes origin + base path in.
export default defineConfig({
  site: process.env.SITE_ORIGIN ?? "https://raheel1-6.github.io",
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
