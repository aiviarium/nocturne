import type { JSX } from "@solidjs/web"
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Match,
  onCleanup,
  onSettled,
  Show,
  Switch,
  untrack,
} from "solid-js"
import { aria, ariaChecked } from "../lib/aria"
import { cx } from "../lib/cx"
import { activeElement } from "../lib/focus"
import { createId } from "../lib/id"
import { edgeEnabled, nextEnabled, typeahead } from "../lib/keyboard"
import { usePhone } from "../lib/phone"
import type { Placement } from "../lib/position"
import { Icon, type IconName } from "./Icon"
import { Popover } from "./Popover"
import { Sheet } from "./Sheet"

export type MenuEntry =
  | MenuItemEntry
  | MenuSeparatorEntry
  | MenuLabelEntry
  | MenuChoiceEntry
  | MenuCustomEntry

export interface MenuItemEntry {
  type?: "item"
  /** Stable id passed to `onSelect`. */
  id: string
  /** Visible text. Also used for type-ahead. */
  label: string
  /** A core icon. */
  icon?: IconName
  /** Custom leading content instead of an icon, such as the effort bars. */
  leading?: JSX.Element
  /** One line under the label, in text-3. Makes the row taller. */
  description?: string
  /** Shortcut on the right, in mono text-3. Never wraps. */
  shortcut?: string
  /** Destructive item. Put it last. */
  danger?: boolean
  /** Greys the item out and skips it. */
  disabled?: boolean
  /** For radio or checkbox style menus: shows a check mark. */
  checked?: boolean
}

export interface MenuSeparatorEntry {
  type: "separator"
}

export interface MenuLabelEntry {
  type: "label"
  /** Group heading in 11px text-3. */
  label: string
}

export interface MenuChoiceOption {
  value: string
  /** Visible text for a segmented row; the accessible name for swatches. */
  label: string
  /** A core icon before the label (segmented). */
  icon?: IconName
  /** A colour to show as a round swatch instead of text (swatches). */
  swatch?: string
}

/**
 * A row of choices that applies at once and keeps the menu open: a segmented control (dark, light, system) or
 * a row of swatches. It is one stop for Arrow Up and Down; Arrow Left and Right (or Home and End) choose the
 * previous or next option, Enter and Space choose the focused one.
 */
export interface MenuChoiceEntry {
  type: "choice"
  /** Stable id; names the group for assistive technology together with `label`. */
  id: string
  label: string
  variant?: "segmented" | "swatches"
  options: MenuChoiceOption[]
  value: string
  onChange: (value: string) => void
}

/** Content that is not a choice: a header with the signed-in user. It is skipped by the keyboard. */
export interface MenuCustomEntry {
  type: "custom"
  content: JSX.Element
}

export interface MenuProps {
  /** Items, separators and group labels. */
  items: MenuEntry[]
  /** Called with the item id on Enter, Space or click. */
  onSelect?: (id: string) => void
  /** Accessible name. */
  label: string
  /** Items behave as radio choices (`menuitemradio`), using each item's `checked`. */
  radio?: boolean
  /** Focus the menu on mount (keyboard opening) and highlight the first item. Default true. */
  autoFocus?: boolean
  /** Called when Tab is pressed or focus should return to the trigger. */
  onRequestClose?: () => void
  class?: string
  /** Minimum width of the surface. */
  minWidth?: string
}

/**
 * A menu surface with roving focus: Arrow Up/Down (wrapping), Home, End, type-ahead, Enter or Space
 * to choose. Shared by dropdowns, context menus and the command palette.
 */
export function Menu(props: MenuProps): JSX.Element {
  const id = createId("menu")
  type Row = MenuItemEntry | MenuChoiceEntry
  // Read once: rows are found by identity, so the list the rows come from and the one that is rendered must be the
  // same array even when the owner builds a new one on every read (`items={entries(id)}`).
  const entries = createMemo(() => props.items)
  const rows = createMemo(() =>
    entries().filter((e): e is Row => (e.type ?? "item") === "item" || e.type === "choice"),
  )
  // When some items have an icon the others keep its place, so every label starts at the same x.
  const iconSlot = createMemo(() => rows().some((r) => r.type !== "choice" && (r.icon || r.leading)))
  const disabled = () => rows().map((r) => r.type !== "choice" && Boolean((r as MenuItemEntry).disabled))
  const labels = () => rows().map((r) => r.label)
  const [active, setActive] = createSignal(-1)
  const nodes: HTMLElement[] = []
  let root!: HTMLDivElement
  let buffer = ""
  let bufferTimer: ReturnType<typeof setTimeout> | undefined

  const focusIndex = (i: number) => {
    if (i < 0) return
    setActive(i)
    const node = nodes[i]
    // A choice row is focused at its chosen option.
    const target = node?.getAttribute("role") === "group" ? choiceStop(node) : node
    target?.focus()
  }
  const choiceStop = (row: HTMLElement) =>
    row.querySelector<HTMLElement>("[aria-checked=true]") ?? row.querySelector<HTMLElement>("button")
  onSettled(() => {
    if (props.autoFocus !== false) {
      const first = rows().findIndex((r) => r.type !== "choice" && r.checked && !r.disabled)
      focusIndex(first >= 0 ? first : edgeEnabled(disabled(), "first"))
    }
  })
  onCleanup(() => clearTimeout(bufferTimer))
  createEffect(entries, () => {
    setActive((a) => Math.min(a, rows().length - 1))
  })

  const onKeyDown = (event: KeyboardEvent) => {
    const at = active()
    if (event.key === "ArrowDown") {
      event.preventDefault()
      focusIndex(nextEnabled(disabled(), at, 1))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      focusIndex(nextEnabled(disabled(), Math.max(at, 0), -1))
    } else if (event.key === "Home") {
      event.preventDefault()
      focusIndex(edgeEnabled(disabled(), "first"))
    } else if (event.key === "End") {
      event.preventDefault()
      focusIndex(edgeEnabled(disabled(), "last"))
    } else if (event.key === "Tab") {
      props.onRequestClose?.()
    } else if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      event.key !== " "
    ) {
      buffer += event.key
      clearTimeout(bufferTimer)
      bufferTimer = setTimeout(() => (buffer = ""), 600)
      focusIndex(typeahead(labels(), disabled(), at, buffer))
    }
  }

  const select = (item: MenuItemEntry) => {
    if (!item.disabled) props.onSelect?.(item.id)
  }
  return (
    <div
      data-part="menu"
      id={id}
      ref={root}
      role="menu"
      aria-label={props.label}
      class={cx("nc-menu", props.class)}
      style={props.minWidth ? { "min-width": props.minWidth } : undefined}
      onKeyDown={onKeyDown}
    >
      <For each={entries()}>
        {(entry) => (
          <Switch>
            <Match when={entry.type === "separator"}>
              <div class="nc-menu__sep" role="separator" />
            </Match>
            <Match when={entry.type === "custom"}>
              <div class="nc-menu__custom" role="presentation">
                {(entry as MenuCustomEntry).content}
              </div>
            </Match>
            <Match when={entry.type === "choice"}>
              {(() => {
                const choice = entry as MenuChoiceEntry
                const index = rows().indexOf(choice)
                const options = () => choice.options
                const move = (from: number, to: number, el: HTMLElement) => {
                  const next = options()[(to + options().length) % options().length]
                  if (!next) return
                  choice.onChange(next.value)
                  queueMicrotask(() =>
                    el
                      .closest<HTMLElement>("[role=group]")
                      ?.querySelectorAll<HTMLElement>("button")
                      [(to + options().length) % options().length]?.focus(),
                  )
                  setActive(index)
                  void from
                }
                return (
                  <div
                    ref={(el) => {
                      nodes[index] = el
                    }}
                    role="group"
                    aria-label={choice.label}
                    data-part="menu-choice"
                    data-variant={choice.variant ?? "segmented"}
                    class={cx(
                      "nc-menu__choice",
                      choice.variant === "swatches" && "nc-menu__choice--swatches",
                    )}
                  >
                    <For each={options()}>
                      {(option, at) => (
                        <button
                          type="button"
                          role="menuitemradio"
                          aria-checked={aria(choice.value === option.value)}
                          aria-label={option.label}
                          data-value={option.value}
                          tabindex={active() === index && choice.value === option.value ? 0 : -1}
                          class={cx("nc-menu__option", option.swatch && "nc-menu__option--swatch")}
                          style={option.swatch ? { "--nc-swatch": option.swatch } : undefined}
                          onFocus={() => setActive(index)}
                          onClick={() => {
                            choice.onChange(option.value)
                            setActive(index)
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "ArrowRight") move(at(), at() + 1, event.currentTarget)
                            else if (event.key === "ArrowLeft") move(at(), at() - 1, event.currentTarget)
                            else if (event.key === "Home") move(at(), 0, event.currentTarget)
                            else if (event.key === "End")
                              move(at(), options().length - 1, event.currentTarget)
                            else return
                            event.preventDefault()
                            event.stopPropagation()
                          }}
                        >
                          <Show
                            when={option.swatch}
                            fallback={
                              <>
                                <Show when={option.icon}>
                                  <Icon name={option.icon} size="sm" />
                                </Show>
                                <span>{option.label}</span>
                              </>
                            }
                          >
                            <Show when={choice.value === option.value}>
                              <Icon name="check" size="sm" />
                            </Show>
                          </Show>
                        </button>
                      )}
                    </For>
                  </div>
                )
              })()}
            </Match>
            <Match when={entry.type === "label"}>
              <div class="nc-menu__label" role="presentation">
                {(entry as MenuLabelEntry).label}
              </div>
            </Match>
            <Match when={(entry.type ?? "item") === "item"}>
              {(() => {
                const item = entry as MenuItemEntry
                const index = rows().indexOf(item)
                return (
                  <button
                    ref={(el) => {
                      nodes[index] = el
                    }}
                    type="button"
                    role={
                      props.radio
                        ? "menuitemradio"
                        : item.checked !== undefined
                          ? "menuitemcheckbox"
                          : "menuitem"
                    }
                    aria-checked={
                      props.radio || item.checked !== undefined ? ariaChecked(item.checked) : undefined
                    }
                    aria-disabled={item.disabled ? "true" : undefined}
                    tabindex={active() === index ? 0 : -1}
                    data-active={active() === index ? "" : undefined}
                    class={cx(
                      "nc-menu__item",
                      item.danger && "nc-menu__item--danger",
                      item.description && "nc-menu__item--rich",
                    )}
                    onFocus={() => setActive(index)}
                    onPointerMove={() => !item.disabled && active() !== index && focusIndex(index)}
                    onClick={() => select(item)}
                  >
                    <Show when={item.leading}>{item.leading}</Show>
                    <Show when={!item.leading && item.icon}>
                      <Icon name={item.icon} size="sm" />
                    </Show>
                    <Show when={!item.leading && !item.icon && iconSlot()}>
                      <span class="nc-menu__slot" aria-hidden="true" />
                    </Show>
                    <Show when={item.description} fallback={<span class="nc-menu__text">{item.label}</span>}>
                      <span class="nc-menu__text nc-menu__text--stack">
                        <span>{item.label}</span>
                        <span class="nc-menu__desc nc-meta">{item.description}</span>
                      </span>
                    </Show>
                    <Show when={item.checked}>
                      <Icon name="check" size="sm" class="nc-menu__check" />
                    </Show>
                    <Show when={item.shortcut}>
                      <span class="nc-menu__key">{item.shortcut}</span>
                    </Show>
                  </button>
                )
              })()}
            </Match>
          </Switch>
        )}
      </For>
    </div>
  )
}

export interface DropdownMenuProps extends Omit<MenuProps, "autoFocus" | "onRequestClose"> {
  /** Renders the trigger. Spread `triggerProps` onto a real button (`Button`, `IconButton`). */
  trigger: (triggerProps: DropdownTriggerProps) => JSX.Element
  /** Where the menu opens relative to the trigger. Default `bottom-start`. */
  placement?: Placement
  /**
   * Make the menu at least as wide as its trigger. Default true when it opens above or below the trigger, so a
   * menu from a wide trigger (a switcher, a select-like button) reads as attached to it; an icon button's menu
   * is wider than its trigger anyway.
   */
  matchWidth?: boolean
  /** Controlled open state. */
  open?: boolean
  /** Called when the open state wants to change. */
  onOpenChange?: (open: boolean) => void
}

export interface DropdownTriggerProps {
  ref: (el: HTMLElement) => void
  "aria-haspopup": "menu"
  "aria-expanded": "true" | "false"
  "aria-controls": string | undefined
  onClick: () => void
  onKeyDown: (event: KeyboardEvent) => void
}

/** A trigger and its menu. Arrow Down on the trigger opens it; Escape closes it and returns focus. */
export function DropdownMenu(props: DropdownMenuProps): JSX.Element {
  const [innerOpen, setInnerOpen] = createSignal(false)
  const [trigger, setTrigger] = createSignal<HTMLElement>()
  const open = () => props.open ?? innerOpen()
  const menuId = createId("dropdown")
  const setOpen = (next: boolean, refocus = true) => {
    if (props.open === undefined) setInnerOpen(next)
    props.onOpenChange?.(next)
    // Back to the trigger when focus went with the menu, but never out of a dialog the choice opened.
    if (!next && refocus)
      queueMicrotask(() => {
        const at = activeElement()
        if (!at || at === document.body || at.closest("[data-part=menu]")) trigger()?.focus()
      })
  }
  // Getters keep the trigger's ARIA state live without re-creating the trigger element.
  const triggerProps: DropdownTriggerProps = {
    ref: setTrigger,
    "aria-haspopup": "menu",
    get "aria-expanded"() {
      return aria(open())
    },
    get "aria-controls"() {
      return open() ? menuId : undefined
    },
    onClick: () => setOpen(!open()),
    onKeyDown: (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault()
        if (!open()) setOpen(true)
      }
    },
  }
  // On a phone the menu is a sheet from the bottom, with phone rows.
  const phone = usePhone()
  const menu = () => (
    <Menu
      {...props}
      onRequestClose={() => setOpen(false)}
      onSelect={(itemId) => {
        // Close and give focus back first: a dialog the choice opens then remembers the trigger to return to,
        // and keeps the focus it takes.
        setOpen(false, false)
        trigger()?.focus()
        props.onSelect?.(itemId)
      }}
    />
  )
  return (
    <>
      {untrack(() => props.trigger(triggerProps))}
      <Show
        when={phone()}
        fallback={
          <Popover
            open={open()}
            anchor={trigger()}
            placement={props.placement ?? "bottom-start"}
            matchWidth={props.matchWidth ?? /^(bottom|top)/.test(props.placement ?? "bottom-start")}
            onClose={() => setOpen(false)}
            id={menuId}
          >
            {menu()}
          </Popover>
        }
      >
        <Sheet
          open={open()}
          label={props.label}
          title={props.label}
          detents={["fit"]}
          flush
          onClose={() => setOpen(false)}
        >
          <div id={menuId}>{menu()}</div>
        </Sheet>
      </Show>
    </>
  )
}
