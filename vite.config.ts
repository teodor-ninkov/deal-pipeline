import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/deal-pipeline/",
  build: { outDir: "docs", emptyOutDir: true }
});
