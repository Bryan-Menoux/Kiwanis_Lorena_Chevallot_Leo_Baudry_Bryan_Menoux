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
  },

  adapter: node({
    mode: "standalone",
  }),

  output: "server",
});
