import type { JSX } from "@solidjs/web"
import { createEffect, createMemo, createSignal, For, onSettled } from "solid-js"
import { aria } from "../lib/aria"
import { cx } from "../lib/cx"
import { createId } from "../lib/id"

export interface ListProps<T> {
  /** All items. Only the visible window is rendered. */
  items: readonly T[]
  /** Fixed row height in px. Default 30 (the compact row). */
  itemHeight?: number
  /** Viewport height in px. Without it the list fills its parent (which needs a height). */
  height?: number
  /** Extra rows rendered above and below the window. Default 6. */
  overscan?: number
  /** Renders one row. */
  children: (item: T, index: number) => JSX.Element
  /** Stable key for a row. Default: the index. */
  getKey?: (item: T, index: number) => string | number
  /** Accessible name of the list. */
  label: string
  /** Called with the active item on Enter or click. */
  onSelect?: (item: T, index: number) => void
  /** The active row, controlled. */
  activeIndex?: number
  /** Called when the active row changes by keyboard or pointer. */
  onActiveChange?: (index: number) => void
  /** Whether Tab stops on the list itself. Default 0; a list whose rows take focus themselves passes -1. */
  tabIndex?: number
  /** Which rows are selected, for `aria-selected`. Default the active row. */
  isSelected?: (index: number) => boolean
  /** More than one row can be selected. */
  multiselectable?: boolean
  class?: string
}

/** A virtualised list with fixed row height and listbox keyboard navigation (arrows, Home, End, Page Up/Down, Enter). */
export function List<T>(props: ListProps<T>): JSX.Element {
  const id = createId("list")
  const rowHeight = () => props.itemHeight ?? 30
  const overscan = () => props.overscan ?? 6
  const [scrollTop, setScrollTop] = createSignal(0)
  const [measured, setMeasured] = createSignal(400)
  const [localActive, setLocalActive] = createSignal(0)
  const active = () => props.activeIndex ?? localActive()
  const viewport = () => props.height ?? measured()
  let el!: HTMLDivElement

  // Read in the body: a prop getter can make a memo, and onSettled may not create one.
  const fixedHeight = createMemo(() => props.height)
  onSettled(() => {
    if (fixedHeight() !== undefined) return
    setMeasured(el.clientHeight || 400)
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(() => setMeasured(el.clientHeight || 400))
    observer?.observe(el)
    return () => observer?.disconnect()
  })

  const range = createMemo(() => {
    const first = Math.max(0, Math.floor(scrollTop() / rowHeight()) - overscan())
    const last = Math.min(
      props.items.length,
      Math.ceil((scrollTop() + viewport()) / rowHeight()) + overscan(),
    )
    return { first, last }
  })
  // Row indices, not row objects: rows that stay in the window keep their DOM while scrolling.
  const visible = createMemo(() => {
    const { first, last } = range()
    return Array.from({ length: Math.max(0, last - first) }, (_, i) => first + i)
  })

  const setActive = (index: number) => {
    const next = Math.max(0, Math.min(props.items.length - 1, index))
    setLocalActive(next)
    props.onActiveChange?.(next)
    scrollIntoView(next)
  }
  const scrollIntoView = (index: number) => {
    const top = index * rowHeight()
    const bottom = top + rowHeight()
    if (top < el.scrollTop) el.scrollTop = top
    else if (bottom > el.scrollTop + viewport()) el.scrollTop = bottom - viewport()
    setScrollTop(el.scrollTop)
  }
  // A row chosen from outside (the arrow keys of a search box above the list) has to be in view too.
  createEffect(
    () => props.activeIndex,
    (index) => {
      if (index !== undefined && index >= 0 && el) scrollIntoView(index)
    },
    { defer: true },
  )
  const page = () => Math.max(1, Math.floor(viewport() / rowHeight()) - 1)
  const onKeyDown = (event: KeyboardEvent) => {
    const at = active()
    const handlers: Record<string, () => void> = {
      ArrowDown: () => setActive(at + 1),
      ArrowUp: () => setActive(at - 1),
      Home: () => setActive(0),
      End: () => setActive(props.items.length - 1),
      PageDown: () => setActive(at + page()),
      PageUp: () => setActive(at - page()),
      Enter: () => props.items[at] !== undefined && props.onSelect?.(props.items[at] as T, at),
    }
    const handler = handlers[event.key]
    if (handler) {
      event.preventDefault()
      handler()
    }
  }
  return (
    <div
      data-part="list"
      ref={el}
      role="listbox"
      tabindex={props.tabIndex ?? 0}
      aria-label={props.label}
      aria-multiselectable={props.multiselectable ? "true" : undefined}
      aria-activedescendant={props.items.length ? `${id}-${active()}` : undefined}
      class={cx("nc-list", props.class)}
      style={props.height !== undefined ? { height: `${props.height}px` } : undefined}
      onScroll={() => setScrollTop(el.scrollTop)}
      onKeyDown={onKeyDown}
    >
      <div class="nc-list__space" style={{ height: `${props.items.length * rowHeight()}px` }}>
        <For each={visible()}>
          {(index) => (
            <div
              id={`${id}-${index}`}
              role="option"
              aria-selected={aria(props.isSelected ? props.isSelected(index) : active() === index)}
              aria-setsize={props.items.length}
              aria-posinset={index + 1}
              data-index={index}
              data-active={active() === index ? "" : undefined}
              class="nc-list__row"
              style={{ top: `${index * rowHeight()}px`, height: `${rowHeight()}px` }}
              onClick={() => {
                setActive(index)
                props.onSelect?.(props.items[index] as T, index)
              }}
            >
              {props.children(props.items[index] as T, index)}
            </div>
          )}
        </For>
      </div>
    </div>
  )
}
