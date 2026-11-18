import { defineConfig } from "vite";

// Bundles the content script into a single IIFE. scripts/assemble.mjs then
// lays out dist/chrome and dist/firefox with their own manifests.
export default defineConfig({
  build: {
    outDir: "dist/.bundle",
    emptyOutDir: true,
    target: "es2022",
    minify: false,
    rollupOptions: {
      input: {
        content: "src/content/bootstrap.ts",
      },
      output: {
        entryFileNames: "content.js",
        format: "iife",
        name: "NodContentScript",
      },
    },
  },
});
