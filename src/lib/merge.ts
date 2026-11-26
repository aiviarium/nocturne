// A ui-sdk part's props spread on an element Nocturne draws. The element's own props stay reactive; where both
// have a handler or a ref, both run, the element's first, and a handler that called preventDefault skips the
// part's.
import { merge, untrack } from "solid-js"

type Props = Record<string, unknown>

function call(handler: unknown, arg: unknown): void {
  if (typeof handler === "function") handler(arg)
  else if (Array.isArray(handler) && typeof handler[0] === "function") handler[0](handler[1], arg)
}

/** mergeParts joins an element's own props with a ui-sdk part's. */
export function mergeParts<T extends object>(own: T, part: Props): T {
  const joined: Props = {}
  for (const key of Object.keys(part)) {
    if (key === "ref") {
      // A ref runs once; reading a part's reactive state in it would warn, so it runs untracked.
      joined.ref = (el: Element) =>
        untrack(() => {
          call((own as Props).ref, el)
          call(part.ref, el)
        })
    } else if (/^on[A-Z]/.test(key)) {
      joined[key] = (event: Event) => {
        call((own as Props)[key], event)
        if (!event.defaultPrevented) call(part[key], event)
      }
    }
  }
  return merge(own, part, joined) as T
}
