import type { JSX } from "@solidjs/web"
import { For, omit, Show } from "solid-js"
import { cx } from "../lib/cx"
import { callClick, useLinkClick } from "../lib/link"
import { Icon, type IconName, type LucideNode } from "./Icon"
import { IconButton } from "./IconButton"

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
  /** Where the row goes: rendered as a link. */
  href?: string
  /** The row opens a level of the sidebar, such as a project's or a host's places: a chevron ends it. */
  drill?: boolean
}

/** A sidebar row. Renders a link when it has an `href`, a button otherwise. */
export function NavItem(props: NavItemProps): JSX.Element {
  const rest = omit(
    props,
    "label",
    "icon",
    "iconNode",
    "leading",
    "meta",
    "current",
    "class",
    "href",
    "onClick",
    "drill",
  )
  const linkClick = useLinkClick()
  const body = (
    <>
      <Show
        when={props.leading}
        fallback={
          <Show when={props.icon || props.iconNode}>
            <Icon name={props.icon} node={props.iconNode} />
          </Show>
        }
      >
        {props.leading}
      </Show>
      <span class="nc-nav-item__label">{props.label}</span>
      <Show when={props.meta}>
        <span class="nc-nav-item__meta">{props.meta}</span>
      </Show>
      <Show when={props.drill}>
        <Icon name="chevron-right" size="sm" class="nc-nav-item__drill" />
      </Show>
    </>
  )
  return (
    <Show
      when={props.href}
      fallback={
        <button
          data-part="nav-item"
          type="button"
          class={cx("nc-nav-item", props.class)}
          aria-current={props.current ? "page" : undefined}
          onClick={(e) => callClick(props.onClick, e)}
          {...(rest as JSX.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {body}
        </button>
      }
    >
      <a
        data-part="nav-item"
        href={props.href}
        class={cx("nc-nav-item", props.class)}
        aria-current={props.current ? "page" : undefined}
        onClick={(e) => {
          callClick(props.onClick, e)
          linkClick(e, props.href)
        }}
        {...rest}
      >
        {body}
      </a>
    </Show>
  )
}

/** NavGroup is a run of items under an optional heading. */
export interface NavGroup {
  /** The sentence-case heading. */
  label?: string
  /** One small icon action at the heading's end, such as adding an item to the group. Needs a `label`. */
  action?: { label: string; icon: IconName; onClick: () => void }
  items: NavItemProps[]
}

export interface NavProps {
  /** Accessible name of the navigation landmark. */
  label: string
  /** Groups of items, each with an optional sentence-case heading and one action beside it. */
  groups?: NavGroup[]
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
  return (
    <nav data-part="nav" aria-label={props.label} class={cx("nc-nav", props.class)}>
      <For keyed={false} each={props.groups ?? []}>
        {(group) => (
          <>
            <Show when={group().label}>
              <Show when={group().action} fallback={<span class="nc-nav__label">{group().label}</span>}>
                {(action) => (
                  <div class="nc-nav__head" data-empty={group().items.length === 0 ? "" : undefined}>
                    <span class="nc-nav__label">{group().label}</span>
                    <IconButton
                      size="sm"
                      class="nc-nav__action"
                      icon={action().icon}
                      label={action().label}
                      onClick={() => action().onClick()}
                    />
                  </div>
                )}
              </Show>
            </Show>
            <For keyed={false} each={group().items}>
              {(item) => <NavItem {...item()} />}
            </For>
          </>
        )}
      </For>
      {props.children}
    </nav>
  )
}
