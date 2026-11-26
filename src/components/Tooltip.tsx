import type { JSX } from "@solidjs/web"
import { TooltipContent, Tooltip as TooltipRoot, TooltipTrigger } from "@ui-sdk/solid/tooltip"
import { Show, untrack } from "solid-js"
import { type Placement, placementSide } from "../lib/placement"
import { Kbd } from "./Kbd"

/** TooltipTriggerProps are what a trigger spreads on the element the tooltip describes. */
export type TooltipTriggerProps = Record<string, unknown>

export interface TooltipProps {
  /** The words shown. For an icon-only button, the same words as its `aria-label`. */
  content: JSX.Element
  /** A shortcut shown beside the words. */
  shortcut?: string
  /** Default `top`. */
  placement?: Placement
  /** Hover delay in ms before it appears. Keyboard focus shows it at once. Default 400. */
  delay?: number
  /**
   * Whether the words name the element (`label`) or add to its name (`description`). By default they name an
   * element without a name of its own and describe any other.
   */
  type?: "label" | "description"
  /**
   * The element the tooltip describes. A function receives the trigger's props, to spread on a focusable element
   * of its own, such as a button; an element is wrapped in a span that takes them.
   */
  children: JSX.Element | ((trigger: TooltipTriggerProps) => JSX.Element)
}

/** A small dark label that appears on hover and keyboard focus: the raised surface in dark, ink in light. */
export function Tooltip(props: TooltipProps): JSX.Element {
  const side = () => placementSide(props.placement ?? "top")
  // A press on the trigger means the person already knows what it does: no tooltip until the pointer leaves it.
  // ui-sdk closes an open tooltip on press; this also stops one that was still waiting out its delay, and one
  // that focus coming back to the trigger (after a menu or a panel it opened) would show.
  let pressed = false
  const watch = (el: HTMLElement, press: unknown) => {
    el.addEventListener("pointerdown", () => {
      pressed = true
    })
    // ui-sdk closes the tooltip from the trigger's onClick, which a button that spreads the trigger's props and
    // sets its own onClick replaces. Calling it from a listener of our own keeps the close; a second close is a
    // no-op when the button kept ui-sdk's handler.
    if (typeof press === "function") el.addEventListener("click", (e) => press(e))
    el.addEventListener("pointerleave", () => {
      pressed = false
    })
  }
  const render = (given: TooltipTriggerProps): JSX.Element => {
    const ref = given.ref
    const trigger: TooltipTriggerProps = {
      ...given,
      ref: (el: HTMLElement) =>
        untrack(() => {
          if (typeof ref === "function") ref(el)
          else if (Array.isArray(ref)) for (const r of ref) if (typeof r === "function") r(el)
          watch(el, given.onClick)
        }),
    }
    const children = props.children
    if (typeof children === "function") return children(trigger)
    return (
      <span {...trigger} data-part="tooltip-anchor" class="nc-tooltip-anchor">
        {children}
      </span>
    )
  }
  return (
    <TooltipRoot
      delay={props.delay ?? 400}
      type={props.type}
      onOpenChange={(next, details) => {
        if (next && pressed) details.cancel()
      }}
    >
      <TooltipTrigger render={render} />
      <TooltipContent
        side={side().side}
        align={side().align}
        sideOffset={6}
        collisionPadding={8}
        data-part="tooltip"
        class="nc-tooltip nc-tooltip--floating"
      >
        {props.content}
        <Show when={props.shortcut}>
          <Kbd keys={props.shortcut} />
        </Show>
      </TooltipContent>
    </TooltipRoot>
  )
}
