// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  // User/org GitHub Pages site (SaltedC137.github.io) is served at the domain
  // root, so there is no `base` path. `site` is used for canonical URLs/sitemap.
  site: "https://SaltedC137.github.io",
});
