import { type JSX, Show, splitProps } from "solid-js"
import { cx } from "../lib/cx"
import { callClick, useLinkClick } from "../lib/link"
import { Icon, type IconName, type LucideNode } from "./Icon"
import { Kbd } from "./Kbd"

export type ButtonVariant = "primary" | "secondary" | "ghost" | "accent" | "danger"
export type ButtonSize = "sm" | "md" | "lg"

export interface ButtonProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /**
   * `primary` is the one action that completes a flow (a dialog's submit, a sign-in), never an add action (that
   * is a ghost plus `IconButton`). `accent` starts AI work, `danger` destroys. Default `secondary`.
   */
  variant?: ButtonVariant
  /** 24px, 28px (default) or 32px. */
  size?: ButtonSize
  /** A core icon before the label. */
  icon?: IconName
  /** A Lucide icon before the label, when the core set lacks one. */
  iconNode?: LucideNode
  /** A core icon after the label, such as a chevron. */
  iconEnd?: IconName
  /** A shortcut hint inside the button, after the label. */
  kbd?: string
  /** Shows a busy state and ignores clicks. */
  loading?: boolean
  /** Make it a link (`<a>`) styled as a button. */
  href?: string
  children?: JSX.Element
}

/** A text button. Labels say exactly what happens: "Reboot now", not "OK". */
export function Button(props: ButtonProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "variant",
    "size",
    "icon",
    "iconNode",
    "iconEnd",
    "kbd",
    "loading",
    "href",
    "class",
    "children",
    "type",
    "disabled",
    "onClick",
  ])
  const linkClick = useLinkClick()
  const className = () =>
    cx(
      "nc-btn",
      `nc-btn--${local.variant ?? "secondary"}`,
      local.size === "sm" && "nc-btn--sm",
      local.size === "lg" && "nc-btn--lg",
      local.class,
    )
  const content = (
    <>
      <Show when={local.icon || local.iconNode}>
        <Icon name={local.icon} node={local.iconNode} size="sm" />
      </Show>
      {local.children}
      <Show when={local.iconEnd}>
        <Icon name={local.iconEnd} size="sm" />
      </Show>
      <Show when={local.kbd}>
        <Kbd keys={local.kbd} />
      </Show>
    </>
  )
  return (
    <Show
      when={local.href}
      fallback={
        <button
          data-part="button"
          data-variant={local.variant ?? "secondary"}
          class={className()}
          type={local.type ?? "button"}
          disabled={local.disabled || local.loading}
          aria-busy={local.loading || undefined}
          onClick={(e) => callClick(local.onClick, e)}
          {...rest}
        >
          {content}
        </button>
      }
    >
      <a
        data-part="button"
        data-variant={local.variant ?? "secondary"}
        class={className()}
        href={local.href}
        onClick={(e) => {
          callClick(local.onClick, e)
          linkClick(e, local.href)
        }}
        {...(rest as JSX.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {content}
      </a>
    </Show>
  )
}
