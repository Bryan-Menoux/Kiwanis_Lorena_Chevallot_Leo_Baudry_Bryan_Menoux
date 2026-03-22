// astro.config.mjs
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";

export default defineConfig({
  image: {
    responsiveStyles: true,
  },

  build: {
    inlineStylesheets: "auto",
  },

  vite: {
    plugins: [tailwindcss()],
  },

  security: {
    checkOrigin: true,
    allowedDomains: [
      {
        protocol: "https",
        hostname: "kiwanis-pays-de-montbeliard.bryan-menoux.fr",
      },
      {
        protocol: "https",
        hostname: "www.kiwanis-pays-de-montbeliard.fr",
      },
      {
        protocol: "https",
        hostname: "kiwanis-pays-de-montbeliard.fr",
      },
    ],
  },
  devToolbar: {
    enabled: false
  },

  adapter: node({
    mode: "standalone",
  }),
  server: {
    host: true,
  },

  output: "server",
});
