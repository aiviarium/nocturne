// The examples as a library for a docs site: one ES module (`nocturne-examples.js`) and its stylesheet
// (`nocturne-examples.css`), written to EXAMPLES_OUT (default `examples/dist`).
import { fileURLToPath } from "node:url"
import solid from "@solidjs/vite-plugin"
import { defineConfig } from "vite"

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  root: here("."),
  plugins: [solid()],
  resolve: { alias: { "@aiviarium/nocturne": here("../src") } },
  // A library build keeps `process.env.NODE_ENV` as written; the browser has no `process`.
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: process.env.EXAMPLES_OUT ?? here("dist"),
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: { entry: here("mount.tsx"), formats: ["es"], fileName: () => "nocturne-examples.js" },
    rollupOptions: { output: { assetFileNames: "nocturne-examples[extname]" } },
  },
})
