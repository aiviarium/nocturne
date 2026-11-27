// The demo in a page: the address bar's fragment is the router and localStorage the store. Opened from the docs
// site, `?theme=light|dark` sets the theme, and the site's theme switch sends the new one as a message.
import { hashRouter, webStorage } from "@aiviarium/nocturne"
import { render } from "@solidjs/web"
import "@aiviarium/nocturne/styles/index.css"
import "./demo.css"
import { DemoApp, STORE_PREFIX } from "./app"
import { bridgeTheme } from "./theme"

const storage = webStorage(localStorage, STORE_PREFIX)
render(
  () => <DemoApp router={hashRouter()} storage={storage} onReady={bridgeTheme} />,
  document.getElementById("root") as HTMLElement,
)
