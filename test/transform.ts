// The Solid JSX transform for .tsx and the browser build of solid-js, for tests that need no DOM (models
// that import the widget set but draw nothing). `setup.ts` adds a DOM to it for the UI's own tests.

import { readFileSync } from "node:fs"
import { transformAsync } from "@babel/core"
import typescript from "@babel/preset-typescript"
import solid from "babel-preset-solid"
import { plugin } from "bun"

// Bun resolves solid-js to its server build under the "node" condition. Serve the browser build's
// contents for the server files so there is a single DOM-capable copy without needing --conditions.
const SERVER_TO_BROWSER: Array<[RegExp, string]> = [
  [/solid-js[\\/]dist[\\/]server\.js$/, "solid.js"],
  [/solid-js[\\/]web[\\/]dist[\\/]server\.js$/, "web.js"],
  [/solid-js[\\/]store[\\/]dist[\\/]server\.js$/, "store.js"],
]

plugin({
  name: "solid",
  setup(build) {
    build.onLoad({ filter: /solid-js[\\/].*server\.js$|solid-js[\\/]dist[\\/]server\.js$/ }, (args) => {
      const hit = SERVER_TO_BROWSER.find(([re]) => re.test(args.path))
      if (!hit) return undefined
      return { contents: readFileSync(args.path.replace(/server\.js$/, hit[1]), "utf8"), loader: "js" }
    })
    build.onLoad({ filter: /\.tsx$/ }, async (args) => {
      const code = readFileSync(args.path, "utf8")
      const result = await transformAsync(code, {
        filename: args.path,
        // The presets as modules, so they resolve from here whichever folder runs the tests (an app's tests can preload it too).
        presets: [[solid, { generate: "dom", hydratable: false }], typescript],
        babelrc: false,
        configFile: false,
      })
      return { contents: result?.code ?? "", loader: "js" }
    })
  },
})
