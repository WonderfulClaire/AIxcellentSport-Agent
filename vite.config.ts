import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Plain static SPA build. The app is fully client-side (MediaPipe runs in the
// browser, persistence is localStorage), so it builds to a static site that can
// be hosted on any free static host (CloudStudio / GitHub Pages / etc.).
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "spa-dist",
    chunkSizeWarningLimit: 1500,
  },
});
