import { type JSX, Show, splitProps } from "solid-js"
import { cx } from "../lib/cx"
import { callClick, useLinkClick } from "../lib/link"
import { Icon, type IconName, type LucideNode } from "./Icon"
import { Tooltip } from "./Tooltip"

export interface IconButtonProps
  extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> {
  /** Required. Becomes `aria-label` and the tooltip text. */
  label: string
  /** A core icon. */
  icon?: IconName
  /** A Lucide icon, when the core set lacks one. */
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
  const [local, rest] = splitProps(props, [
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
  ])
  const linkClick = useLinkClick()
  const className = () =>
    cx(
      "nc-icon-btn",
      local.round && "nc-icon-btn--round",
      local.size === "sm" && "nc-icon-btn--sm",
      local.class,
    )
  const icon = () => (
    <Icon name={local.icon} node={local.iconNode} size={local.size === "sm" ? "sm" : undefined} />
  )
  const button = local.href ? (
    <a
      data-part="icon-button"
      class={className()}
      href={local.href}
      aria-label={local.label}
      {...(rest as JSX.AnchorHTMLAttributes<HTMLAnchorElement>)}
      onClick={(e) => {
        callClick((rest as { onClick?: unknown }).onClick, e)
        linkClick(e, local.href)
      }}
    >
      {icon()}
    </a>
  ) : (
    <button
      data-part="icon-button"
      type={local.type ?? "button"}
      class={className()}
      aria-label={local.label}
      aria-pressed={local.pressed === undefined ? undefined : local.pressed}
      {...rest}
    >
      {icon()}
    </button>
  )
  return (
    <Show when={local.tooltip !== false} fallback={button}>
      <Tooltip content={local.label} shortcut={local.shortcut}>
        {button}
      </Tooltip>
    </Show>
  )
}
