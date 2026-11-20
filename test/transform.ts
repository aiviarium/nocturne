// The Solid JSX transform for .tsx and the browser build of solid-js, for tests that need no DOM (models
// that import the widget set but draw nothing). `setup.ts` adds a DOM to it for the UI's own tests.

import { readFileSync } from "node:fs"
import { transform } from "@solidjs/compiler"
import { plugin } from "bun"

// Bun resolves solid-js and @solidjs/web to their server builds under the "node" condition. Serve the browser
// build's contents for the server files so there is a single DOM-capable copy without needing --conditions.
const SERVER_TO_BROWSER: Array<[RegExp, string]> = [
  [/solid-js[\\/]dist[\\/]server\.js$/, "solid.js"],
  [/@solidjs[\\/]web[\\/]dist[\\/]server\.js$/, "web.js"],
]

plugin({
  name: "solid",
  setup(build) {
    build.onLoad({ filter: /(solid-js|@solidjs[\\/]web)[\\/]dist[\\/]server\.js$/ }, (args) => {
      const hit = SERVER_TO_BROWSER.find(([re]) => re.test(args.path))
      if (!hit) return undefined
      return { contents: readFileSync(args.path.replace(/server\.js$/, hit[1]), "utf8"), loader: "js" }
    })
    build.onLoad({ filter: /\.tsx$/ }, (args) => {
      const result = transform(readFileSync(args.path, "utf8"), {
        filename: args.path,
        generate: "dom",
        hydratable: false,
      })
      return { contents: result.code, loader: "ts" }
    })
  },
})
