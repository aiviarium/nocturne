import type { JSX } from "@solidjs/web"
import { merge, omit, Show } from "solid-js"
import { aria } from "../lib/aria"
import { cx } from "../lib/cx"
import { callClick, useLinkClick } from "../lib/link"
import { mergeParts } from "../lib/merge"
import { Icon, type IconName, type LucideNode } from "./Icon"
import { Tooltip } from "./Tooltip"

export interface IconButtonProps
  extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> {
  /** Required. Becomes `aria-label` and the tooltip text. */
  label: string
  /** A named icon. */
  icon?: IconName
  /** Any other Lucide icon, as a node. */
  iconNode?: LucideNode
  /** Toggled-on state (bg-4, text-1). Sets `aria-pressed`. */
  pressed?: boolean
  /** A shortcut shown in the tooltip beside the label. */
  shortcut?: string
  /** Set to false to skip the tooltip. */
  tooltip?: boolean
  /** Round instead of rounded-square. */
  round?: boolean
  /** `md` 28px (default); `sm` 24px for dense rows, list row actions and table bars. */
  size?: "sm" | "md"
  /** Renders a link instead of a button; inside the app it navigates without a page load. */
  href?: string
}

/**
 * A square button that holds only an icon: 28px with a 16px icon, or 24px with a 13px one (`size="sm"`). The
 * label is required and is both its accessible name and its tooltip, so no icon-only control goes unexplained.
 */
export function IconButton(props: IconButtonProps): JSX.Element {
  const rest = omit(
    props,
    "label",
    "icon",
    "iconNode",
    "pressed",
    "shortcut",
    "tooltip",
    "round",
    "size",
    "class",
    "type",
    "href",
  )
  const linkClick = useLinkClick()
  const className = () =>
    cx(
      "nc-icon-btn",
      props.round && "nc-icon-btn--round",
      props.size === "sm" && "nc-icon-btn--sm",
      props.class,
    )
  const icon = () => (
    <Icon name={props.icon} node={props.iconNode} size={props.size === "sm" ? "sm" : undefined} />
  )
  const button = (trigger: Record<string, unknown> = {}) =>
    props.href ? (
      <a
        data-part="icon-button"
        href={props.href}
        aria-label={props.label}
        {...mergeParts(
          merge(rest as JSX.AnchorHTMLAttributes<HTMLAnchorElement>, {
            onClick: (e: MouseEvent & { currentTarget: HTMLAnchorElement }) => {
              callClick((rest as { onClick?: unknown }).onClick, e)
              linkClick(e, props.href)
            },
          }),
          trigger,
        )}
        class={className()}
      >
        {icon()}
      </a>
    ) : (
      <button
        data-part="icon-button"
        type={props.type ?? "button"}
        aria-label={props.label}
        aria-pressed={props.pressed === undefined ? undefined : aria(props.pressed)}
        {...mergeParts(
          merge(rest, {
            onClick: (e: MouseEvent & { currentTarget: HTMLButtonElement; target: Element }) => {
              // A disabled button with a tooltip stays focusable, so the tooltip can say what it does; a press does
              // nothing.
              if (props.disabled) {
                e.preventDefault()
                return
              }
              callClick((rest as { onClick?: unknown }).onClick, e)
            },
          }),
          trigger,
        )}
        disabled={trigger.ref === undefined ? props.disabled : undefined}
        aria-disabled={trigger.ref !== undefined && props.disabled ? "true" : undefined}
        class={className()}
      >
        {icon()}
      </button>
    )
  return (
    <Show when={props.tooltip !== false} fallback={button()}>
      {/* The button is the trigger, so the tooltip names the button itself. */}
      <Tooltip content={props.label} shortcut={props.shortcut} type="label">
        {(trigger) => button(trigger)}
      </Tooltip>
    </Show>
  )
}
