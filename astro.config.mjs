// @ts-check
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

export default defineConfig({
  // provisional address; the final name and domain come later (redirects keep the links)
  site: "https://saude.abelhaninja.de",
  output: "static",
  trailingSlash: "always",
  // CSS and scripts as shared files, cached once, instead of inlined in each of the ~10,700 pages
  build: { format: "directory", inlineStylesheets: "never" },
  vite: { build: { assetsInlineLimit: 0 } },
  // out of the sitemap: the error page and the /plano/<registro>/ shortcuts (redirects to the full page)
  integrations: [sitemap({ filter: (page) => !page.endsWith("/404/") && !/\/plano\/\d{6}\/$/.test(page) })],
});
