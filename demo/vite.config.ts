import { fileURLToPath } from "node:url"
import solid from "@solidjs/vite-plugin"
import { defineConfig } from "vite"

const ui = fileURLToPath(new URL("../src", import.meta.url))

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [solid()],
  // ui-sdk's Solid package and the core it loads must be one copy; pre-bundling the core would make two.
  optimizeDeps: { exclude: ["@ui-sdk/core"] },
  resolve: { alias: { "@aiviarium/nocturne": ui } },
  // 4830 unless DEMO_PORT says otherwise.
  server: { host: "127.0.0.1", port: Number(process.env.DEMO_PORT ?? 4830), strictPort: true },
  // The docs site builds a copy with relative URLs into its own folder (DEMO_BASE, DEMO_OUT).
  base: process.env.DEMO_BASE ?? "/",
  build: { outDir: process.env.DEMO_OUT ?? "dist", emptyOutDir: true },
  ...(process.env.DEMO_CACHE_DIR ? { cacheDir: process.env.DEMO_CACHE_DIR } : {}),
})
