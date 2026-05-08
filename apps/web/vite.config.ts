import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "maskable-icon.png"],
      manifest: {
        name: "SteadyCut Coach",
        short_name: "SteadyCut",
        description: "Adaptive AI coaching for practical, repeatable weight loss.",
        theme_color: "#17311f",
        background_color: "#f6f1e8",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "pwa-512x521.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "pwa-512x521.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
