// astro.config.mjs
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";

export default defineConfig({
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
