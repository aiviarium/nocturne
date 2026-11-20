import type { JSX } from "@solidjs/web"
import { createEffect, createMemo, createSignal, For, onCleanup, untrack } from "solid-js"
import { cx } from "../lib/cx"
import { EDGE_WIDTH, lockDirection, swipeBack } from "../lib/gestures"

// A stack of phone screens (iOS's navigation controller). Every screen of the stack stays mounted, so the one
// underneath keeps its scroll position and shows during a swipe back; only the top one is visible otherwise.
// A push slides the new screen in from the right over the old one, which moves a little to the left; a pop
// slides it back out. A swipe from the left edge goes back, the top screen following the finger. Reduced
// motion turns the slides off.

export interface NavigationStackProps<T> {
  /** The screens, bottom first. Identity matters: the same object is the same mounted screen. */
  items: readonly T[]
  /** A stable key per screen: a screen whose object changes but whose key stays is the same mounted screen. */
  getKey: (item: T) => string
  /** Renders a screen. `item` is the latest object with its key. */
  children: (item: () => T, index: () => number) => JSX.Element
  /** Called when the person goes back by swiping from the edge. */
  onBack?: () => void
  /** Hidden (another tab's stack): mounted, not shown. */
  hidden?: boolean
  label?: string
  class?: string
}

const DURATION = 280

export function NavigationStack<T>(props: NavigationStackProps<T>): JSX.Element {
  // What is rendered, by key: the items, and for a moment after a pop the screens that are leaving.
  const keysOf = (items: readonly T[]) => items.map((x) => props.getKey(x))
  const keys = createMemo(() => keysOf(props.items), {
    equals: (a, b) => a.length === b.length && a.every((k, i) => k === b[i]),
  })
  // The latest object for each key, including leaving screens (kept until they are gone).
  const latest = new Map<string, T>()
  createEffect(
    () => props.items,
    (items) => {
      for (const x of items) latest.set(props.getKey(x), x)
    },
  )
  // The screens it starts with, read once: from then on the effect below moves `rendered`.
  const [rendered, setRendered] = createSignal<readonly string[]>(untrack(() => keys()))
  const [leaving, setLeaving] = createSignal<readonly string[]>([])
  const [entering, setEntering] = createSignal<string | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined
  const reduced = () =>
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches

  createEffect(keys, (now, prev) => {
    clearTimeout(timer)
    const before = prev ?? []
    const gone = before.filter((x) => !now.includes(x))
    const top = now[now.length - 1]
    const pushed = top !== undefined && !before.includes(top) && before.length > 0
    const done = () => {
      setLeaving([])
      for (const k of [...latest.keys()]) if (!keys().includes(k)) latest.delete(k)
      setRendered(keys())
    }
    if (reduced() || props.hidden) {
      setEntering(null)
      done()
      return
    }
    if (gone.length && !pushed) {
      // A pop: keep the leaving screens on top until they have slid out.
      setLeaving(gone)
      setRendered([...now, ...gone])
      timer = setTimeout(done, DURATION)
    } else {
      setLeaving([])
      setRendered(now)
      if (pushed) {
        setEntering(top)
        requestAnimationFrame(() => requestAnimationFrame(() => setEntering(null)))
      }
    }
  })
  onCleanup(() => clearTimeout(timer))

  const position = (key: string): "top" | "below" | "hidden" | "leaving" | "entering" => {
    if (leaving().includes(key)) return "leaving"
    if (entering() === key) return "entering"
    const k = keys()
    const i = k.indexOf(key)
    if (i === k.length - 1) return "top"
    if (i === k.length - 2) return "below"
    return "hidden"
  }

  // The swipe back from the left edge.
  let root!: HTMLDivElement
  const [dx, setDx] = createSignal<number | null>(null)
  let gesture: { x: number; y: number; t: number; id: number; locked: "x" | "y" | null } | null = null
  let last = { x: 0, t: 0, v: 0 }
  const down = (e: PointerEvent) => {
    if (props.items.length < 2 || !props.onBack) return
    if (e.pointerType === "mouse") return
    gesture = { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId, locked: null }
    last = { x: e.clientX, t: e.timeStamp, v: 0 }
  }
  const move = (e: PointerEvent) => {
    if (!gesture || e.pointerId !== gesture.id) return
    const mx = e.clientX - gesture.x
    const my = e.clientY - gesture.y
    if (!gesture.locked) {
      gesture.locked = lockDirection(mx, my)
      if (gesture.locked === "y") {
        gesture = null
        return
      }
      if (!gesture.locked) return
      try {
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      } catch {}
    }
    const dt = Math.max(1, e.timeStamp - last.t)
    last = { x: e.clientX, t: e.timeStamp, v: (e.clientX - last.x) / dt }
    setDx(Math.max(0, mx))
    e.preventDefault()
  }
  const up = (e: PointerEvent) => {
    if (!gesture || e.pointerId !== gesture.id) return
    gesture = null
    const d = dx()
    if (d === null) return
    const width = root.getBoundingClientRect().width
    const decision = swipeBack({ dx: d, vx: last.v, width })
    if (decision === "back") {
      // Finish the slide from where the finger left it, then pop without a second animation.
      setDx(width)
      setTimeout(
        () => {
          setDx(null)
          props.onBack?.()
        },
        reduced() ? 0 : 160,
      )
    } else setDx(null)
  }

  return (
    <div
      ref={root}
      class={cx("nc-navstack", props.class)}
      data-part="navigation-stack"
      aria-label={props.label}
      hidden={props.hidden}
      data-swiping={dx() !== null ? "" : undefined}
      style={dx() !== null ? { "--nc-swipe": `${dx()}px` } : undefined}
    >
      <For each={rendered()}>
        {(key) => {
          const item = () => props.items.find((x) => props.getKey(x) === key) ?? latest.get(key)!
          const index = () => keys().indexOf(key)
          return (
            <div
              class="nc-navstack__screen"
              data-part="stack-screen"
              data-key={key}
              data-position={position(key)}
              aria-hidden={position(key) === "top" || position(key) === "entering" ? undefined : "true"}
              inert={position(key) !== "top" && position(key) !== "entering"}
            >
              {props.children(item, index)}
            </div>
          )
        }}
      </For>
      <div
        class="nc-navstack__edge"
        data-part="stack-edge"
        aria-hidden="true"
        style={{ width: `${EDGE_WIDTH}px` }}
        hidden={props.items.length < 2}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      />
    </div>
  )
}
