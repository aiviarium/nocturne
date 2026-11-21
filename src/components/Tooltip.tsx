import type { JSX } from "@solidjs/web"
import { TooltipContent, Tooltip as TooltipRoot, TooltipTrigger } from "@ui-sdk/solid/tooltip"
import { Show } from "solid-js"
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

/** An inverted label that appears on hover and keyboard focus. */
export function Tooltip(props: TooltipProps): JSX.Element {
  const side = () => placementSide(props.placement ?? "top")
  const render = (trigger: TooltipTriggerProps): JSX.Element => {
    const children = props.children
    if (typeof children === "function") return children(trigger)
    return (
      <span {...trigger} data-part="tooltip-anchor" class="nc-tooltip-anchor">
        {children}
      </span>
    )
  }
  return (
    <TooltipRoot delay={props.delay ?? 400} type={props.type}>
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
