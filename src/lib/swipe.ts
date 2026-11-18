// The pointer side of a swiped row (iOS's swipe actions) and of a long press, shared by `InsetRow` and `ListRow`:
// drag a row sideways to reveal the actions under it, a full swipe runs the first one, and a long press on a touch
// screen opens the row's menu. The decisions themselves are the pure functions in `gestures.ts`.
import { createSignal, onCleanup } from "solid-js"
import { lockDirection, type RowSwipe, rowSwipe } from "./gestures"

export interface RowSwipeOptions {
  /** The row: it captures the pointer while dragged, and its width decides a full swipe. */
  element: () => HTMLElement | undefined
  /** Width of the actions revealed by dragging to the right; 0 for none. */
  leading: () => number
  /** Width of the actions revealed by dragging to the left; 0 for none. */
  trailing: () => number
  /** A full swipe to one side: run that side's first action. */
  onFull?: (side: "leading" | "trailing") => void
  /** Whether a pointer may drag the row. Default every pointer but a mouse's secondary buttons. */
  accepts?: (e: PointerEvent) => boolean
  /** Whether a long press opens a menu. A mouse never long-presses; it right-clicks. */
  menu?: () => boolean
  /** The long press fired, at this point. */
  onLongPress?: (at: { x: number; y: number }) => void
}

export interface RowSwipeControl {
  /** How far the row's face is moved: positive shows the leading actions, negative the trailing. */
  offset: () => number
  /** While a finger drags the row (no transition). */
  dragging: () => boolean
  /** Snap open to one side, or closed. */
  setOpen: (side: "leading" | "trailing" | null) => void
  /** Pointer handlers for the row. */
  handlers: {
    onPointerDown: (e: PointerEvent) => void
    onPointerMove: (e: PointerEvent) => void
    onPointerUp: (e: PointerEvent) => void
    onPointerCancel: (e: PointerEvent) => void
  }
  /**
   * Call first in the row's click handler: true when the click ends a drag or a long press, or closes the open
   * actions, and must not activate the row (the event's default is prevented).
   */
  swallowClick: (e: Event) => boolean
}

export function createRowSwipe(o: RowSwipeOptions): RowSwipeControl {
  const [offset, setOffset] = createSignal(0)
  const [dragging, setDragging] = createSignal(false)
  let suppress = false
  let g: { x: number; y: number; base: number; id: number; locked: "x" | "y" | null } | null = null
  let last = { x: 0, t: 0, v: 0 }
  let press: { x: number; y: number; timer: ReturnType<typeof setTimeout> } | null = null

  const swipeable = () => o.leading() > 0 || o.trailing() > 0
  const swallowNextClick = (ms: number) => {
    suppress = true
    setTimeout(() => (suppress = false), ms)
  }
  const endPress = () => {
    if (press) clearTimeout(press.timer)
    press = null
  }
  onCleanup(endPress)

  const setOpen = (side: "leading" | "trailing" | null) =>
    setOffset(side === "leading" ? o.leading() : side === "trailing" ? -o.trailing() : 0)

  const settle = (r: RowSwipe) => {
    if (r === "close") setOpen(null)
    else if (r === "leading" || r === "trailing") setOpen(r)
    else {
      setOpen(null)
      o.onFull?.(r === "full-leading" ? "leading" : "trailing")
    }
  }

  const onPointerDown = (e: PointerEvent) => {
    if (o.menu?.() && e.pointerType !== "mouse") {
      const at = { x: e.clientX, y: e.clientY }
      press = {
        ...at,
        timer: setTimeout(() => {
          press = null
          g = null
          swallowNextClick(400)
          o.onLongPress?.(at)
        }, 500),
      }
    }
    if (!swipeable() || (e.pointerType === "mouse" && e.button !== 0)) return
    if (o.accepts && !o.accepts(e)) return
    g = { x: e.clientX, y: e.clientY, base: offset(), id: e.pointerId, locked: null }
    last = { x: e.clientX, t: e.timeStamp, v: 0 }
  }
  const onPointerMove = (e: PointerEvent) => {
    if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8) endPress()
    if (!g || e.pointerId !== g.id) return
    const dx = e.clientX - g.x
    if (!g.locked) {
      g.locked = lockDirection(dx, e.clientY - g.y)
      if (g.locked === "y") {
        g = null
        return
      }
      if (!g.locked) return
      endPress()
      setDragging(true)
      try {
        o.element()?.setPointerCapture(e.pointerId)
      } catch {}
    }
    const dt = Math.max(1, e.timeStamp - last.t)
    last = { x: e.clientX, t: e.timeStamp, v: (e.clientX - last.x) / dt }
    let next = g.base + dx
    // A side without actions does not move.
    if (next > 0 && !o.leading()) next = 0
    if (next < 0 && !o.trailing()) next = 0
    setOffset(next)
    e.preventDefault()
  }
  const onPointerUp = (e: PointerEvent) => {
    endPress()
    if (!g || e.pointerId !== g.id) return
    const moved = g.locked === "x"
    g = null
    setDragging(false)
    if (!moved) return
    swallowNextClick(0)
    settle(
      rowSwipe({
        dx: offset(),
        vx: last.v,
        width: o.element()?.getBoundingClientRect().width ?? 0,
        leading: o.leading(),
        trailing: o.trailing(),
      }),
    )
  }

  const swallowClick = (e: Event) => {
    if (suppress) {
      e.preventDefault()
      return true
    }
    if (offset() !== 0) {
      e.preventDefault()
      setOpen(null)
      return true
    }
    return false
  }

  return {
    offset,
    dragging,
    setOpen,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
    swallowClick,
  }
}

const TOUCH_QUERY = "(hover: none) and (pointer: coarse)"
const [touchNow, setTouchNow] = createSignal(false)
let watchingTouch = false

/** Whether the primary pointer is a finger (a phone or tablet), so nothing is revealed by hover. Reactive. */
export function touchScreen(): boolean {
  if (!watchingTouch && typeof window !== "undefined" && typeof window.matchMedia === "function") {
    watchingTouch = true
    const mq = window.matchMedia(TOUCH_QUERY)
    setTouchNow(mq.matches)
    mq.addEventListener?.("change", () => setTouchNow(mq.matches))
  }
  return touchNow()
}
