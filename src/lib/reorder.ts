// Reordering rows by drag and by keyboard, shared by `RowList` and `ListEditor`. The decisions (where a dragged row
// lands, how fast the list scrolls at its edges, where an item ends up) are pure functions, tested without a
// pointer. `createReorder` is the controller: a press on the row itself that moves past `DRAG_THRESHOLD` (a press
// that does not move is a click), or on a touch screen a move after the long press that opened the row's menu,
// lifts the row and follows the pointer while a line shows where it will land; a keyboard grab moves the line
// with the arrow keys. There are no handles. Positions are item indices, not DOM positions, so a virtualised list reorders rows
// that are not rendered. A move is reported once, when the row is dropped, as `onReorder(from, to)`: take the
// item out at `from` and insert it at `to` (`reorderItems`).
import { createSignal, onCleanup } from "solid-js"

/** The array with the item at `from` moved to `to` (the index it has afterwards). */
export function reorderItems<T>(items: readonly T[], from: number, to: number): T[] {
  const out = items.slice()
  if (from < 0 || from >= out.length || from === to) return out
  const [item] = out.splice(from, 1)
  out.splice(Math.max(0, Math.min(out.length, to)), 0, item as T)
  return out
}

/**
 * The gap a pointer at `y` points at: 0 is before the first row, `mids.length` after the last. `mids` are the
 * rows' vertical midpoints, top to bottom, in the same coordinates as `y`.
 */
export function dropSlot(mids: readonly number[], y: number): number {
  let slot = 0
  while (slot < mids.length && (mids[slot] as number) < y) slot++
  return slot
}

/** The index a row taken from `from` ends at when dropped into gap `slot`. */
export function slotToIndex(from: number, slot: number): number {
  return slot > from ? slot - 1 : slot
}

/** The gap a row dropped at index `to` sits in, the inverse of `slotToIndex`. */
export function indexToSlot(from: number, to: number): number {
  return to > from ? to + 1 : to
}

/** A mouse or pen press moves this far (px) before it lifts the row; less is a click. */
export const DRAG_THRESHOLD = 4
/** A finger held for the long press moves this far (px) before it lifts the row out of the menu. */
export const TOUCH_DRAG_THRESHOLD = 8

/** Whether a press that moved (dx, dy) since it went down is a drag rather than a click. */
export function pastThreshold(dx: number, dy: number, threshold = DRAG_THRESHOLD): boolean {
  return Math.hypot(dx, dy) > threshold
}

/**
 * Whether a press on `target` inside a row may start dragging the row: not on a field, a control of its own (an
 * action, a checkbox, a disclosure) or anything marked `data-no-drag`. The row's own main link or button may.
 */
export function startsRowDrag(target: Element | null, row: Element, main?: string): boolean {
  if (!target) return false
  if (target.closest("input, textarea, select, [contenteditable=true], [contenteditable=''], [data-no-drag]"))
    return false
  const control = target.closest("button, a[href], label, [role=button], [role=checkbox], [role=switch]")
  if (!control || control === row || !row.contains(control)) return true
  return Boolean(main && control.matches(main))
}

/** Within this distance of a scroller's top or bottom edge, a drag scrolls it (px). */
export const AUTOSCROLL_EDGE = 48
/** The fastest auto-scroll, at the very edge (px per frame). */
export const AUTOSCROLL_MAX = 18

/**
 * How far a scroller moves this frame while a row is dragged at `y`: negative near its top edge, positive near
 * its bottom, faster the closer the pointer is (and past the edge), 0 in between.
 */
export function autoScrollSpeed(y: number, top: number, bottom: number, edge = AUTOSCROLL_EDGE): number {
  const zone = Math.min(edge, (bottom - top) / 4)
  if (zone <= 0) return 0
  if (y < top + zone) return -Math.round(AUTOSCROLL_MAX * Math.min(1, (top + zone - y) / zone))
  if (y > bottom - zone) return Math.round(AUTOSCROLL_MAX * Math.min(1, (y - (bottom - zone)) / zone))
  return 0
}

/** The nearest ancestor that scrolls vertically, through shadow roots; the document's scroller when none does. */
export function scrollerOf(el: HTMLElement): HTMLElement {
  let node: Element | null = el.parentElement ?? ((el.getRootNode() as ShadowRoot).host || null)
  while (node && node !== document.documentElement && node !== document.body) {
    const css = getComputedStyle(node)
    if (/(auto|scroll|overlay)/.test(css.overflowY) && node.scrollHeight > node.clientHeight)
      return node as HTMLElement
    node = node.parentElement ?? ((node.getRootNode() as ShadowRoot).host || null)
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement
}

/** Rows' extent, top to bottom, in the scroller's content coordinates (0 is the top of what it scrolls). */
export interface RowSlots {
  tops: number[]
  bottoms: number[]
}

export interface ReorderOptions {
  /** How many items the list has. */
  count: () => number
  /** The element that holds the drop line (it is positioned against it). */
  container: () => HTMLElement | undefined
  /** The rendered element of item `index`, if it is rendered. */
  rowAt: (index: number) => HTMLElement | undefined
  /**
   * The rows' extent in content coordinates of `scroller`. Default: measured from the rendered rows (every row
   * must be rendered: a virtualised list passes its own, computed from its row height).
   */
  slots?: (scroller: HTMLElement) => RowSlots
  /** The element that scrolls the rows. Default: the nearest scrolling ancestor of the container. */
  scroller?: () => HTMLElement | undefined
  /** Whether item `index` may move (a pinned row may not). Default every item. */
  movable?: (index: number) => boolean
  onReorder: (from: number, to: number) => void
  /** What the row is called, for announcements. */
  name: (index: number) => string
  /** Say this in the list's live region. */
  announce: (text: string) => void
  /** After a keyboard drop: focus the moved row, now at `index`. */
  refocus?: (index: number) => void
  /** Scroll item `index` into view during a keyboard move. */
  reveal?: (index: number) => void
}

export interface PointerDownOptions {
  /** Lift the row now. */
  immediate?: boolean
  /** How far the pointer moves before the row lifts (px). */
  threshold?: number
  /** The press follows a long press: a finger's movement no longer scrolls the page. */
  held?: boolean
  /** The row lifted. */
  onLift?: () => void
  /** The pointer was let go without lifting the row. */
  onStill?: () => void
}

export interface ReorderControl {
  /** The item being dragged or grabbed, or null. */
  active: () => number | null
  /** How it is being moved: "pointer" while dragged, "keyboard" while grabbed. */
  mode: () => "pointer" | "keyboard" | null
  /** Where the line is: the index the item would end at, or null. */
  target: () => number | null
  /** The drop line's top in the container (px), or null when hidden. */
  line: () => number | null
  /**
   * A pointer went down on the row (or a long press fired on a touch screen). The row lifts once the pointer has
   * moved past `threshold` (default `DRAG_THRESHOLD`; `TOUCH_DRAG_THRESHOLD` after a long press), or at once with
   * `immediate`; until then the press is a click and nothing is prevented. `onLift` runs when it lifts (close the
   * menu a long press opened); `onStill` when the pointer is let go without moving. After a drag the click that
   * ends it is swallowed.
   */
  pointerDown: (e: PointerEvent, index: number, o?: PointerDownOptions) => void
  /** Pick up item `index` from the keyboard. */
  grab: (index: number) => void
  /** Keys while an item is grabbed: arrows move it, Space or Enter drop it, Escape puts it back. True when handled. */
  keyDown: (e: KeyboardEvent) => boolean
  /** Move item `index` by `delta` at once (Alt+Arrow on a focused row). */
  nudge: (index: number, delta: number) => void
  /** Put a grabbed or dragged row back. */
  cancel: () => void
}

const position = (i: number, n: number) => `position ${i + 1} of ${n}`

export function createReorder(o: ReorderOptions): ReorderControl {
  const [active, setActive] = createSignal<number | null>(null)
  const [mode, setMode] = createSignal<"pointer" | "keyboard" | null>(null)
  const [target, setTarget] = createSignal<number | null>(null)
  const [line, setLine] = createSignal<number | null>(null)

  let scroller: HTMLElement | undefined
  // The moved item's name, read when it is picked up: in a virtualised list its row may scroll out of the DOM.
  let movingName = ""
  let slots: RowSlots = { tops: [], bottoms: [] }
  let drag: {
    id: number
    x: number
    y: number
    scroll: number
    lastY: number
    lifted: boolean
    still: boolean
    threshold: number
    held: boolean
    onLift?: () => void
    onStill?: () => void
    el?: HTMLElement
    frame: number
  } | null = null

  const isWindow = (s: HTMLElement) => s === document.scrollingElement || s === document.documentElement
  const viewTop = (s: HTMLElement) => (isWindow(s) ? 0 : s.getBoundingClientRect().top)
  const viewBottom = (s: HTMLElement) => (isWindow(s) ? window.innerHeight : s.getBoundingClientRect().bottom)
  const measure = (s: HTMLElement): RowSlots => {
    if (o.slots) return o.slots(s)
    const top = viewTop(s) - s.scrollTop
    const out: RowSlots = { tops: [], bottoms: [] }
    for (let i = 0; i < o.count(); i++) {
      const r = o.rowAt(i)?.getBoundingClientRect()
      out.tops.push(r ? r.top - top : 0)
      out.bottoms.push(r ? r.bottom - top : 0)
    }
    return out
  }
  const begin = () => {
    const c = o.container()
    scroller = o.scroller?.() ?? (c ? scrollerOf(c) : undefined)
    slots = scroller ? measure(scroller) : { tops: [], bottoms: [] }
  }

  // The line sits in the gap the item would drop into, halfway between the rows on either side of it.
  const placeLine = (from: number, to: number | null) => {
    setTarget(to)
    const c = o.container()
    if (to === null || to === from || !c || !scroller) return setLine(null)
    const slot = indexToSlot(from, to)
    const n = slots.tops.length
    const y =
      slot <= 0
        ? (slots.tops[0] ?? 0)
        : slot >= n
          ? (slots.bottoms[n - 1] ?? 0)
          : ((slots.bottoms[slot - 1] ?? 0) + (slots.tops[slot] ?? 0)) / 2
    const client = y - scroller.scrollTop + viewTop(scroller)
    setLine(Math.round(client - c.getBoundingClientRect().top))
  }

  const finish = (commit: boolean) => {
    const from = active()
    const to = target()
    const how = mode()
    if (drag) {
      cancelAnimationFrame(drag.frame)
      if (drag.el) {
        drag.el.style.removeProperty("transform")
        drag.el.removeAttribute("data-lifted")
      }
    }
    stopListening()
    drag = null
    setActive(null)
    setMode(null)
    setTarget(null)
    setLine(null)
    if (from === null) return
    const n = o.count()
    if (commit && to !== null && to !== from) {
      const name = movingName || o.name(from)
      o.onReorder(from, to)
      o.announce(`${name} moved to ${position(to, n)}.`)
      if (how === "keyboard") o.refocus?.(to)
    } else if (how) {
      o.announce(`${movingName || o.name(from)} is back at ${position(from, n)}.`)
      if (how === "keyboard") o.refocus?.(from)
    }
  }

  // ---- Pointer ----
  const follow = (clientY: number) => {
    if (!drag || !scroller) return
    const from = active()
    if (from === null) return
    const dy = clientY - drag.y + (scroller.scrollTop - drag.scroll)
    if (drag.el) {
      // The row stays inside the list's extent.
      const n = slots.tops.length
      const min = (slots.tops[0] ?? 0) - (slots.tops[from] ?? 0)
      const max = (slots.bottoms[n - 1] ?? 0) - (slots.bottoms[from] ?? 0)
      drag.el.style.transform = `translateY(${Math.max(min, Math.min(max, dy))}px)`
    }
    const content = clientY - viewTop(scroller) + scroller.scrollTop
    const mids = slots.tops.map((t, i) => (t + (slots.bottoms[i] ?? t)) / 2)
    const to = slotToIndex(from, dropSlot(mids, content))
    placeLine(from, o.movable && !o.movable(to) ? from : to)
  }
  const tick = () => {
    if (!drag || !scroller) return
    const speed = autoScrollSpeed(drag.lastY, viewTop(scroller), viewBottom(scroller))
    if (speed) {
      const before = scroller.scrollTop
      scroller.scrollTop = before + speed
      if (scroller.scrollTop !== before) follow(drag.lastY)
    }
    drag.frame = requestAnimationFrame(tick)
  }
  const lift = () => {
    if (!drag || drag.lifted) return
    const index = active()
    if (index === null) return
    drag.lifted = true
    // A press that became a drag selects no text: anything selected on the way is dropped.
    try {
      window.getSelection?.()?.removeAllRanges()
    } catch {}
    begin()
    drag.scroll = scroller?.scrollTop ?? 0
    drag.el = o.rowAt(index)
    drag.el?.setAttribute("data-lifted", "")
    setMode("pointer")
    movingName = o.name(index)
    o.announce(`Moving ${movingName}, ${position(index, o.count())}.`)
    drag.frame = requestAnimationFrame(tick)
    drag.onLift?.()
  }
  const onMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return
    drag.lastY = e.clientY
    if (pastThreshold(e.clientX - drag.x, e.clientY - drag.y, drag.threshold)) drag.still = false
    if (!drag.lifted) {
      if (drag.still) return
      lift()
    }
    e.preventDefault()
    follow(e.clientY)
  }
  const onUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return
    const still = drag.still
    const lifted = drag.lifted
    const onStill = drag.onStill
    finish(e.type === "pointerup")
    if (lifted) swallowClick()
    if (still) onStill?.()
  }
  const onKey = (e: KeyboardEvent) => {
    // While grabbed from the keyboard the keys are the move's wherever focus is (the grabbed row of a
    // virtualised list can scroll out of the DOM, and its focus with it).
    if (mode() === "keyboard") {
      if (keyDown(e)) e.stopPropagation()
      return
    }
    if (e.key === "Escape" && drag) {
      e.preventDefault()
      e.stopPropagation()
      finish(false)
    }
  }
  // A finger that lifted a row, or holds one after a long press, would otherwise scroll the page as it moves.
  const noScroll = (e: TouchEvent) => {
    if ((drag?.lifted || drag?.held) && e.cancelable) e.preventDefault()
  }
  // A link's own drag (the browser's) would take the pointer away from the row's.
  const noNativeDrag = (e: DragEvent) => {
    if (drag) e.preventDefault()
  }
  // The click a drag ends with does not activate what it ends on.
  const swallowClick = () => {
    const swallow = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      done()
    }
    const done = () => {
      window.removeEventListener("click", swallow, true)
      clearTimeout(timer)
    }
    window.addEventListener("click", swallow, true)
    const timer = setTimeout(done, 0)
  }
  let listening = false
  const startListening = () => {
    if (listening) return
    listening = true
    window.addEventListener("pointermove", onMove, { passive: false })
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    window.addEventListener("keydown", onKey, true)
    window.addEventListener("dragstart", noNativeDrag, true)
    document.addEventListener("touchmove", noScroll, { passive: false })
  }
  const stopListening = () => {
    if (!listening) return
    listening = false
    window.removeEventListener("pointermove", onMove)
    window.removeEventListener("pointerup", onUp)
    window.removeEventListener("pointercancel", onUp)
    window.removeEventListener("keydown", onKey, true)
    window.removeEventListener("dragstart", noNativeDrag, true)
    document.removeEventListener("touchmove", noScroll)
  }
  onCleanup(() => finish(false))

  const pointerDown: ReorderControl["pointerDown"] = (e, index, opts) => {
    if (active() !== null || (e.pointerType === "mouse" && e.button !== 0)) return
    if (o.movable && !o.movable(index)) return
    drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      scroll: 0,
      lastY: e.clientY,
      lifted: false,
      still: true,
      threshold: opts?.threshold ?? (opts?.held ? TOUCH_DRAG_THRESHOLD : DRAG_THRESHOLD),
      held: Boolean(opts?.held),
      onLift: opts?.onLift,
      onStill: opts?.onStill,
      frame: 0,
    }
    setActive(index)
    startListening()
    if (opts?.immediate) lift()
  }

  // ---- Keyboard ----
  const grab = (index: number) => {
    if (o.movable && !o.movable(index)) return
    if (active() !== null) finish(false)
    begin()
    setActive(index)
    setMode("keyboard")
    placeLine(index, index)
    movingName = o.name(index)
    startListening()
    o.announce(
      `Grabbed ${movingName}, ${position(index, o.count())}. Arrow keys move it, Space or Enter drops it, Escape cancels.`,
    )
  }
  const keyDown = (e: KeyboardEvent) => {
    const from = active()
    if (from === null || mode() !== "keyboard") return false
    const n = o.count()
    const at = target() ?? from
    let to: number | null = null
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") to = Math.max(0, at - 1)
    else if (e.key === "ArrowDown" || e.key === "ArrowRight") to = Math.min(n - 1, at + 1)
    else if (e.key === "Home") to = 0
    else if (e.key === "End") to = n - 1
    else if (e.key === " " || e.key === "Enter") {
      e.preventDefault()
      finish(true)
      return true
    } else if (e.key === "Escape" || e.key === "Tab") {
      if (e.key === "Escape") e.preventDefault()
      e.stopPropagation()
      finish(false)
      return e.key === "Escape"
    } else return false
    e.preventDefault()
    if (o.movable && !o.movable(to)) return true
    o.reveal?.(to)
    begin()
    placeLine(from, to)
    o.announce(`${movingName}, ${position(to, n)}.`)
    return true
  }
  const nudge = (index: number, delta: number) => {
    const n = o.count()
    const to = Math.max(0, Math.min(n - 1, index + delta))
    if (to === index || (o.movable && (!o.movable(index) || !o.movable(to)))) return
    const name = o.name(index)
    o.onReorder(index, to)
    o.announce(`${name} moved to ${position(to, n)}.`)
  }

  return {
    active,
    mode,
    target,
    line,
    pointerDown,
    grab,
    keyDown,
    nudge,
    cancel: () => finish(false),
  }
}
