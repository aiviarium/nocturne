import type { JSX } from "@solidjs/web"
import { createSignal, onCleanup, Show } from "solid-js"
import { floatTo } from "../lib/floating"
import { createId } from "../lib/id"
import { Overlay } from "../lib/overlay"
import type { Placement } from "../lib/position"
import { Kbd } from "./Kbd"

export interface TooltipProps {
  /** The words shown. For an icon-only button, the same words as its `aria-label`. */
  content: JSX.Element
  /** A shortcut shown beside the words. */
  shortcut?: string
  /** Default `top`. */
  placement?: Placement
  /** Hover delay in ms before it appears. Keyboard focus shows it at once. Default 400. */
  delay?: number
  /** The element the tooltip describes. */
  children: JSX.Element
}

/** An inverted label that appears on hover and keyboard focus. */
export function Tooltip(props: TooltipProps): JSX.Element {
  const id = createId("tooltip")
  const [open, setOpen] = createSignal(false)
  const [anchor, setAnchor] = createSignal<HTMLElement>()
  let timer: ReturnType<typeof setTimeout> | undefined
  const show = (immediate: boolean) => {
    clearTimeout(timer)
    if (immediate) setOpen(true)
    else timer = setTimeout(() => setOpen(true), props.delay ?? 400)
  }
  const hide = () => {
    clearTimeout(timer)
    setOpen(false)
  }
  onCleanup(() => clearTimeout(timer))
  return (
    <span
      data-part="tooltip-anchor"
      class="nc-tooltip-anchor"
      ref={setAnchor}
      aria-describedby={open() ? id : undefined}
      onPointerEnter={() => show(false)}
      onPointerLeave={hide}
      onPointerDown={hide}
      onFocusIn={(e) => show(e.target instanceof HTMLElement && e.target.matches(":focus-visible"))}
      onFocusOut={hide}
      onKeyDown={(e) => e.key === "Escape" && hide()}
    >
      {props.children}
      <Show when={open() && anchor()}>
        <Overlay anchor={anchor()}>
          <TooltipBubble id={id} anchor={anchor() as HTMLElement} placement={props.placement ?? "top"}>
            {props.content}
            <Show when={props.shortcut}>
              <Kbd keys={props.shortcut} />
            </Show>
          </TooltipBubble>
        </Overlay>
      </Show>
    </span>
  )
}

/** The floating label. Its body owns the float, so the cleanup is registered where Solid allows it. */
function TooltipBubble(props: {
  id: string
  anchor: HTMLElement
  placement: Placement
  children: JSX.Element
}) {
  let stop: (() => void) | undefined
  onCleanup(() => stop?.())
  return (
    <div
      data-part="tooltip"
      id={props.id}
      role="tooltip"
      class="nc-tooltip nc-tooltip--floating"
      ref={(el) => {
        stop = floatTo(props.anchor, el, { placement: props.placement, offset: 6 })
      }}
    >
      {props.children}
    </div>
  )
}
