// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";

export default defineConfig({
  vite: { plugins: [tailwindcss()] },

  site: "https://kiwanis-pays-de-montbeliard.bryan-menoux.fr",

  security: {
    checkOrigin: true,
    allowedDomains: [
      {
        hostname: "kiwanis-pays-de-montbeliard.bryan-menoux.fr",
        protocol: "https",
        port: "443",
      },
    ],
  },

  adapter: node({ mode: "standalone" }),
  output: "server",
});
