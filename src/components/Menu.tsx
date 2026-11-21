// Menus: a list of actions in a popup, drawn from data.
//
// ui-sdk's Menu does the behaviour: roving focus, typeahead, dismissal, focus return, submenus' keys, and a sheet
// from the bottom on a small touch screen. Nocturne draws the entries and gives two ways to open one:
// `DropdownMenu` owns its trigger, and `Menu` opens at an element or a point the caller owns, such as a row's
// right click.
import type { JSX } from "@solidjs/web"
import {
  createMenuController,
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuItemIndicator,
  MenuRadioGroup,
  MenuRadioItem,
  Menu as MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from "@ui-sdk/solid/menu"
import { createEffect, createMemo, For, Match, onCleanup, Show, Switch } from "solid-js"
import { cx } from "../lib/cx"
import { usePhone } from "../lib/phone"
import { type Placement, placementSide } from "../lib/placement"
import { Icon, type IconName } from "./Icon"
import { OpenLayer } from "./Popover"

export type MenuEntry =
  | MenuItemEntry
  | MenuSeparatorEntry
  | MenuLabelEntry
  | MenuChoiceEntry
  | MenuCustomEntry

export interface MenuItemEntry {
  type?: "item"
  /** Passed to `onSelect`. */
  id: string
  /** Text. */
  label: string
  /** A named icon before the label. */
  icon?: IconName
  /** Anything before the label instead of an icon (an avatar, a dot). */
  leading?: JSX.Element
  /** A second line under the label. */
  description?: string
  /** Shortcut shown at the end, as text (`Ctrl K`). */
  shortcut?: string
  /** Red text, for what removes something. */
  danger?: boolean
  /** Shown but not chosen. */
  disabled?: boolean
  /** A check mark: the item is a checkbox, or in a `radio` menu the chosen one. */
  checked?: boolean
}

export interface MenuSeparatorEntry {
  type: "separator"
}

export interface MenuLabelEntry {
  type: "label"
  /** A small heading over the items after it. */
  label: string
}

export interface MenuChoiceOption {
  value: string
  /** Text, or the accessible name of a swatch. */
  label: string
  /** A named icon before the text. */
  icon?: IconName
  /** A colour: the option is drawn as a round swatch. */
  swatch?: string
}

/**
 * One choice among a few, chosen inside the menu without closing it: a segmented row (`Theme: System, Dark,
 * Light`), a row of colour swatches, or `icons`: one menu row with the label at its start and the options as small
 * icon buttons at its end, for a setting that should take no more room than an item.
 */
export interface MenuChoiceEntry {
  type: "choice"
  /** Names the group for a screen reader. */
  id: string
  label: string
  variant?: "segmented" | "swatches" | "icons"
  options: MenuChoiceOption[]
  value: string
  onChange: (value: string) => void
}

/** Anything drawn in the menu that is not an item, such as who is signed in. */
export interface MenuCustomEntry {
  type: "custom"
  content: JSX.Element
}

/** MenuListProps are a menu's entries and what choosing one does. */
export interface MenuListProps {
  /** The entries, in order. */
  items: MenuEntry[]
  /** Called with the chosen item's `id`. */
  onSelect?: (id: string) => void
  /** Names the menu for a screen reader. */
  label: string
  /** The items are one choice: the `checked` one is the chosen one. */
  radio?: boolean
  class?: string
  /** A width the menu keeps at least, such as `240px`. */
  minWidth?: string
}

export interface DropdownMenuProps extends MenuListProps {
  /**
   * Renders the trigger. Spread `triggerProps` onto a real button (`Button`, `IconButton`); they carry its ref,
   * its ARIA state and its handlers.
   */
  trigger: (triggerProps: DropdownTriggerProps) => JSX.Element
  /** Where the menu opens relative to the trigger. Default `bottom-start`. */
  placement?: Placement
  /**
   * Make the menu at least as wide as its trigger. Default true when it opens above or below the trigger, so a
   * menu from a wide trigger (a switcher, a select-like button) reads as attached to it.
   */
  matchWidth?: boolean
  /** Controlled open state. */
  open?: boolean
  /** Called when the open state wants to change. */
  onOpenChange?: (open: boolean) => void
}

/** The props a trigger spreads on its button. */
export type DropdownTriggerProps = Record<string, unknown>

/** A trigger and its menu. Arrow keys on the trigger open it; Escape closes it and returns focus. */
export function DropdownMenu(props: DropdownMenuProps): JSX.Element {
  const presentation = usePresentation()
  const placement = () => props.placement ?? "bottom-start"
  const side = () => placementSide(placement())
  const matchWidth = () => props.matchWidth ?? /^(bottom|top)/.test(placement())
  return (
    <MenuRoot
      open={props.open}
      onOpenChange={(next) => props.onOpenChange?.(next)}
      presentation={presentation()}
      onAction={(value) => props.onSelect?.(value)}
    >
      <MenuTrigger render={(trigger: DropdownTriggerProps) => props.trigger(trigger)} />
      <MenuContent
        side={side().side}
        align={side().align}
        sideOffset={4}
        collisionPadding={8}
        data-part="menu"
        aria-label={props.label}
        class={cx("nc-menu", props.class)}
        style={menuWidth(props.minWidth, matchWidth())}
      >
        <OpenLayer />
        <MenuEntries items={props.items} radio={props.radio} onSelect={props.onSelect} />
      </MenuContent>
    </MenuRoot>
  )
}

export interface MenuProps extends MenuListProps {
  /** Whether the menu is open. */
  open: boolean
  /** Where it opens: an element, or a point such as a right click's. */
  anchor: HTMLElement | { x: number; y: number } | undefined
  /** Called when it closes: Escape, a press outside, a choice. */
  onClose: () => void
  /** Default `bottom-start`. */
  placement?: Placement
  /** Gap to the anchor in px. Default 4; 0 for a point. */
  offset?: number
  /** Renders the menu inside this element instead of where it sits, such as the themed root of a row. */
  container?: Element
}

/**
 * A menu opened at an element or a point the caller owns: a row's context menu, a toolbar button that already has
 * a job. The caller keeps `open` and sets it false in `onClose`.
 */
export function Menu(props: MenuProps): JSX.Element {
  const side = () => placementSide(props.placement ?? "bottom-start")
  const point = () => props.anchor !== undefined && !(props.anchor instanceof Element)
  const presentation = usePresentation()
  // Opened through its controller, not rendered open: a menu that opens takes focus to its first item, as one
  // opened from the keyboard must.
  const menu = createMenuController()
  createEffect(
    () => [props.open, props.anchor] as const,
    ([open, anchor]) => {
      if (open) void menu.open({ anchor: anchorOf(anchor) ?? undefined })
      else menu.close()
    },
  )
  onCleanup(() => menu.close())
  return (
    <MenuRoot
      controller={menu}
      presentation={presentation()}
      container={props.container ?? null}
      onOpenChange={(next, details) => {
        if (next) return
        // A press on the element it opened from is that element's to handle.
        const anchor = props.anchor
        const target = details.event?.target
        if (
          details.reason === "outside-press" &&
          anchor instanceof Element &&
          target instanceof Node &&
          anchor.contains(target)
        ) {
          details.cancel()
          return
        }
        props.onClose()
      }}
      onAction={(value) => props.onSelect?.(value)}
    >
      <MenuContent
        side={side().side}
        align={side().align}
        sideOffset={props.offset ?? (point() ? 0 : 4)}
        collisionPadding={8}
        data-part="menu"
        aria-label={props.label}
        class={cx("nc-menu", props.class)}
        style={menuWidth(props.minWidth, false)}
      >
        <OpenLayer />
        <MenuEntries items={props.items} radio={props.radio} onSelect={props.onSelect} />
      </MenuContent>
    </MenuRoot>
  )
}

/** A popup's presentation: a sheet in Nocturne's phone layout, and ui-sdk's own choice elsewhere. */
export function usePresentation(): () => "sheet" | "auto" {
  const phone = usePhone()
  return () => (phone() ? "sheet" : "auto")
}

function anchorOf(anchor: MenuProps["anchor"]) {
  if (anchor === undefined) return null
  if (anchor instanceof Element) return anchor
  const { x, y } = anchor
  return { getBoundingClientRect: () => new DOMRect(x, y, 0, 0) }
}

function menuWidth(minWidth: string | undefined, matchWidth: boolean): JSX.CSSProperties | undefined {
  if (minWidth !== undefined) return { "min-width": minWidth }
  if (matchWidth) return { "min-width": "var(--anchor-width)" }
  return undefined
}

/** MenuEntries draws a menu's entries as ui-sdk's parts, for a menu content of any kind. */
export function MenuEntries(props: {
  items: MenuEntry[]
  radio?: boolean
  onSelect?: (id: string) => void
}): JSX.Element {
  // When some items have an icon the others keep its place, so every label starts at the same x.
  const iconSlot = createMemo(() =>
    props.items.some(
      (entry) =>
        (entry.type ?? "item") === "item" &&
        ((entry as MenuItemEntry).icon || (entry as MenuItemEntry).leading),
    ),
  )
  // A label heads the entries up to the next label or separator: ui-sdk names a group by its label. In a radio
  // menu each such group is one choice, whose value is its checked item.
  const sections = createMemo(() => {
    const out: Array<{ label?: string; entries: MenuEntry[] } | MenuSeparatorEntry> = []
    let current: { label?: string; entries: MenuEntry[] } | undefined
    for (const entry of props.items) {
      if (entry.type === "separator") {
        current = undefined
        out.push(entry)
      } else if (entry.type === "label") {
        current = { label: entry.label, entries: [] }
        out.push(current)
      } else {
        if (current === undefined) {
          current = { entries: [] }
          out.push(current)
        }
        current.entries.push(entry)
      }
    }
    return out
  })

  const entry = (one: MenuEntry) => (
    <Switch>
      <Match when={one.type === "custom"}>
        <div class="nc-menu__custom" role="presentation">
          {(one as MenuCustomEntry).content}
        </div>
      </Match>
      <Match when={one.type === "choice"}>
        <Choice entry={one as MenuChoiceEntry} />
      </Match>
      <Match when={(one.type ?? "item") === "item"}>
        <Item
          item={one as MenuItemEntry}
          radio={props.radio}
          iconSlot={iconSlot()}
          onSelect={props.onSelect}
        />
      </Match>
    </Switch>
  )

  return (
    <For each={sections()}>
      {(section) => (
        <Switch>
          <Match when={"type" in section}>
            <MenuSeparator class="nc-menu__sep" />
          </Match>
          <Match when={props.radio}>
            {(() => {
              const group = section as { label?: string; entries: MenuEntry[] }
              const checked = () =>
                group.entries.find(
                  (e): e is MenuItemEntry =>
                    (e.type ?? "item") === "item" && Boolean((e as MenuItemEntry).checked),
                )?.id ?? null
              return (
                <MenuRadioGroup value={checked()} onValueChange={(value) => props.onSelect?.(value)}>
                  <Show when={group.label}>
                    <MenuGroupLabel class="nc-menu__label">{group.label}</MenuGroupLabel>
                  </Show>
                  <For each={group.entries}>{entry}</For>
                </MenuRadioGroup>
              )
            })()}
          </Match>
          <Match when={(section as { label?: string }).label !== undefined}>
            <MenuGroup>
              <MenuGroupLabel class="nc-menu__label">{(section as { label: string }).label}</MenuGroupLabel>
              <For each={(section as { entries: MenuEntry[] }).entries}>{entry}</For>
            </MenuGroup>
          </Match>
          <Match when>
            <For each={(section as { entries: MenuEntry[] }).entries}>{entry}</For>
          </Match>
        </Switch>
      )}
    </For>
  )
}

function ItemBody(props: { item: MenuItemEntry; iconSlot: boolean; indicator: boolean }): JSX.Element {
  return (
    <>
      <Show when={props.item.leading}>{props.item.leading}</Show>
      <Show when={!props.item.leading && props.item.icon}>
        <Icon name={props.item.icon} size="sm" />
      </Show>
      <Show when={!props.item.leading && !props.item.icon && props.iconSlot}>
        <span class="nc-menu__slot" aria-hidden="true" />
      </Show>
      <Show when={props.item.description} fallback={<span class="nc-menu__text">{props.item.label}</span>}>
        <span class="nc-menu__text nc-menu__text--stack">
          <span>{props.item.label}</span>
          <span class="nc-menu__desc nc-meta">{props.item.description}</span>
        </span>
      </Show>
      <Show when={props.indicator}>
        <MenuItemIndicator class="nc-menu__check">
          <Icon name="check" size="sm" />
        </MenuItemIndicator>
      </Show>
      <Show when={props.item.shortcut}>
        <span class="nc-menu__key">{props.item.shortcut}</span>
      </Show>
    </>
  )
}

function Item(props: {
  item: MenuItemEntry
  radio?: boolean
  iconSlot: boolean
  onSelect?: (id: string) => void
}): JSX.Element {
  const className = () =>
    cx(
      "nc-menu__item",
      props.item.danger && "nc-menu__item--danger",
      props.item.description && "nc-menu__item--rich",
    )
  return (
    <Switch
      fallback={
        <MenuItem
          value={props.item.id}
          label={props.item.label}
          disabled={props.item.disabled}
          destructive={props.item.danger}
          class={className()}
          data-value={props.item.id}
        >
          <ItemBody item={props.item} iconSlot={props.iconSlot} indicator={false} />
        </MenuItem>
      }
    >
      <Match when={props.radio}>
        <MenuRadioItem
          value={props.item.id}
          label={props.item.label}
          disabled={props.item.disabled}
          class={className()}
          data-value={props.item.id}
        >
          <ItemBody item={props.item} iconSlot={props.iconSlot} indicator />
        </MenuRadioItem>
      </Match>
      <Match when={props.item.checked !== undefined}>
        <MenuCheckboxItem
          value={props.item.id}
          label={props.item.label}
          disabled={props.item.disabled}
          checked={props.item.checked}
          onCheckedChange={() => props.onSelect?.(props.item.id)}
          class={className()}
          data-value={props.item.id}
        >
          <ItemBody item={props.item} iconSlot={props.iconSlot} indicator />
        </MenuCheckboxItem>
      </Match>
    </Switch>
  )
}

/** A choice inside the menu: radio items in a row, chosen without closing it. */
function Choice(props: { entry: MenuChoiceEntry }): JSX.Element {
  const icons = () => props.entry.variant === "icons"
  const group = () => (
    <MenuRadioGroup
      name={props.entry.id}
      value={props.entry.value}
      onValueChange={(value) => props.entry.onChange(value)}
      aria-label={props.entry.label}
      data-part="menu-choice"
      data-variant={props.entry.variant ?? "segmented"}
      class={cx(
        "nc-menu__choice",
        props.entry.variant === "swatches" && "nc-menu__choice--swatches",
        icons() && "nc-menu__choice--icons",
      )}
    >
      <For each={props.entry.options}>
        {(option) => (
          <MenuRadioItem
            value={option.value}
            label={option.label}
            closeOnSelect={false}
            aria-label={option.label}
            data-value={option.value}
            title={icons() ? option.label : undefined}
            class={cx("nc-menu__option", option.swatch && "nc-menu__option--swatch")}
            style={option.swatch ? { "--nc-swatch": option.swatch } : undefined}
          >
            <Show
              when={option.swatch}
              fallback={
                <>
                  <Show when={option.icon}>
                    <Icon name={option.icon} size="sm" />
                  </Show>
                  <Show when={!icons() || !option.icon}>
                    <span>{option.label}</span>
                  </Show>
                </>
              }
            >
              <MenuItemIndicator>
                <Icon name="check" size="sm" />
              </MenuItemIndicator>
            </Show>
          </MenuRadioItem>
        )}
      </For>
    </MenuRadioGroup>
  )
  return (
    <Show when={icons()} fallback={group()}>
      <div class="nc-menu__choice-row" data-part="menu-choice-row">
        <span class="nc-menu__choice-label" aria-hidden="true">
          {props.entry.label}
        </span>
        {group()}
      </div>
    </Show>
  )
}
