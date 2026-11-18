/**
 * Whether an event came from inside an element matching `selector`, judged from the path it was dispatched along
 * (up to `until`, the element handling it). `event.target.closest()` gets this wrong when an earlier handler
 * removed the target: unchecking a checkbox removes its check mark, which was what the click hit, so a row's own
 * click handler would take the click for one on the row and select it again.
 */
export function cameFrom(e: Event, selector: string, until?: EventTarget | null): boolean {
  // A target no longer in the page was removed by a handler inside `until` that took the event (some DOMs, like
  // the tests' happy-dom, build the path when asked, from the detached target alone).
  const target = e.target as Node | null
  if (target && !target.isConnected) return true
  for (const node of e.composedPath()) {
    if (node === until) return false
    if (node instanceof Element && node.matches(selector)) return true
  }
  return false
}
