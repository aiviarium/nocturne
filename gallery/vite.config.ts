import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
import solid from "vite-plugin-solid"

const ui = fileURLToPath(new URL("../src", import.meta.url))

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [solid()],
  resolve: { alias: { "@aiviarium/nocturne": ui } },
  // 4800 unless GALLERY_PORT says otherwise (the browser tests run their own copy).
  server: { host: "127.0.0.1", port: Number(process.env.GALLERY_PORT ?? 4800), strictPort: true },
  // A docs site can build a copy with relative URLs into its own folder (GALLERY_BASE, GALLERY_OUT).
  base: process.env.GALLERY_BASE ?? "/",
  build: { outDir: process.env.GALLERY_OUT ?? "dist", emptyOutDir: true },
  // Several galleries can run at once (browser test shards); each keeps its own dependency cache, so they do
  // not optimise into the same folder at once.
  ...(process.env.GALLERY_CACHE_DIR ? { cacheDir: process.env.GALLERY_CACHE_DIR } : {}),
})
