import { Index, type JSX, Show, splitProps } from "solid-js"
import { cx } from "../lib/cx"
import { callClick, useLinkClick } from "../lib/link"
import { Icon, type IconName, type LucideNode } from "./Icon"

export interface NavItemProps extends Omit<JSX.AnchorHTMLAttributes<HTMLAnchorElement>, "children"> {
  /** Row label. */
  label: string
  /** A core icon. */
  icon?: IconName
  /** A Lucide icon, when the core set lacks one. */
  iconNode?: LucideNode
  /** Content in the icon's place, such as a letter mark for an entry that has no icon. */
  leading?: JSX.Element
  /** Right-aligned meta: a `Count`, a total in text-3, or a short status such as "1 needs you". */
  meta?: JSX.Element
  /** The current page. Sets `aria-current="page"`. */
  current?: boolean
}

/** A sidebar row. Renders a link when it has an `href`, a button otherwise. */
export function NavItem(props: NavItemProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "label",
    "icon",
    "iconNode",
    "leading",
    "meta",
    "current",
    "class",
    "href",
    "onClick",
  ])
  const linkClick = useLinkClick()
  const body = (
    <>
      <Show
        when={local.leading}
        fallback={
          <Show when={local.icon || local.iconNode}>
            <Icon name={local.icon} node={local.iconNode} />
          </Show>
        }
      >
        {local.leading}
      </Show>
      <span class="nc-nav-item__label">{local.label}</span>
      <Show when={local.meta}>
        <span class="nc-nav-item__meta">{local.meta}</span>
      </Show>
    </>
  )
  return (
    <Show
      when={local.href}
      fallback={
        <button
          data-part="nav-item"
          type="button"
          class={cx("nc-nav-item", local.class)}
          aria-current={local.current ? "page" : undefined}
          onClick={(e) => callClick(local.onClick, e)}
          {...(rest as JSX.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {body}
        </button>
      }
    >
      <a
        data-part="nav-item"
        href={local.href}
        class={cx("nc-nav-item", local.class)}
        aria-current={local.current ? "page" : undefined}
        onClick={(e) => {
          callClick(local.onClick, e)
          linkClick(e, local.href)
        }}
        {...rest}
      >
        {body}
      </a>
    </Show>
  )
}

export interface NavBack {
  /** The place the sidebar shows now: "Atlas web", "Settings". */
  label: string
  /** Where the back control returns to, for its accessible name: "Projects". */
  to: string
  href?: string
  onClick?: (event: MouseEvent) => void
}

export interface NavProps {
  /** Accessible name of the navigation landmark. */
  label: string
  /**
   * A drilled-down sidebar: a header row at the top with a back chevron and the name of the place, over the
   * place's own navigation. It returns to the app's navigation. The main column changes with it, and the path
   * shows in the app's header.
   */
  back?: NavBack
  /** Groups of items, each with an optional sentence-case heading. */
  groups?: Array<{ label?: string; items: NavItemProps[] }>
  /** Free-form content instead of `groups`. */
  children?: JSX.Element
  class?: string
}

/**
 * A sidebar navigation landmark that lays out NavItem groups. Groups and items are kept by position, so a router
 * that builds them afresh on every navigation (to move `current`) updates the items in place: the list isn't
 * rebuilt, and the sidebar keeps its scroll position and focus.
 */
export function Nav(props: NavProps): JSX.Element {
  const linkClick = useLinkClick()
  return (
    <nav data-part="nav" aria-label={props.label} class={cx("nc-nav", props.class)}>
      <Show when={props.back}>
        {(b) => (
          <Show
            when={b().href}
            fallback={
              <button
                type="button"
                data-part="nav-back"
                class="nc-nav__back"
                aria-label={`Back to ${b().to}`}
                title={`Back to ${b().to}`}
                onClick={(e) => callClick(b().onClick, e)}
              >
                <Icon name="chevron-left" size="sm" />
                <span class="nc-nav__back-label">{b().label}</span>
              </button>
            }
          >
            <a
              data-part="nav-back"
              class="nc-nav__back"
              href={b().href}
              aria-label={`Back to ${b().to}`}
              title={`Back to ${b().to}`}
              onClick={(e) => {
                callClick(b().onClick, e)
                linkClick(e, b().href)
              }}
            >
              <Icon name="chevron-left" size="sm" />
              <span class="nc-nav__back-label">{b().label}</span>
            </a>
          </Show>
        )}
      </Show>
      <Index each={props.groups ?? []}>
        {(group) => (
          <>
            <Show when={group().label}>
              <span class="nc-nav__label">{group().label}</span>
            </Show>
            <Index each={group().items}>{(item) => <NavItem {...item()} />}</Index>
          </>
        )}
      </Index>
      {props.children}
    </nav>
  )
}
