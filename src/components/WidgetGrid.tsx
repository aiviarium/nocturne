import {
  type Accessor,
  createEffect,
  createMemo,
  createSignal,
  For,
  type JSX,
  onCleanup,
  onMount,
  Show,
  splitProps,
} from "solid-js"
import { cx } from "../lib/cx"
import {
  cellDelta,
  fitLayout,
  GRID_COLUMNS,
  type GridItem,
  moveItem,
  reading,
  resizeItem,
  rowCount,
} from "../lib/grid"

export type { GridItem }

export interface WidgetGridProps<T extends GridItem>
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "onChange"> {
  /** The layout. Items have a position and a size in cells (12 columns), and may name limits. */
  items: T[]
  /** Items can be dragged to arrange them and resized by their corner, or moved with the arrow keys
   * (Shift resizes). Off, the grid only lays them out. */
  editing?: boolean
  /** Height of a row in px. Default 80. */
  rowHeight?: number
  /** Names the grid for assistive technology. */
  label: string
  /** Names an item for assistive technology while editing. */
  itemLabel?: (item: T) => string
  /**
   * Items with nothing to show (a widget whose content renders nothing). Outside editing they take no space and
   * the items below move up; while editing they keep their cell, so they can be moved and removed. The stored
   * layout never changes for it: the compacted one is only how it is drawn.
   */
  empty?: readonly string[]
  /**
   * Outside editing, each item is as tall as its content needs, never taller than its size, items of one height
   * starting on one row are as tall as the tallest of them, and the rest moves up. Default true. Off, every item keeps its
   * size (a page of charts that should keep the height the person gave them).
   */
  fit?: boolean
  /** The layout after a move or a resize ended. Dragging shows the result without calling this. */
  onChange?: (items: T[]) => void
  /** An item's content. The item is an accessor: the content stays mounted while the item moves. */
  children: (item: Accessor<T>, state: Accessor<"idle" | "moving" | "resizing">) => JSX.Element
}

/** Below this width the grid stacks its items in reading order, one to a row, and cannot be rearranged. */
const STACK_BELOW = 640

interface Drag<T extends GridItem> {
  id: string
  mode: "move" | "resize"
  px: number
  py: number
  start: T[]
  from: T
  cell: number
  gap: number
}

/**
 * A page of widgets on a grid: items placed by cell, dragged to arrange and resized by their corner. The
 * layout is laid out by CSS (`grid-column` and `grid-row` from each item), so content never remounts as it
 * moves. Moving an item pushes the ones in its way down and closes the gaps (see `lib/grid.ts`).
 *
 * Outside editing the grid draws the layout compacted (`fitLayout`): empty items take no space, each item is as
 * tall as its content up to its size, a row of items ends on one line, and everything moves up. The stored
 * positions stay as they are; editing shows them.
 */
export function WidgetGrid<T extends GridItem>(props: WidgetGridProps<T>): JSX.Element {
  const [local, rest] = splitProps(props, [
    "items",
    "editing",
    "rowHeight",
    "empty",
    "fit",
    "label",
    "itemLabel",
    "onChange",
    "children",
    "class",
  ])
  const [draft, setDraft] = createSignal<T[] | null>(null)
  const [drag, setDrag] = createSignal<{ id: string; mode: "move" | "resize" } | null>(null)
  const [stacked, setStacked] = createSignal(false)
  let root: HTMLDivElement | undefined
  let active: Drag<T> | null = null

  const shown = () => draft() ?? local.items
  const byId = createMemo(() => new Map(shown().map((i) => [i.id, i])))
  const order = createMemo(() => new Map(reading(shown()).map((i, n) => [i.id, n])))
  const ids = createMemo(() => local.items.map((i) => i.id))
  const gap = 12
  const row = () => local.rowHeight ?? 80
  const editable = () => !!local.editing && !stacked()

  // ── Outside editing: the stored layout drawn compacted, each item as tall as its content ──────────
  const hiddenIds = createMemo(() => new Set(local.editing ? [] : (local.empty ?? [])))
  const [natural, setNatural] = createSignal<Record<string, number>>({})
  const layout = createMemo(() =>
    editable()
      ? null
      : fitLayout(shown(), {
          row: row(),
          gap,
          hidden: hiddenIds(),
          natural: local.fit === false ? undefined : (id) => natural()[id],
          stacked: stacked(),
        }),
  )
  /** Reads the content height of items: each is switched to its natural height, read, switched back, in one
   * layout before the next paint. */
  const measure = (els: Iterable<HTMLElement>) => {
    if (local.fit === false || editable()) return
    const list = [...els].filter((el) => el.isConnected && !el.hasAttribute("data-hidden"))
    if (!list.length) return
    for (const el of list) el.setAttribute("data-measure", "")
    const read = list.map((el) => [el.dataset.widgetId!, el.offsetHeight] as const)
    for (const el of list) el.removeAttribute("data-measure")
    const prev = natural()
    if (read.some(([id, h]) => prev[id] !== h)) setNatural({ ...prev, ...Object.fromEntries(read) })
  }
  const items = () =>
    root ? [...root.querySelectorAll<HTMLElement>(":scope > [data-part=widget-grid-item]")] : []

  onMount(() => {
    if (!root) return
    const el = root
    if (typeof ResizeObserver !== "undefined") {
      let width = el.clientWidth
      const watch = new ResizeObserver(() => {
        setStacked(el.clientWidth > 0 && el.clientWidth < STACK_BELOW)
        // Text wraps differently at another width.
        if (el.clientWidth !== width) {
          width = el.clientWidth
          measure(items())
        }
      })
      watch.observe(el)
      onCleanup(() => watch.disconnect())
    }
    setStacked(el.clientWidth > 0 && el.clientWidth < STACK_BELOW)
    // Content that changes (rows arriving, a list emptying) is measured again before it is painted.
    if (typeof MutationObserver !== "undefined") {
      const changes = new MutationObserver((records) => {
        const dirty = new Set<HTMLElement>()
        for (const r of records) {
          // The grid's own writes (an item's place, measuring, hiding) are not content changes.
          if (r.type === "attributes" && (r.target === el || (r.target as Element).parentElement === el))
            continue
          const node = r.target.nodeType === 1 ? (r.target as Element) : r.target.parentElement
          const item = node?.closest<HTMLElement>("[data-part=widget-grid-item]")
          if (item && item.parentElement === el) dirty.add(item)
        }
        measure(dirty)
      })
      changes.observe(el, { childList: true, characterData: true, attributes: true, subtree: true })
      onCleanup(() => changes.disconnect())
    }
    document.fonts?.ready.then(() => measure(items())).catch(() => {})
  })
  // Leaving edit mode, items mounting or being revealed, a size changed: measure what is drawn now.
  createEffect(() => {
    if (editable() || local.fit === false) return
    shown()
    hiddenIds()
    stacked()
    queueMicrotask(() => measure(items()))
  })

  const begin = (e: PointerEvent, id: string, mode: "move" | "resize") => {
    if (!editable() || e.button !== 0 || !root) return
    if (
      mode === "move" &&
      (e.target as Element).closest("button, a, input, select, textarea, [data-no-drag]")
    )
      return
    const from = byId().get(id)
    if (!from) return
    const width = root.clientWidth
    active = {
      id,
      mode,
      px: e.clientX,
      py: e.clientY,
      start: local.items,
      from,
      cell: (width - gap * (GRID_COLUMNS - 1)) / GRID_COLUMNS,
      gap,
    }
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    setDrag({ id, mode })
    e.preventDefault()
    e.stopPropagation()
  }

  const track = (e: PointerEvent) => {
    const d = active
    if (!d) return
    const dx = cellDelta(e.clientX - d.px, d.cell, d.gap)
    const dy = cellDelta(e.clientY - d.py, row(), d.gap)
    const next =
      d.mode === "move"
        ? moveItem(d.start, d.id, d.from.x + dx, d.from.y + dy)
        : resizeItem(d.start, d.id, d.from.w + dx, d.from.h + dy)
    const prev = draft() ?? d.start
    if (
      next.some(
        (n, i) => n.x !== prev[i]!.x || n.y !== prev[i]!.y || n.w !== prev[i]!.w || n.h !== prev[i]!.h,
      )
    )
      setDraft(() => next)
  }

  const finish = (e: PointerEvent, commit: boolean) => {
    const d = active
    if (!d) return
    active = null
    const result = draft()
    setDraft(null)
    setDrag(null)
    ;(e.currentTarget as Element).releasePointerCapture?.(e.pointerId)
    if (commit && result) local.onChange?.(result)
  }

  const key = (e: KeyboardEvent, id: string) => {
    if (!editable() || e.target !== e.currentTarget) return
    const arrows: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }
    const step = arrows[e.key]
    const item = byId().get(id)
    if (!step || !item) return
    e.preventDefault()
    const next = e.shiftKey
      ? resizeItem(local.items, id, item.w + step[0], item.h + step[1])
      : moveItem(local.items, id, item.x + step[0], item.y + step[1])
    local.onChange?.(next)
  }

  return (
    <div
      ref={(el) => {
        root = el
      }}
      data-part="widget-grid"
      data-editing={editable() ? "" : undefined}
      data-stacked={stacked() ? "" : undefined}
      data-fit={layout() ? "" : undefined}
      role="list"
      aria-label={local.label}
      class={cx("nc-wgrid", local.class)}
      style={{
        "--wg-cols": GRID_COLUMNS,
        "--wg-row": `${row()}px`,
        "--wg-rows": rowCount(shown()),
        "--wg-height": layout() ? `${layout()!.height}px` : undefined,
      }}
      {...rest}
    >
      <For each={ids()}>
        {(id) => {
          const item = () => byId().get(id)!
          const state = () => (drag()?.id === id ? (drag()!.mode === "move" ? "moving" : "resizing") : "idle")
          const box = () => layout()?.boxes.get(id)
          return (
            <div
              role="listitem"
              data-part="widget-grid-item"
              data-widget-id={id}
              data-grid={`${item().x},${item().y},${item().w},${item().h}`}
              data-state={state()}
              data-hidden={layout() && !box() ? "" : undefined}
              tabindex={editable() ? 0 : undefined}
              aria-label={editable() ? (local.itemLabel?.(item()) ?? id) : undefined}
              class="nc-wgrid__item"
              style={{
                "--wg-x": item().x,
                "--wg-y": item().y,
                "--wg-w": item().w,
                "--wg-h": item().h,
                "--wg-order": order().get(id) ?? 0,
                "--wg-fx": box()?.x,
                "--wg-fw": box()?.w,
                "--wg-top": box() ? `${box()!.top}px` : undefined,
                "--wg-fit-h": box() ? `${box()!.height}px` : undefined,
              }}
              onPointerDown={(e) => begin(e, id, "move")}
              onPointerMove={track}
              onPointerUp={(e) => finish(e, true)}
              onPointerCancel={(e) => finish(e, false)}
              onKeyDown={(e) => key(e, id)}
            >
              {local.children(item, state)}
              <Show when={editable()}>
                <div class="nc-wgrid__veil" aria-hidden="true" />
                <div
                  class="nc-wgrid__resize"
                  data-part="widget-resize"
                  aria-hidden="true"
                  onPointerDown={(e) => begin(e, id, "resize")}
                />
              </Show>
            </div>
          )
        }}
      </For>
    </div>
  )
}
