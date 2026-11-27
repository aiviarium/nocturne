import type { JSX } from "@solidjs/web"
import { omit, Show } from "solid-js"
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
  /** A named icon before the label. */
  icon?: IconName
  /** Any other Lucide icon before the label, as a node. */
  iconNode?: LucideNode
  /** A named icon after the label, such as a chevron. */
  iconEnd?: IconName
  /** A shortcut hint inside the button, after the label. */
  kbd?: string
  /** Shows a busy state and ignores clicks. */
  loading?: boolean
  /**
   * A ghost button set among text, such as a picker in a table cell beside plain values: its padding hangs outside
   * its box and it takes the surrounding type, so its label lines up with the text above and below it.
   */
  flush?: boolean
  /** Make it a link (`<a>`) styled as a button. */
  href?: string
  children?: JSX.Element
}

/** A text button. Labels say exactly what happens: "Reboot now", not "OK". */
export function Button(props: ButtonProps): JSX.Element {
  const rest = omit(
    props,
    "variant",
    "size",
    "icon",
    "iconNode",
    "iconEnd",
    "kbd",
    "loading",
    "flush",
    "href",
    "class",
    "children",
    "type",
    "disabled",
    "onClick",
  )
  const linkClick = useLinkClick()
  const className = () =>
    cx(
      "nc-btn",
      `nc-btn--${props.variant ?? "secondary"}`,
      props.size === "sm" && "nc-btn--sm",
      props.size === "lg" && "nc-btn--lg",
      props.flush && "nc-btn--flush",
      props.class,
    )
  const content = (
    <>
      <Show when={props.icon || props.iconNode}>
        <Icon name={props.icon} node={props.iconNode} size="sm" />
      </Show>
      {props.children}
      <Show when={props.iconEnd}>
        <Icon name={props.iconEnd} size="sm" />
      </Show>
      <Show when={props.kbd}>
        <Kbd keys={props.kbd} />
      </Show>
    </>
  )
  return (
    <Show
      when={props.href}
      fallback={
        <button
          data-part="button"
          data-variant={props.variant ?? "secondary"}
          class={className()}
          type={props.type ?? "button"}
          disabled={props.disabled || props.loading}
          aria-busy={props.loading ? "true" : undefined}
          onClick={(e) => callClick(props.onClick, e)}
          {...rest}
        >
          {content}
        </button>
      }
    >
      <a
        data-part="button"
        data-variant={props.variant ?? "secondary"}
        class={className()}
        href={props.href}
        onClick={(e) => {
          callClick(props.onClick, e)
          linkClick(e, props.href)
        }}
        {...(rest as JSX.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {content}
      </a>
    </Show>
  )
}
