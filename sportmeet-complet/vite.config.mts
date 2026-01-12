import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/", // important pour chemins assets (web + mobile)
  plugins: [react()],
  server: {
    port: 5173,
  },
});
