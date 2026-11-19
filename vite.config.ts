/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/deal-pipeline/",
  build: {
    outDir: "docs",
    emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: "assets/app.js", chunkFileNames: "assets/[name].js", assetFileNames: "assets/[name][extname]" } }
  },
  test: {
    setupFiles: ["src/__tests__/setup.ts"]
  }
});
