import type { JSX } from "@solidjs/web"
import { Portal } from "@solidjs/web"
import { createContext, createEffect, For, onCleanup, Show, useContext } from "solid-js"
import { aria } from "../lib/aria"
import { cx } from "../lib/cx"
import { usePhone } from "../lib/phone"
import { Trail, type TrailCrumb } from "../shell/Trail"
import { Button } from "./Button"
import { Icon, type IconName } from "./Icon"
import { IconButton } from "./IconButton"
import { DropdownMenu, type MenuEntry, type MenuItemEntry } from "./Menu"
import { type BarAction, useScreen } from "./NavigationBar"

// The standard header of a view, 44px: its title, or its trail when it drilled inside itself ("Issues / WEB-142",
// the last crumb may be a record switcher), then a record stepper and the view's actions in one order everywhere:
// icon actions, the pin, the overflow menu, then the primary action. The title and the same label as a crumb share
// one size and baseline, so nothing moves when the view drills. No leading back chevron: the trail's first crumb is
// the way up, and Escape goes up too.
//
// The pin is the frame's: the app provides `ViewChrome`, so a view's "favourite" and the app's pin to the
// sidebar are one star, shown once, here.

export interface ViewAction {
  id: string
  label: string
  icon?: IconName
  /** Runs the action. Left out for an action that opens a `menu`. */
  onClick?: () => void
  /**
   * A menu the action opens, hung from its button: Add widget listing the widgets that are not there yet. On a
   * phone its items go into the bar's menu under the action's label.
   */
  menu?: MenuEntry[]
  /** Called with the id of the item chosen from `menu`. */
  onSelect?: (id: string) => void
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

/** What the app tells a view's header, and hears from it: the pin of what the view shows, and the view's title. */
export interface ViewChromeValue {
  pinnable: () => boolean
  pinned: () => boolean
  togglePin: () => void
  /**
   * The header names the view here: its title or its trail's last crumb, and undefined once it goes. The app shows
   * it where the view is named, such as the window's title.
   */
  setTitle?: (title: string | undefined) => void
}

// `null` is "no view chrome above": in Solid 2 a default-less context throws instead of reading as undefined.
export const ViewChrome = createContext<ViewChromeValue | null>(null)

/**
 * A place in the bar above a view, such as its tab's strip in a `Dock`. A header with only actions to show (no
 * title, trail, stepper, context or middle content) draws them there, so the view has one bar.
 */
export interface ViewHeaderSlotValue {
  mount: () => HTMLElement
}

export const ViewHeaderSlot = createContext<ViewHeaderSlotValue | null>(null)

/** Steps through the records of the list a record view came from: ↑ and ↓ with "N / M" at the header's right. */
export interface ViewStepper {
  /** The record's place in the list, from 0. */
  index: number
  total: number
  prev: () => void
  next: () => void
  /** What a record is, for the buttons' names: "issue". Default "item". */
  noun?: string
}

export interface ViewHeaderProps {
  /** The view's name, at the drill size. */
  title?: string
  /**
   * Where the view stands below its place, in place of the title: "Issues / WEB-142". Every crumb but the last
   * goes up; the last is the view, and may be a `switcher` over the list it came from.
   */
  trail?: TrailCrumb[]
  /** ↑/↓ and "N / M" at the right, before the actions. */
  stepper?: ViewStepper
  /** Short context after the title: a state that is out of the ordinary, a chip. */
  context?: JSX.Element
  /** Free content in the middle: a search field, view switches. */
  children?: JSX.Element
  actions?: ViewAction[]
  /** Leave out the app's pin (for views whose content is not worth pinning). */
  noPin?: boolean
  class?: string
}

/** The plain items of a menu, for the phone's bar menu. */
const menuItems = (entries: MenuEntry[]) =>
  entries.filter((e): e is MenuItemEntry => e.type === undefined || e.type === "item")

const present = (x: unknown) =>
  x !== undefined && x !== null && x !== false && !(Array.isArray(x) && !x.length)

/** The name the header gives its view: the title, or the trail's last crumb. */
const nameOf = (props: ViewHeaderProps) => props.title ?? props.trail?.at(-1)?.label

/**
 * On a phone the header is the screen's navigation bar: its actions become the bar's (two at most, the rest and
 * the pin in its menu), its context the line under the title, and what it holds in the middle a row at the top
 * of the content. The trail is not shown: the stack is the way back, and the back control names the screen
 * before. The title stays the view's own (`view.setTitle`), or the header's name when the view sets none.
 */
function PhoneViewHeader(props: ViewHeaderProps): JSX.Element {
  const screen = useScreen()!
  const chrome = useContext(ViewChrome)
  const actions = (): BarAction[] => {
    const out: BarAction[] = (props.actions ?? []).flatMap((a): BarAction[] =>
      a.menu
        ? menuItems(a.menu).map((m) => ({
            id: `${a.id}:${m.id}`,
            label: m.label,
            icon: m.icon,
            onClick: () => a.onSelect?.(m.id),
            overflow: true,
            checked: m.checked,
            section: a.label,
            disabled: a.disabled || m.disabled,
            danger: m.danger,
          }))
        : [
            {
              id: a.id,
              label: a.label,
              icon: a.icon,
              onClick: () => a.onClick?.(),
              primary: a.primary,
              overflow: a.overflow,
              checked: a.checked,
              section: a.section,
              pressed: a.pressed,
              disabled: a.disabled,
              danger: a.danger,
              count: a.count,
            },
          ],
    )
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
    const last = nameOf(props)
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
  const chrome = useContext(ViewChrome)
  if (chrome?.setTitle) {
    const setTitle = chrome.setTitle
    createEffect(
      () => nameOf(props),
      (title) => {
        setTitle(title)
      },
    )
    onCleanup(() => setTitle(undefined))
  }
  if (useScreen()) return <PhoneViewHeader {...props} />
  const slot = useContext(ViewHeaderSlot)
  if (slot !== null) {
    const slotted = () =>
      !props.title &&
      !present(props.trail) &&
      !props.stepper &&
      !present(props.context) &&
      !present(props.children)
    return (
      <Show when={slotted()} fallback={<DesktopViewHeader {...props} />}>
        <Portal mount={slot.mount()} ref={(el: HTMLDivElement) => el.classList.add("nc-view-header-slot")}>
          <DesktopViewHeader {...props} class={cx("nc-view-header--slot", props.class)} />
        </Portal>
      </Show>
    )
  }
  return <DesktopViewHeader {...props} />
}

function DesktopViewHeader(props: ViewHeaderProps): JSX.Element {
  const chrome = useContext(ViewChrome)
  // A phone-sized window without a navigation stack (the shell's view): the trail's parent crumb is the back
  // control and the stepper goes, as on a phone screen.
  const phone = usePhone()
  const actions = () => props.actions ?? []
  const icons = () => actions().filter((a) => !a.primary && !a.overflow)
  const overflow = () => actions().filter((a) => a.overflow)
  const primary = () => actions().filter((a) => a.primary && !a.overflow)
  const content = () =>
    Boolean(props.title) ||
    present(props.trail) ||
    Boolean(props.stepper) ||
    present(props.context) ||
    present(props.children) ||
    actions().length > 0
  // The pin alone is not something to say: without other content the header stays away, and the tab's menu pins.
  const pin = () => content() && !props.noPin && chrome?.pinnable()
  const menu = (): MenuEntry[] =>
    overflow().flatMap((a): MenuEntry[] =>
      a.menu
        ? [
            { type: "label", label: a.label },
            ...menuItems(a.menu).map((m) => ({
              ...m,
              id: `${a.id}:${m.id}`,
              disabled: a.disabled || m.disabled,
            })),
          ]
        : [
            {
              id: a.id,
              label: a.label,
              icon: a.icon,
              disabled: a.disabled,
              danger: a.danger,
              shortcut: a.shortcut,
            },
          ],
    )
  const pick = (id: string) => {
    const a = overflow().find((x) => x.id === id || (x.menu && id.startsWith(`${x.id}:`)))
    if (!a) return
    if (a.menu) a.onSelect?.(id.slice(a.id.length + 1))
    else a.onClick?.()
  }
  const noun = () => props.stepper?.noun ?? "item"
  return (
    <Show when={content()}>
      <header class={cx("nc-view-header", props.class)} data-part="view-header">
        <Show
          when={present(props.trail)}
          fallback={
            <Show when={props.title}>
              <h1 class="nc-view-header__title" data-part="view-title">
                {props.title}
              </h1>
            </Show>
          }
        >
          <Show
            when={phone()}
            fallback={
              <Trail
                crumbs={props.trail ?? []}
                label="Where this view is"
                upShortcut="Esc"
                class="nc-view-header__trail"
              />
            }
          >
            <Show when={props.trail?.at(-2)}>
              {(parent) => (
                <button
                  type="button"
                  class="nc-view-header__back"
                  data-part="view-back"
                  aria-label={`Back to ${parent().label}`}
                  onClick={() => parent().onClick?.()}
                >
                  <Icon name="chevron-left" size="sm" />
                  <span class="nc-view-header__back-label">{parent().label}</span>
                </button>
              )}
            </Show>
            <h1 class="nc-view-header__title" data-part="view-title">
              {props.trail?.at(-1)?.label}
            </h1>
          </Show>
        </Show>
        <Show when={props.context}>
          <span class="nc-view-header__context">{props.context}</span>
        </Show>
        <span class="nc-view-header__middle">{props.children}</span>
        <span class="nc-view-header__actions" data-part="view-actions">
          <Show when={!phone() && props.stepper}>
            {(st) => (
              <span class="nc-view-header__stepper" data-part="view-stepper">
                <span class="nc-view-header__step-count" data-part="view-step-count">
                  {st().index + 1} / {st().total}
                </span>
                <IconButton
                  icon="chevron-up"
                  label={`Previous ${noun()}`}
                  shortcut="K"
                  disabled={st().index <= 0}
                  data-part="view-step-prev"
                  onClick={() => st().prev()}
                />
                <IconButton
                  icon="chevron-down"
                  label={`Next ${noun()}`}
                  shortcut="J"
                  disabled={st().index >= st().total - 1}
                  data-part="view-step-next"
                  onClick={() => st().next()}
                />
                <Show when={actions().length > 0 || pin()}>
                  <span class="nc-view-header__rule" aria-hidden="true" />
                </Show>
              </span>
            )}
          </Show>
          <For each={icons()} keyed={(a) => a.id}>
            {(a) => (
              <Show
                when={a().menu}
                fallback={
                  <Show
                    when={!a().count || !a().icon}
                    fallback={
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={a().icon}
                        aria-label={a().label}
                        aria-pressed={aria(a().pressed)}
                        title={a().label}
                        disabled={a().disabled}
                        data-action={a().id}
                        class="nc-view-header__count"
                        onClick={() => a().onClick?.()}
                      >
                        {a().count}
                      </Button>
                    }
                  >
                    <Show
                      when={a().icon}
                      fallback={
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={a().disabled}
                          data-action={a().id}
                          onClick={() => a().onClick?.()}
                        >
                          {a().label}
                        </Button>
                      }
                    >
                      <IconButton
                        label={a().label}
                        icon={a().icon}
                        pressed={a().pressed}
                        disabled={a().disabled}
                        shortcut={a().shortcut}
                        data-action={a().id}
                        onClick={() => a().onClick?.()}
                      />
                    </Show>
                  </Show>
                }
              >
                {(entries) => (
                  <DropdownMenu
                    label={a().label}
                    items={entries()}
                    placement="bottom-end"
                    matchWidth={false}
                    onSelect={(id) => a().onSelect?.(id)}
                    trigger={(t) => (
                      <Show
                        when={a().icon}
                        fallback={
                          <Button
                            {...t}
                            size="sm"
                            variant="ghost"
                            disabled={a().disabled}
                            data-action={a().id}
                          >
                            {a().label}
                            <Icon name="chevron-down" size="sm" />
                          </Button>
                        }
                      >
                        <IconButton
                          {...t}
                          label={a().label}
                          icon={a().icon}
                          disabled={a().disabled}
                          shortcut={a().shortcut}
                          data-action={a().id}
                        />
                      </Show>
                    )}
                  />
                )}
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
          <For each={primary()} keyed={(a) => a.id}>
            {(a) => (
              <Button
                size="sm"
                variant="primary"
                icon={a().icon}
                disabled={a().disabled}
                data-action={a().id}
                onClick={() => a().onClick?.()}
              >
                {a().label}
              </Button>
            )}
          </For>
          {/* More actions is always the last control in the header. */}
          <Show when={overflow().length}>
            <DropdownMenu
              label="More actions"
              items={menu()}
              placement="bottom-end"
              onSelect={pick}
              trigger={(t) => (
                <IconButton {...t} label="More actions" icon="more" data-part="view-overflow" />
              )}
            />
          </Show>
        </span>
      </header>
    </Show>
  )
}
