// astro.config.mjs
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";

export default defineConfig({
  image: {
    responsiveStyles: true,
  },

  build: {
    inlineStylesheets: "always",
  },

  vite: {
    plugins: [tailwindcss()],
  },

  security: {
    checkOrigin: true,
    allowedDomains: [
      {
        protocol: "https",
        hostname: "kiwanis-pays-de-montbeliard.bryan-menoux.fr" || "https://www.kiwanis-pays-de-montbeliard.fr",
      },
    ],
  },
  devToolbar: {
    enabled: false
  },

  adapter: node({
    mode: "standalone",
  }),

  output: "server",
});
