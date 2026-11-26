// The handle on a resizable border: the sidebar's edge, a docked panel's edge, the border between two columns
// inside a view. Invisible until hovered (after 120ms), a 4px hit area over the hairline the surfaces already draw,
// and only the handle being dragged lights up.
import type { JSX } from "@solidjs/web"
import { createSignal, onCleanup } from "solid-js"
import { cx } from "../lib/cx"
import { readJson, type ShellStorage, writeJson } from "./storage"

/** A size a handle drives: the value, a setter that clamps, and the reset a double-click does. */
export interface SizeModel {
  value: () => number
  set: (px: number) => void
  reset: () => void
  min: number
  max: number
}

export interface StoredWidthOptions {
  initial: number
  min: number
  max: number
  /** Where the width is remembered, under `width/{id}`. Without one it lasts as long as the page. */
  storage?: ShellStorage
}

/**
 * A width (or height) remembered by id, clamped to `min`..`max`. `reset` goes back to `initial` and forgets the
 * stored value.
 */
export function createStoredWidth(id: string, options: StoredWidthOptions): SizeModel {
  const key = `width/${id}`
  const clamp = (px: number) => Math.round(Math.min(options.max, Math.max(options.min, px)))
  const stored = readJson<number>(options.storage, key)
  const [value, setValue] = createSignal(typeof stored === "number" ? clamp(stored) : options.initial, {
    ownedWrite: true,
  })
  return {
    value,
    set(px) {
      const next = clamp(px)
      setValue(next)
      writeJson(options.storage, key, next)
    },
    reset() {
      setValue(options.initial)
      writeJson(options.storage, key, undefined)
    },
    min: options.min,
    max: options.max,
  }
}

export interface ResizeHandleProps {
  /**
   * The edge of the sized element the handle sits on: `right` for a sidebar or a list left of a border (dragging
   * right widens it), `left` for a right panel or a column right of a border, `top` for a bottom panel, `bottom`
   * for something docked at the top. The element needs `position: relative`.
   */
  at: "right" | "left" | "top" | "bottom"
  size: SizeModel
  /** Names the handle: "Resize sidebar". */
  label: string
  /** Pixels per arrow key; Shift takes five steps. Default 8. */
  step?: number
  onDragStart?: () => void
  onDragEnd?: () => void
  class?: string
}

/**
 * A focusable separator on a border. Drag it, use the arrow keys along its axis (Shift for bigger steps), Home and
 * End for the limits, or double-click it to reset.
 */
export function ResizeHandle(props: ResizeHandleProps): JSX.Element {
  const [dragging, setDragging] = createSignal(false)
  const vertical = () => props.at === "left" || props.at === "right"
  // +1 when moving the pointer right (or down) widens the element.
  const sign = () => (props.at === "right" || props.at === "bottom" ? 1 : -1)
  let stop: (() => void) | undefined
  onCleanup(() => stop?.())

  const start = (e: PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture?.(e.pointerId)
    const origin = vertical() ? e.clientX : e.clientY
    const from = props.size.value()
    const move = (ev: PointerEvent) => {
      const d = (vertical() ? ev.clientX : ev.clientY) - origin
      props.size.set(from + d * sign())
    }
    const root = document.documentElement
    stop = () => {
      el.removeEventListener("pointermove", move)
      el.removeEventListener("pointerup", stop!)
      el.removeEventListener("pointercancel", stop!)
      root.removeAttribute("data-nc-resizing")
      setDragging(false)
      stop = undefined
      props.onDragEnd?.()
    }
    root.setAttribute("data-nc-resizing", vertical() ? "x" : "y")
    setDragging(true)
    props.onDragStart?.()
    el.addEventListener("pointermove", move)
    el.addEventListener("pointerup", stop)
    el.addEventListener("pointercancel", stop)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const step = (props.step ?? 8) * (e.shiftKey ? 5 : 1)
    const grow = { right: "ArrowRight", left: "ArrowLeft", bottom: "ArrowDown", top: "ArrowUp" }[props.at]
    const shrink = { right: "ArrowLeft", left: "ArrowRight", bottom: "ArrowUp", top: "ArrowDown" }[props.at]
    const now = props.size.value()
    if (e.key === grow) props.size.set(now + step)
    else if (e.key === shrink) props.size.set(now - step)
    else if (e.key === "Home") props.size.set(props.size.min)
    else if (e.key === "End") props.size.set(props.size.max)
    else return
    e.preventDefault()
  }

  return (
    <div
      data-part="resize-handle"
      data-at={props.at}
      data-dragging={dragging() ? "" : undefined}
      role="separator"
      tabindex="0"
      aria-orientation={vertical() ? "vertical" : "horizontal"}
      aria-label={props.label}
      aria-valuenow={props.size.value()}
      aria-valuemin={props.size.min}
      aria-valuemax={props.size.max}
      title="Drag to resize, double-click to reset"
      class={cx("nc-resize-handle", props.class)}
      onPointerDown={start}
      onDblClick={() => props.size.reset()}
      onKeyDown={onKeyDown}
    />
  )
}
