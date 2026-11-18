import { createContext, For, type JSX, onCleanup, Show, useContext } from "solid-js"
import { Portal } from "solid-js/web"
import { cx } from "../lib/cx"
import { useLinkClick, useNavigate } from "../lib/link"
import { Button } from "./Button"
import { Icon, type IconName } from "./Icon"
import { IconButton } from "./IconButton"
import { DropdownMenu, type MenuEntry } from "./Menu"
import { type BarAction, useScreen } from "./NavigationBar"
import { useShellHeader } from "./ShellHeader"
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
  /**
   * The path to where the view is. Every crumb but the last is a link; the last is the page. A label that does
   * not fit is cut and shows its full text on hover. To strip the path, pass only the crumbs that help.
   */
  crumbs?: ViewCrumb[]
  /**
   * Fold this many leading crumbs into one `…` crumb that opens a menu of them: the path stays short and its
   * start stays one click away. The view picks it per target.
   */
  fold?: number
  /**
   * A back control in place of the crumbs, for a target reached from one list that has no useful path (a chat
   * opened from the session list). It names where it goes. The crumbs are not shown with it.
   */
  back?: ViewCrumb
  /**
   * An up control before the crumbs: an arrow back to the crumb before the last, named after it. Use it on a
   * drilled-down target, so the level above is one click at the same place on every level.
   */
  up?: boolean
  /**
   * `view` (default): the header at the top of the view. `shell`: the header shows in the `AppShell`'s header
   * bar, beside the sidebar and above the frames, as most apps place the path. It stays part of its view, so
   * the inspector toggle and the pin still work. Outside an `AppShell` it shows as `view`.
   */
  variant?: "view" | "shell"
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
  const shell = useShellHeader()
  if (props.variant === "shell" && shell) {
    onCleanup(shell.claim())
    return (
      <Portal mount={shell.mount()} ref={(el: HTMLDivElement) => el.classList.add("nc-shell__header-slot")}>
        <DesktopViewHeader {...props} />
      </Portal>
    )
  }
  return <DesktopViewHeader {...props} />
}

function DesktopViewHeader(props: ViewHeaderProps): JSX.Element {
  const chrome = useContext(ViewChrome)
  const layout = useViewLayout()
  const linkClick = useLinkClick()
  const navigate = useNavigate()
  const actions = () => props.actions ?? []
  const fold = () => Math.max(0, Math.min(props.fold ?? 0, (props.crumbs?.length ?? 0) - 1))
  const folded = () => props.crumbs?.slice(0, fold()) ?? []
  const path = () => props.crumbs?.slice(fold()) ?? []
  /** A folded crumb chosen from its menu: its own handler, else the app's router, else the address. */
  const go = (c: ViewCrumb) => {
    if (c.onClick) return c.onClick()
    if (!c.href) return
    if (navigate && c.href.startsWith("/") && !c.href.startsWith("//")) navigate(c.href)
    else location.assign(c.href)
  }
  const icons = () => actions().filter((a) => !a.primary && !a.overflow)
  const overflow = () => actions().filter((a) => a.overflow)
  const primary = () => actions().filter((a) => a.primary && !a.overflow)
  const asideToggle = () => Boolean(layout?.hasAside())
  // The pin alone is not something to say: without other content the header stays away, and the tab's menu pins.
  /** Where the up control goes: the crumb before the last, when it leads somewhere. */
  const upTo = () => {
    if (!props.up || props.back) return undefined
    const c = props.crumbs?.at(-2)
    return c && (c.href || c.onClick) ? c : undefined
  }
  const content = () =>
    Boolean(props.back) ||
    present(props.crumbs) ||
    present(props.context) ||
    present(props.children) ||
    actions().length > 0
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
      <header
        class={cx("nc-view-header body", props.variant === "shell" && "nc-view-header--shell", props.class)}
        data-part="view-header"
        data-variant={props.variant ?? "view"}
      >
        <Show when={upTo()}>
          {(c) => (
            <IconButton
              label={`Back to ${c().label}`}
              icon="chevron-left"
              data-part="view-up"
              class="nc-view-header__up"
              onClick={() => go(c())}
            />
          )}
        </Show>
        <Show
          when={props.back}
          fallback={
            <Show when={present(props.crumbs)}>
              <nav class="nc-view-header__crumbs" aria-label="Breadcrumbs" data-part="breadcrumbs">
                <Show when={folded().length}>
                  <DropdownMenu
                    label="Earlier in the path"
                    matchWidth={false}
                    items={folded().map((c, i) => ({ id: String(i), label: c.label, icon: c.icon }))}
                    onSelect={(id) => go(folded()[Number(id)]!)}
                    trigger={(t) => (
                      <button
                        {...t}
                        type="button"
                        class="nc-view-header__crumb nc-view-header__crumb--link nc-view-header__fold"
                        aria-label="Earlier in the path"
                        title={folded()
                          .map((c) => c.label)
                          .join(" / ")}
                        data-part="crumbs-fold"
                      >
                        …
                      </button>
                    )}
                  />
                </Show>
                <For each={path()}>
                  {(c, i) => (
                    <>
                      <Show when={i() > 0 || folded().length > 0}>
                        <span class="nc-view-header__sep" aria-hidden="true">
                          /
                        </span>
                      </Show>
                      <Show
                        when={(c.href || c.onClick) && i() < path().length - 1}
                        fallback={
                          <span
                            class="nc-view-header__crumb"
                            aria-current={i() === path().length - 1 ? "page" : undefined}
                          >
                            <Show when={c.icon}>
                              <Icon name={c.icon} size="sm" />
                            </Show>
                            <span class="nc-view-header__label" title={c.label}>
                              {c.label}
                            </span>
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
                          <span class="nc-view-header__label" title={c.label}>
                            {c.label}
                          </span>
                        </a>
                      </Show>
                    </>
                  )}
                </For>
              </nav>
            </Show>
          }
        >
          {(b) => (
            <a
              class="nc-view-header__back"
              href={b().href ?? "#"}
              data-part="view-back"
              title={`Back to ${b().label}`}
              onClick={(e) => {
                const run = b().onClick
                if (run) {
                  e.preventDefault()
                  run()
                } else linkClick(e, b().href)
              }}
            >
              <Icon name="chevron-left" size="sm" />
              <span class="nc-view-header__label">{b().label}</span>
            </a>
          )}
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
