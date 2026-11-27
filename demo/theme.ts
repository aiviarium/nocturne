// The docs site's theme in the demo: `?theme=` in the page's query when it opens, then a message whenever the
// site's theme changes, so the frame restyles without a reload. The fragment stays the demo's address.
import type { Appearance } from "@aiviarium/nocturne"

/** The message the site posts to the demo's frame. */
export interface ThemeMessage {
  type: "nocturne-demo:theme"
  theme: "light" | "dark"
}

const isTheme = (v: unknown): v is "light" | "dark" => v === "light" || v === "dark"

export function bridgeTheme(appearance: Appearance): () => void {
  const asked = new URLSearchParams(location.search).get("theme")
  if (isTheme(asked)) appearance.setTheme(asked)
  const onMessage = (e: MessageEvent) => {
    if (e.origin !== location.origin) return
    const data = e.data as Partial<ThemeMessage> | null
    if (data?.type === "nocturne-demo:theme" && isTheme(data.theme)) appearance.setTheme(data.theme)
  }
  window.addEventListener("message", onMessage)
  return () => window.removeEventListener("message", onMessage)
}
