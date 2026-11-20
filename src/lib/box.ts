// How tall the box an element was given is, for parts that lay themselves out by it (a stat's figure steps up
// in a tall box). A ResizeObserver rather than a CSS size container: size containment would collapse the part
// to nothing wherever its height comes from its content (a grid row of auto height, a phone's stacked grid).
import { createSignal, onCleanup, onSettled } from "solid-js"

/** The content-box height at which a filled stat's figure takes the large size. */
export const TALL_BOX = 112

/** Whether `el()`'s content box is at least `min` px tall. Reactive; false until measured. */
export function createTallBox(el: () => Element | undefined, min = TALL_BOX): () => boolean {
  const [tall, setTall] = createSignal(false)
  onSettled(() => {
    const target = el()
    if (!target || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver((entries) => {
      const height = entries[entries.length - 1]?.contentRect.height ?? 0
      setTall(height >= min)
    })
    observer.observe(target)
    onCleanup(() => observer.disconnect())
  })
  return tall
}
