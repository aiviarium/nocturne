import { type JSX, onCleanup } from "solid-js"
import { Portal } from "solid-js/web"

/**
 * Where an overlay mounts. It goes inside the nearest element carrying `data-theme` (so it
 * inherits the theme and `--accent` of the thing that opened it) and falls back to `document.body`.
 */
export function overlayHost(anchor?: Element | null): HTMLElement {
  const themed = anchor?.closest("[data-theme]") as HTMLElement | null | undefined
  if (themed && themed !== document.documentElement && themed !== document.body) return themed
  return document.body
}

/**
 * Portal for popovers, dialogs, tooltips and toasts. Content lands in a `div.nc` that inherits the
 * opener's theme, so tokens and `nc-*` classes work even outside the app root.
 */
export function Overlay(props: { anchor?: Element | null; children: JSX.Element }): JSX.Element {
  const host = overlayHost(props.anchor)
  return (
    <Portal
      mount={host}
      ref={(container) => {
        container.classList.add("nc")
        container.setAttribute("data-part", "overlay-root")
        if (host === document.body) followTheme(container, props.anchor ?? document.documentElement)
      }}
    >
      {props.children}
    </Portal>
  )
}

/**
 * Copy the theme and accent of the themed element around `source` onto an overlay root that lives in `body`, and
 * keep them in step: a toast region outlives theme switches, and a dialog can be open while one happens.
 */
function followTheme(container: HTMLElement, source: Element): void {
  const themed = source.closest("[data-theme]") ?? document.documentElement
  const copy = () => {
    const theme = themed.getAttribute("data-theme")
    if (theme) container.setAttribute("data-theme", theme)
    const accent = getComputedStyle(source).getPropertyValue("--accent").trim()
    if (accent) container.style.setProperty("--accent", accent)
  }
  copy()
  if (typeof MutationObserver === "undefined") return
  const observer = new MutationObserver(copy)
  observer.observe(themed, { attributes: true, attributeFilter: ["data-theme", "style"] })
  onCleanup(() => observer.disconnect())
}
