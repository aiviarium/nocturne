// Test preload: a DOM (happy-dom), then the Solid JSX transform for .tsx and the browser build of solid-js.

import { GlobalRegistrator } from "@happy-dom/global-registrator"
import "./transform"

GlobalRegistrator.register({ url: "http://localhost:4800/", width: 1280, height: 800 })
