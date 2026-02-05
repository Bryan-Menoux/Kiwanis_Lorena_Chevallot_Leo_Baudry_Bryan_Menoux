// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },

  // Origin for CSRF validation in SSR
  site: "https://kiwanis-pays-de-montbeliard.bryan-menoux.fr",

  // Explicit security configuration
  security: {
    checkOrigin: true,
  },

  adapter: node({
    mode: "standalone",
  }),
  output: "server",
});