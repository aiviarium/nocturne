import { createEffect, type JSX, onCleanup, Show, splitProps } from "solid-js"
import { cx } from "../lib/cx"
import { floatTo } from "../lib/floating"
import { pushLayer } from "../lib/layers"
import { Overlay } from "../lib/overlay"
import type { Placement } from "../lib/position"

export interface PopoverProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "ref"> {
  /** Whether the popover is shown. */
  open: boolean
  /** The element it is attached to. Clicks on it do not count as outside clicks. */
  anchor: HTMLElement | undefined
  /** Called on Escape or a pointer press outside the popover and its anchor. */
  onClose?: () => void
  /** Preferred side and alignment; it flips when there is no room. Default `bottom-start`. */
  placement?: Placement
  /** Gap to the anchor in px. Default 4. */
  offset?: number
  /** Make the popover at least as wide as its anchor. */
  matchWidth?: boolean
  /** Receives the floating element once it is mounted. */
  floatRef?: (el: HTMLDivElement) => void
}

/** A floating surface attached to an anchor, mounted in an overlay root so it inherits the theme. */
export function Popover(props: PopoverProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "open",
    "anchor",
    "onClose",
    "placement",
    "offset",
    "matchWidth",
    "floatRef",
    "class",
    "children",
  ])
  return (
    <Show when={local.open}>
      <Overlay anchor={local.anchor}>
        <PopoverSurface {...local} class={cx("nc-popover", local.class)} {...rest} />
      </Overlay>
    </Show>
  )
}

function PopoverSurface(
  props: Pick<
    PopoverProps,
    "anchor" | "onClose" | "placement" | "offset" | "matchWidth" | "floatRef" | "children" | "class"
  > &
    JSX.HTMLAttributes<HTMLDivElement>,
): JSX.Element {
  const [local, rest] = splitProps(props, [
    "anchor",
    "onClose",
    "placement",
    "offset",
    "matchWidth",
    "floatRef",
    "children",
  ])
  let el!: HTMLDivElement
  const layer = pushLayer()
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape" && layer.isTop()) {
      event.stopPropagation()
      event.preventDefault()
      local.onClose?.()
    }
  }
  const onPointer = (event: PointerEvent) => {
    // The first node of the path, not `target`: from inside a shadow root `target` is the shadow host.
    const target = (event.composedPath()[0] ?? event.target) as Node
    if (!layer.isTop() || el.contains(target) || local.anchor?.contains(target)) return
    local.onClose?.()
  }
  document.addEventListener("keydown", onKey, true)
  document.addEventListener("pointerdown", onPointer, true)
  onCleanup(() => {
    document.removeEventListener("keydown", onKey, true)
    document.removeEventListener("pointerdown", onPointer, true)
    layer.remove()
  })
  createEffect(() => {
    const anchor = local.anchor
    if (!anchor) return
    const stop = floatTo(anchor, el, {
      placement: local.placement,
      offset: local.offset,
      matchWidth: local.matchWidth,
    })
    onCleanup(stop)
  })
  return (
    <div
      data-part="popover"
      ref={(node) => {
        el = node
        local.floatRef?.(node)
      }}
      {...rest}
    >
      {local.children}
    </div>
  )
}
