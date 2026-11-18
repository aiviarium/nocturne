import { createSignal, For, type JSX, Show } from "solid-js"
import { createControllable } from "../lib/controllable"
import { cx } from "../lib/cx"

export interface SplitProps {
  /** `horizontal` puts the panes side by side with a vertical divider; `vertical` stacks them. Default `horizontal`. */
  orientation?: "horizontal" | "vertical"
  /** Size in px of the sized pane (see `fixed`). Controlled when set. */
  size?: number
  /** Initial size in px when uncontrolled. Default 320. */
  defaultSize?: number
  /** Smallest size of the sized pane in px. Default 160. */
  min?: number
  /** Largest size of the sized pane in px. Default 720. */
  max?: number
  /** Which pane `size` belongs to; the other takes the remaining space. Default `first`. */
  fixed?: "first" | "second"
  /** Called while dragging and on keyboard steps. */
  onResize?: (size: number) => void
  /** Hide the sized pane and the divider, and give everything to the other pane. Nothing is unmounted. */
  collapsed?: boolean
  /** Accessible name of the divider. */
  label?: string
  /** The first pane (left or top). */
  first: JSX.Element
  /** The second pane (right or bottom). */
  second: JSX.Element
  class?: string
}

const STEP = 16

interface DividerProps {
  hidden?: boolean
  orientation: "horizontal" | "vertical"
  label: string
  /** For `aria-valuenow`: the current size and its limits, in whatever unit the owner uses. */
  value: number
  min: number
  max: number
  dragging: boolean
  /** Pointer press, with the start coordinate along the axis. Return false to refuse the drag. */
  onDragStart: (origin: number) => void
  /** Pointer move with the distance from the start along the axis, in px. */
  onDrag: (delta: number) => void
  onDragEnd: () => void
  /** Arrow keys and Home and End: a step in px (negative shrinks the pane before the divider), or an edge. */
  onStep: (step: number | "start" | "end") => void
  onReset: () => void
}

/** A focusable separator. The owner decides what moving it means. */
function Divider(props: DividerProps): JSX.Element {
  const horizontal = () => props.orientation === "horizontal"
  const onPointerDown = (event: PointerEvent) => {
    event.preventDefault()
    ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
    props.onDragStart(horizontal() ? event.clientX : event.clientY)
  }
  const onPointerMove = (event: PointerEvent) => {
    if (!props.dragging) return
    props.onDrag((horizontal() ? event.clientX : event.clientY) - (origin ?? 0))
  }
  let origin: number | undefined
  const onKeyDown = (event: KeyboardEvent) => {
    const grow = horizontal() ? "ArrowRight" : "ArrowDown"
    const shrink = horizontal() ? "ArrowLeft" : "ArrowUp"
    if (event.key === grow) props.onStep(STEP)
    else if (event.key === shrink) props.onStep(-STEP)
    else if (event.key === "Home") props.onStep("start")
    else if (event.key === "End") props.onStep("end")
    else return
    event.preventDefault()
  }
  return (
    <div
      data-part="split-divider"
      hidden={props.hidden}
      role="separator"
      tabindex="0"
      aria-orientation={horizontal() ? "vertical" : "horizontal"}
      aria-label={props.label}
      aria-valuenow={Math.round(props.value)}
      aria-valuemin={Math.round(props.min)}
      aria-valuemax={Math.round(props.max)}
      class="nc-split__divider"
      onPointerDown={(e) => {
        origin = horizontal() ? e.clientX : e.clientY
        onPointerDown(e)
      }}
      onPointerMove={onPointerMove}
      onPointerUp={() => props.onDragEnd()}
      onPointerCancel={() => props.onDragEnd()}
      onKeyDown={onKeyDown}
      onDblClick={() => props.onReset()}
    />
  )
}

/**
 * Two panes with a draggable divider. The divider is a focusable separator: arrow keys resize, Home and End jump
 * to the limits, a double click resets. One pane has a size in px (`fixed` says which) and the other fills.
 */
export function Split(props: SplitProps): JSX.Element {
  const min = () => props.min ?? 160
  const max = () => props.max ?? 720
  const fixedSecond = () => props.fixed === "second"
  const [size, setSize] = createControllable<number>({
    value: () => props.size,
    defaultValue: props.defaultSize ?? 320,
    onChange: (v) => props.onResize?.(v),
  })
  const [dragging, setDragging] = createSignal(false)
  const horizontal = () => props.orientation !== "vertical"
  const clamp = (n: number) => Math.max(min(), Math.min(max(), Math.round(n)))
  let startSize = 0
  // Moving the divider toward the end grows the first pane and shrinks the second.
  const sign = () => (fixedSecond() ? -1 : 1)
  const sized = () => (
    <div
      data-part={fixedSecond() ? "split-second" : "split-first"}
      class="nc-split__pane nc-split__pane--sized"
      hidden={props.collapsed}
      style={{ "--nc-split-size": `${size()}px` }}
    >
      {fixedSecond() ? props.second : props.first}
    </div>
  )
  const fill = () => (
    <div
      data-part={fixedSecond() ? "split-first" : "split-second"}
      class="nc-split__pane nc-split__pane--fill"
    >
      {fixedSecond() ? props.first : props.second}
    </div>
  )
  return (
    <div
      data-part="split"
      data-orientation={props.orientation ?? "horizontal"}
      data-dragging={dragging() ? "" : undefined}
      class={cx("nc-split", !horizontal() && "nc-split--vertical", props.class)}
    >
      <Show when={!fixedSecond()}>{sized()}</Show>
      <Show when={fixedSecond()}>{fill()}</Show>
      <Divider
        hidden={props.collapsed}
        orientation={props.orientation ?? "horizontal"}
        label={props.label ?? "Resize panes"}
        value={size()}
        min={min()}
        max={max()}
        dragging={dragging()}
        onDragStart={() => {
          startSize = size()
          setDragging(true)
        }}
        onDrag={(delta) => setSize(clamp(startSize + sign() * delta))}
        onDragEnd={() => setDragging(false)}
        onStep={(step) => {
          const grow = step === "start" ? min() - size() : step === "end" ? max() - size() : sign() * step
          setSize(clamp(size() + grow))
        }}
        onReset={() => setSize(clamp(props.defaultSize ?? 320))}
      />
      <Show when={!fixedSecond()}>{fill()}</Show>
      <Show when={fixedSecond()}>{sized()}</Show>
    </div>
  )
}

export interface SplitGroupProps<T> {
  /** One entry per pane. */
  items: readonly T[]
  /** Renders a pane's content. */
  children: (item: T, index: number) => JSX.Element
  /** Stable key for a pane. Default: the index. */
  getKey?: (item: T, index: number) => string | number
  /** Relative sizes, one per pane. A pane with weight 2 is twice as wide as one with weight 1. Default: all equal. */
  weights?: readonly number[]
  /** Called while dragging and on keyboard steps with the new weights. */
  onResize?: (weights: number[]) => void
  /** `horizontal` puts the panes side by side (default); `vertical` stacks them. */
  orientation?: "horizontal" | "vertical"
  /** Smallest size of a pane in px. Default 160. */
  min?: number
  /** Accessible name of the divider before a pane. */
  label?: (index: number) => string
  class?: string
}

/**
 * Any number of panes with a draggable divider between each pair. Dividers move space between the two panes
 * beside them and leave the rest alone. At phone width the panes stack and the dividers go.
 */
export function SplitGroup<T>(props: SplitGroupProps<T>): JSX.Element {
  const min = () => props.min ?? 160
  const horizontal = () => props.orientation !== "vertical"
  const weightOf = (i: number) => props.weights?.[i] ?? 1
  const [dragging, setDragging] = createSignal<number | null>(null)
  let root!: HTMLDivElement
  let pair: { left: number; total: number; px: number } | undefined

  /** The two panes beside divider `i` (the divider sits before pane `i`), measured now. */
  const measure = (i: number) => {
    const panes = Array.from(root.querySelectorAll<HTMLElement>(":scope > [data-part=split-group-pane]"))
    const a = panes[i - 1]?.getBoundingClientRect()
    const b = panes[i]?.getBoundingClientRect()
    if (!a || !b) return undefined
    const axis = horizontal() ? "width" : "height"
    return { left: a[axis], total: weightOf(i - 1) + weightOf(i), px: a[axis] + b[axis] }
  }
  const apply = (i: number, left: number) => {
    if (!pair || pair.px <= 0) return
    const clamped = Math.max(min(), Math.min(pair.px - min(), left))
    const next = Array.from({ length: props.items.length }, (_, at) => weightOf(at))
    next[i - 1] = (pair.total * clamped) / pair.px
    next[i] = pair.total - next[i - 1]
    props.onResize?.(next)
  }
  const ratio = (i: number) => {
    const total = weightOf(i - 1) + weightOf(i)
    return total === 0 ? 50 : (weightOf(i - 1) / total) * 100
  }

  return (
    <div
      data-part="split-group"
      data-orientation={props.orientation ?? "horizontal"}
      data-dragging={dragging() !== null ? "" : undefined}
      ref={root}
      class={cx("nc-split nc-splitgroup", !horizontal() && "nc-split--vertical", props.class)}
    >
      <For each={props.items}>
        {(item, index) => (
          <>
            <Show when={index() > 0}>
              <Divider
                orientation={props.orientation ?? "horizontal"}
                label={props.label?.(index()) ?? "Resize panes"}
                value={ratio(index())}
                min={0}
                max={100}
                dragging={dragging() === index()}
                onDragStart={() => {
                  pair = measure(index())
                  setDragging(index())
                }}
                onDrag={(delta) => pair && apply(index(), pair.left + delta)}
                onDragEnd={() => {
                  setDragging(null)
                  pair = undefined
                }}
                onStep={(step) => {
                  pair = measure(index())
                  if (!pair) return
                  apply(index(), step === "start" ? 0 : step === "end" ? pair.px : pair.left + step)
                  pair = undefined
                }}
                onReset={() => {
                  pair = measure(index())
                  if (pair) apply(index(), pair.px / 2)
                  pair = undefined
                }}
              />
            </Show>
            <div
              data-part="split-group-pane"
              data-key={props.getKey ? String(props.getKey(item, index())) : String(index())}
              class="nc-split__pane nc-splitgroup__pane"
              style={{ "--nc-weight": weightOf(index()) }}
            >
              {props.children(item, index())}
            </div>
          </>
        )}
      </For>
    </div>
  )
}
