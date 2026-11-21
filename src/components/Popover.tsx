import type { JSX } from "@solidjs/web"
import {
  PopoverContent,
  PopoverDescription,
  Popover as PopoverRoot,
  PopoverTitle,
  PopoverTrigger,
} from "@ui-sdk/solid/popover"
import { omit, onCleanup } from "solid-js"
import { cx } from "../lib/cx"
import { pushLayer } from "../lib/layers"
import { type Placement, placementSide } from "../lib/placement"

export interface PopoverProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "ref"> {
  /** Whether the popover is shown. */
  open: boolean
  /** The element it is attached to. Presses on it do not count as outside presses. */
  anchor: HTMLElement | undefined
  /** Called on Escape, a press outside the popover and its anchor, or focus leaving it. */
  onClose?: () => void
  /** Preferred side and alignment; it flips when there is no room. Default `bottom-start`. */
  placement?: Placement
  /** Gap to the anchor in px. Default 4. */
  offset?: number
  /** Make the popover at least as wide as its anchor. */
  matchWidth?: boolean
  /** Receives the floating element once it is mounted. */
  floatRef?: (el: HTMLDivElement) => void
  /** Where focus goes on open: `auto` (the first focusable element), `content` or `none`. Default `none`. */
  initialFocus?: "auto" | "content" | "none"
}

/**
 * A floating surface attached to an element the caller owns. The caller keeps `open` and closes it in `onClose`.
 *
 * ui-sdk does the placing, the dismissal and the focus: the popover renders in the top layer where it sits in the
 * tree, so it keeps the theme of what opened it. For a button that opens it, `PopoverButton` wires the trigger too.
 */
export function Popover(props: PopoverProps): JSX.Element {
  const rest = omit(
    props,
    "open",
    "anchor",
    "onClose",
    "placement",
    "offset",
    "matchWidth",
    "floatRef",
    "initialFocus",
    "class",
    "children",
    "style",
  )
  const side = () => placementSide(props.placement ?? "bottom-start")
  return (
    <PopoverRoot
      open={props.open}
      modal={false}
      onOpenChange={(next, details) => {
        if (next) return
        // The anchor toggles the popover itself; a press on it is not a press outside.
        const target = details.event?.target
        if (details.reason === "outside-press" && target instanceof Node && props.anchor?.contains(target)) {
          details.cancel()
          return
        }
        props.onClose?.()
      }}
    >
      <PopoverContent
        anchor={props.anchor ?? null}
        side={side().side}
        align={side().align}
        sideOffset={props.offset ?? 4}
        collisionPadding={8}
        initialFocus={props.initialFocus ?? "none"}
        data-part="popover"
        class={cx("nc-popover", props.class)}
        style={{
          ...(typeof props.style === "object" ? props.style : {}),
          ...(props.matchWidth ? { "min-width": "var(--anchor-width)" } : {}),
        }}
        ref={(node: HTMLDivElement) => props.floatRef?.(node)}
        {...rest}
      >
        <OpenLayer />
        {props.children}
      </PopoverContent>
    </PopoverRoot>
  )
}

/** OpenLayer counts an open popup in `openLayers` while it is mounted. */
export function OpenLayer(): JSX.Element {
  const layer = pushLayer()
  onCleanup(layer.remove)
  return null
}

export interface PopoverButtonProps {
  /** The trigger's content. */
  label: JSX.Element
  /** The trigger's class; default a secondary button. */
  triggerClass?: string
  /** The trigger's accessible name, when its content is only an icon. */
  "aria-label"?: string
  /** The popover's title, which names it for a screen reader. */
  title?: JSX.Element
  description?: JSX.Element
  placement?: Placement
  offset?: number
  open?: boolean
  onOpenChange?: (open: boolean) => void
  class?: string
  children?: JSX.Element
}

/** A button and the popover it opens: the composed form, for a popover that owns its trigger. */
export function PopoverButton(props: PopoverButtonProps): JSX.Element {
  const side = () => placementSide(props.placement ?? "bottom-start")
  return (
    <PopoverRoot open={props.open} onOpenChange={(next) => props.onOpenChange?.(next)}>
      <PopoverTrigger class={props.triggerClass ?? "nc-btn"} aria-label={props["aria-label"]}>
        {props.label}
      </PopoverTrigger>
      <PopoverContent
        side={side().side}
        align={side().align}
        sideOffset={props.offset ?? 4}
        collisionPadding={8}
        data-part="popover"
        class={cx("nc-popover nc-popover--panel", props.class)}
      >
        <OpenLayer />
        {props.title === undefined ? null : (
          <PopoverTitle class="nc-popover__title">{props.title}</PopoverTitle>
        )}
        {props.description === undefined ? null : (
          <PopoverDescription class="nc-popover__description">{props.description}</PopoverDescription>
        )}
        {props.children}
      </PopoverContent>
    </PopoverRoot>
  )
}
