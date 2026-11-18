const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",")

/**
 * The focused element, looking into open shadow roots: `document.activeElement` is only the shadow host when
 * focus is inside one (the docs site renders examples in shadow roots).
 */
export function activeElement(): Element | null {
  let active = document.activeElement
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement
  return active
}

/** Tabbable descendants of `root`, in DOM order. */
export function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("hidden") && el.getAttribute("aria-hidden") !== "true",
  )
}

/** Keep Tab and Shift+Tab inside `root`. Returns true when the event was handled. */
export function trapTab(event: KeyboardEvent, root: HTMLElement): boolean {
  if (event.key !== "Tab") return false
  const items = focusableIn(root)
  if (items.length === 0) {
    event.preventDefault()
    root.focus()
    return true
  }
  const first = items[0] as HTMLElement
  const last = items[items.length - 1] as HTMLElement
  const active = activeElement()
  if (event.shiftKey && (active === first || active === root || !root.contains(active))) {
    event.preventDefault()
    last.focus()
    return true
  }
  if (!event.shiftKey && (active === last || !root.contains(active))) {
    event.preventDefault()
    first.focus()
    return true
  }
  return false
}
