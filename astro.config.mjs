// @ts-check
import { defineConfig } from "astro/config";

// Static site for GitHub Pages on the custom domain (public/CNAME).
export default defineConfig({
  site: "https://spormap.com.tr",
  output: "static",
  trailingSlash: "ignore",
  build: { format: "directory" },
  i18n: {
    defaultLocale: "tr",
    locales: ["tr", "en"],
    routing: { prefixDefaultLocale: false },
  },
});
