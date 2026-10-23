// @ts-check
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

export default defineConfig({
  // provisional address; the final name and domain come later (redirects keep the links)
  site: "https://saude.abelhaninja.de",
  output: "static",
  trailingSlash: "always",
  build: { format: "directory" },
  integrations: [sitemap({ filter: (page) => !page.endsWith("/404/") })],
});
