import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "SteadyCut Coach",
        short_name: "SteadyCut",
        theme_color: "#17311f",
        background_color: "#f6f1e8",
        display: "standalone",
        start_url: "/",
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
