import { computePosition, type Placement } from "./position"

export interface FloatOptions {
  placement?: Placement
  offset?: number
  /** Give the floating box at least the anchor's width. */
  matchWidth?: boolean
}

/**
 * Position `float` (fixed) next to `anchor`, and keep it there on scroll, resize and size changes.
 * Returns a function that stops tracking.
 */
export function floatTo(anchor: HTMLElement, float: HTMLElement, options: FloatOptions = {}): () => void {
  const update = () => {
    const a = anchor.getBoundingClientRect()
    if (options.matchWidth) float.style.minWidth = `${a.width}px`
    const f = float.getBoundingClientRect()
    const result = computePosition({
      anchor: { left: a.left, top: a.top, width: a.width, height: a.height },
      float: { left: 0, top: 0, width: f.width, height: f.height },
      viewport: { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight },
      placement: options.placement,
      offset: options.offset,
    })
    float.style.left = `${Math.round(result.left)}px`
    float.style.top = `${Math.round(result.top)}px`
    float.dataset.placement = result.placement
  }
  update()
  window.addEventListener("resize", update)
  window.addEventListener("scroll", update, true)
  const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(update)
  observer?.observe(float)
  return () => {
    window.removeEventListener("resize", update)
    window.removeEventListener("scroll", update, true)
    observer?.disconnect()
  }
}
