import { createContext, For, type JSX, onCleanup, Show, useContext } from "solid-js"
import { cx } from "../lib/cx"
import { useLinkClick } from "../lib/link"
import { Button } from "./Button"
import { Icon, type IconName } from "./Icon"
import { IconButton } from "./IconButton"
import { DropdownMenu, type MenuEntry } from "./Menu"
import { type BarAction, useScreen } from "./NavigationBar"
import { useViewLayout } from "./ViewLayout"

// The standard header of a view. It never repeats the view's title (the tab shows it): it holds breadcrumbs or
// context where there is something to say, and the view's actions in one order everywhere: icon actions, the pin,
// the overflow menu, then the primary action, and the toggle of the layout's right-hand panel last. With nothing
// to say it renders nothing and takes no room.
//
// The pin is the frame's: the app provides `ViewChrome`, so a view's "favourite" and the app's pin to the
// sidebar are one star, shown once, here.

export interface ViewCrumb {
  label: string
  href?: string
  onClick?: () => void
  icon?: IconName
}

export interface ViewAction {
  id: string
  label: string
  icon?: IconName
  onClick: () => void
  /** An action that completes a flow: a text button at the end. Adding (New issue) is a `plus` icon action, never this. */
  primary?: boolean
  /** Only in the overflow menu. */
  overflow?: boolean
  /** A choice in the phone's menu: shows a check mark when true. */
  checked?: boolean
  /** A heading in the phone's menu over a run of actions with the same one. */
  section?: string
  pressed?: boolean
  disabled?: boolean
  danger?: boolean
  shortcut?: string
  /** A count beside the icon (comments): shown only when it is not 0. */
  count?: number
}

/** What the app tells a view's header: the pin of what the view shows. */
export interface ViewChromeValue {
  pinnable: () => boolean
  pinned: () => boolean
  togglePin: () => void
}

export const ViewChrome = createContext<ViewChromeValue>()

export interface ViewHeaderProps {
  crumbs?: ViewCrumb[]
  /** Short context after the crumbs: a state that is out of the ordinary, a chip. */
  context?: JSX.Element
  /** Free content in the middle: a search field, view switches. */
  children?: JSX.Element
  actions?: ViewAction[]
  /** Leave out the app's pin (for views whose content is not worth pinning). */
  noPin?: boolean
  class?: string
}

const present = (x: unknown) =>
  x !== undefined && x !== null && x !== false && !(Array.isArray(x) && !x.length)

/**
 * On a phone the header is the screen's navigation bar: its actions become the bar's (two at most, the rest and
 * the pin in its menu), its context the line under the title, and what it holds in the middle a row at the top
 * of the content. The crumbs are not shown: the stack is the way back, and the back control names the screen
 * before. The title stays the view's own (`view.setTitle`), or the last crumb when the view sets none.
 */
function PhoneViewHeader(props: ViewHeaderProps): JSX.Element {
  const screen = useScreen()!
  const chrome = useContext(ViewChrome)
  const actions = (): BarAction[] => {
    const out: BarAction[] = (props.actions ?? []).map((a) => ({
      id: a.id,
      label: a.label,
      icon: a.icon,
      onClick: a.onClick,
      primary: a.primary,
      overflow: a.overflow,
      checked: a.checked,
      section: a.section,
      pressed: a.pressed,
      disabled: a.disabled,
      danger: a.danger,
      count: a.count,
    }))
    if (!props.noPin && chrome?.pinnable())
      out.push({
        id: "pin",
        label: chrome.pinned() ? "Remove from the sidebar" : "Add to the sidebar",
        icon: "star",
        overflow: true,
        onClick: () => chrome.togglePin(),
      })
    return out
  }
  const off = screen.provide(() => ({
    title: undefined,
    subtitle: props.context,
    actions: actions(),
  }))
  onCleanup(off)
  const crumbTitle = screen.provide(() => {
    const last = props.crumbs?.at(-1)?.label
    return last ? { fallbackTitle: last } : {}
  })
  onCleanup(crumbTitle)
  return (
    <Show when={present(props.children)}>
      <div class={cx("nc-view-header--phone", props.class)} data-part="view-header-phone">
        {props.children}
      </div>
    </Show>
  )
}

export function ViewHeader(props: ViewHeaderProps): JSX.Element {
  if (useScreen()) return <PhoneViewHeader {...props} />
  const chrome = useContext(ViewChrome)
  const layout = useViewLayout()
  const linkClick = useLinkClick()
  const actions = () => props.actions ?? []
  const icons = () => actions().filter((a) => !a.primary && !a.overflow)
  const overflow = () => actions().filter((a) => a.overflow)
  const primary = () => actions().filter((a) => a.primary && !a.overflow)
  const asideToggle = () => Boolean(layout?.hasAside())
  // The pin alone is not something to say: without other content the header stays away, and the tab's menu pins.
  const content = () =>
    present(props.crumbs) || present(props.context) || present(props.children) || actions().length > 0
  const shown = () => content() || asideToggle()
  const pin = () => content() && !props.noPin && chrome?.pinnable()
  const menu = (): MenuEntry[] =>
    overflow().map((a) => ({
      id: a.id,
      label: a.label,
      icon: a.icon,
      disabled: a.disabled,
      danger: a.danger,
      shortcut: a.shortcut,
    }))
  return (
    <Show when={shown()}>
      <header class={cx("nc-view-header body", props.class)} data-part="view-header">
        <Show when={present(props.crumbs)}>
          <nav class="nc-view-header__crumbs" aria-label="Breadcrumbs" data-part="breadcrumbs">
            <For each={props.crumbs}>
              {(c, i) => (
                <>
                  <Show when={i() > 0}>
                    <span class="nc-view-header__sep" aria-hidden="true">
                      /
                    </span>
                  </Show>
                  <Show
                    when={(c.href || c.onClick) && i() < props.crumbs!.length - 1}
                    fallback={
                      <span
                        class="nc-view-header__crumb"
                        aria-current={i() === props.crumbs!.length - 1 ? "page" : undefined}
                      >
                        <Show when={c.icon}>
                          <Icon name={c.icon} size="sm" />
                        </Show>
                        {c.label}
                      </span>
                    }
                  >
                    <a
                      class="nc-view-header__crumb nc-view-header__crumb--link"
                      href={c.href ?? "#"}
                      onClick={(e) => {
                        if (c.onClick) {
                          e.preventDefault()
                          c.onClick()
                        } else linkClick(e, c.href)
                      }}
                    >
                      <Show when={c.icon}>
                        <Icon name={c.icon} size="sm" />
                      </Show>
                      {c.label}
                    </a>
                  </Show>
                </>
              )}
            </For>
          </nav>
        </Show>
        <Show when={props.context}>
          <span class="nc-view-header__context">{props.context}</span>
        </Show>
        <span class="nc-view-header__middle">{props.children}</span>
        <span class="nc-view-header__actions" data-part="view-actions">
          <For each={icons()}>
            {(a) => (
              <Show
                when={!a.count || !a.icon}
                fallback={
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={a.icon}
                    aria-label={a.label}
                    aria-pressed={a.pressed}
                    title={a.label}
                    disabled={a.disabled}
                    data-action={a.id}
                    class="nc-view-header__count"
                    onClick={a.onClick}
                  >
                    {a.count}
                  </Button>
                }
              >
                <Show
                  when={a.icon}
                  fallback={
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={a.disabled}
                      data-action={a.id}
                      onClick={a.onClick}
                    >
                      {a.label}
                    </Button>
                  }
                >
                  <IconButton
                    label={a.label}
                    icon={a.icon}
                    pressed={a.pressed}
                    disabled={a.disabled}
                    shortcut={a.shortcut}
                    data-action={a.id}
                    onClick={a.onClick}
                  />
                </Show>
              </Show>
            )}
          </For>
          <Show when={pin()}>
            <IconButton
              label={chrome!.pinned() ? "Remove from the sidebar" : "Add to the sidebar"}
              icon="star"
              pressed={chrome!.pinned()}
              data-part="pin-view"
              onClick={() => chrome!.togglePin()}
            />
          </Show>
          <Show when={overflow().length}>
            <DropdownMenu
              label="More actions"
              items={menu()}
              placement="bottom-end"
              onSelect={(id) =>
                overflow()
                  .find((a) => a.id === id)
                  ?.onClick()
              }
              trigger={(t) => (
                <IconButton {...t} label="More actions" icon="more" data-part="view-overflow" />
              )}
            />
          </Show>
          <For each={primary()}>
            {(a) => (
              <Button
                size="sm"
                variant="primary"
                icon={a.icon}
                disabled={a.disabled}
                data-action={a.id}
                onClick={a.onClick}
              >
                {a.label}
              </Button>
            )}
          </For>
          <Show when={asideToggle()}>
            <IconButton
              label={
                layout!.asideOpen()
                  ? `Hide ${layout!.asideLabel().toLowerCase()}`
                  : `Show ${layout!.asideLabel().toLowerCase()}`
              }
              icon="panel-right"
              pressed={layout!.asideOpen()}
              shortcut={layout!.keys().aside}
              data-part="view-aside-toggle"
              onClick={() => layout!.toggleAside()}
            />
          </Show>
        </span>
      </header>
    </Show>
  )
}
