import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifestFilename: "manifest.webmanifest",
      // optionnel mais recommandé pour iOS
      includeAssets: [
        "icons/apple-touch-icon.png",
        "icons/apple-touch-icon-120.png",
        "icons/apple-touch-icon-152.png",
        "icons/apple-touch-icon-167.png",
        "icons/apple-touch-icon-180.png",
      ],
    }),
  ],
  server: {
    port: 5173,
  },
});
