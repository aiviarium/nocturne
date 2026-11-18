// A stack of open layers (popovers, menus, dialogs) so that Escape closes only the topmost one.
import { createSignal } from "solid-js"

const stack: symbol[] = []
const [count, setCount] = createSignal(0)

/** How many layers are open now; reactive. A page in a frame can ask its host to send it Escape only while one is. */
export const openLayers = count

/** Register a layer as the topmost. Returns a function that removes it. */
export function pushLayer(): { id: symbol; remove: () => void; isTop: () => boolean } {
  const id = Symbol("layer")
  stack.push(id)
  setCount(stack.length)
  return {
    id,
    isTop: () => stack[stack.length - 1] === id,
    remove: () => {
      const i = stack.indexOf(id)
      if (i >= 0) {
        stack.splice(i, 1)
        setCount(stack.length)
      }
    },
  }
}
