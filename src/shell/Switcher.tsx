// The switcher every path segment and every drill or record crumb opens: a filter field, sections, marks, the
// current entry checked. One part at one size, so "Switch project…" and "Switch issue…" read the same.
import type { JSX } from "@solidjs/web"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
} from "@ui-sdk/solid/command"
import { createSignal, For, Show } from "solid-js"
import { Icon, type IconName } from "../components/Icon"
import { Kbd } from "../components/Kbd"
import { Mark } from "../components/Mark"
import { Popover } from "../components/Popover"
import { cx } from "../lib/cx"
import type { Placement } from "../lib/placement"
import type { ShellMark } from "./types"

export interface SwitcherEntry {
  /** Unique across all sections: it is what the list highlights and `onPick` reports. */
  id: string
  label: string
  /** Quiet text after the label, which the filter also matches: a record's title beside its key. */
  hint?: string
  mark?: ShellMark
  icon?: IconName
  /** Anything before the label in place of a mark or icon, such as a record's state glyph. */
  leading?: JSX.Element
  /** A count at the end, in tabular figures. */
  count?: number
  /** Keys that go there directly, shown as key caps unless the entry is current: `G I`. */
  shortcut?: string
  /** The entry the person is on: checked, and listed in `--text-1`. */
  current?: boolean
  /** More words the filter matches. */
  keywords?: string[]
  disabled?: boolean
}

export interface SwitcherSection {
  title: string
  entries: SwitcherEntry[]
}

/** The mark, icon or leading content of an entry, in the 18px lead column the shell's lists share. */
export function EntryLead(props: { mark?: ShellMark; icon?: IconName; leading?: JSX.Element }): JSX.Element {
  return (
    <Show
      when={props.leading}
      fallback={
        <Show
          when={props.mark}
          fallback={<Show when={props.icon}>{(i) => <Icon name={i()} size="sm" />}</Show>}
        >
          {(m) => <Mark name={m().name} hue={m().hue} icon={m().icon} size="sm" decorative />}
        </Show>
      }
    >
      {props.leading}
    </Show>
  )
}

export interface SwitcherListProps {
  /** What is switched, for the field: "issue" reads "Switch issue…". */
  noun: string
  sections: SwitcherSection[]
  onPick: (entry: SwitcherEntry) => void
  /** 380px instead of 280px, for records with long titles. */
  wide?: boolean
  class?: string
}

/**
 * The switcher's body: a filter field over sections of entries, on ui-sdk's Command. Typing narrows the list
 * (label, hint and keywords), ↑/↓ move, Enter picks. For a list in a surface of its own; `Switcher` puts it in a
 * popover under a trigger.
 */
export function SwitcherList(props: SwitcherListProps): JSX.Element {
  const byId = (id: string) => {
    for (const s of props.sections) for (const e of s.entries) if (e.id === id) return e
    return undefined
  }
  return (
    <Command
      data-part="switcher-list"
      data-wide={props.wide ? "" : undefined}
      class={cx("nc-switcher", props.class)}
      filter="contains"
      loop
      onAction={(value: string) => {
        const entry = byId(value)
        if (entry) props.onPick(entry)
      }}
    >
      <div class="nc-switcher__search">
        <Icon name="search" size="sm" />
        <CommandInput
          class="nc-switcher__input"
          aria-label={`Switch ${props.noun}`}
          placeholder={`Switch ${props.noun}…`}
          spellcheck={false}
          autocomplete="off"
        />
      </div>
      <CommandEmpty class="nc-switcher__empty">No matches</CommandEmpty>
      <CommandList class="nc-switcher__body">
        <For each={props.sections}>
          {(section) => (
            <CommandGroup class="nc-switcher__section">
              <CommandGroupLabel class="nc-switcher__title">{section.title}</CommandGroupLabel>
              <For each={section.entries}>
                {(entry) => (
                  <CommandItem
                    value={entry.id}
                    label={entry.label}
                    keywords={[...(entry.hint ? [entry.hint] : []), ...(entry.keywords ?? [])]}
                    disabled={entry.disabled}
                    class="nc-switcher__item"
                    data-current={entry.current ? "" : undefined}
                  >
                    <span class="nc-switcher__lead">
                      <EntryLead
                        mark={entry.mark}
                        icon={entry.icon ?? "arrow-right"}
                        leading={entry.leading}
                      />
                    </span>
                    <span class="nc-switcher__label">{entry.label}</span>
                    <Show when={entry.hint}>
                      <span class="nc-switcher__hint">{entry.hint}</span>
                    </Show>
                    <span class="nc-switcher__end">
                      <Show when={entry.count}>
                        <span class="nc-switcher__count">{entry.count}</span>
                      </Show>
                      <Show when={entry.shortcut && !entry.current}>
                        <span class="nc-switcher__keys">
                          <For each={entry.shortcut!.split(" ")}>{(k) => <Kbd keys={k} />}</For>
                        </span>
                      </Show>
                      <Show when={entry.current}>
                        <Icon name="check" size="sm" class="nc-switcher__check" />
                      </Show>
                    </span>
                  </CommandItem>
                )}
              </For>
            </CommandGroup>
          )}
        </For>
      </CommandList>
    </Command>
  )
}

/** What a custom trigger spreads on its button: the ref the popover anchors to, the toggle and the ARIA state. */
export interface SwitcherTriggerProps {
  ref: (el: HTMLElement) => void
  onClick: () => void
  "aria-haspopup": "dialog"
  "aria-expanded": "true" | "false"
  "data-part": "switcher"
  "data-open": "" | undefined
}

export interface SwitcherProps extends Omit<SwitcherListProps, "class"> {
  /** The trigger's text: the current entry's name. The default trigger draws it with a chevron after it. */
  label?: JSX.Element
  /** Draws the trigger instead of the default one: spread the props on a button. */
  trigger?: (props: SwitcherTriggerProps) => JSX.Element
  /** The trigger's accessible name. Default "{label}, switch {noun}" when the label is text. */
  "aria-label"?: string
  /** Controlled open state. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Default `bottom-start`. */
  placement?: Placement
  /** Gap to the trigger in px. Default 6. */
  offset?: number
  class?: string
}

/**
 * A trigger ("WEB-142 ⌄") and the filter-format switcher it opens: the field is focused on open, typing narrows,
 * ↑/↓ and Enter pick, Esc clears the field and then closes. Picking closes it and calls `onPick`.
 */
export function Switcher(props: SwitcherProps): JSX.Element {
  const [inner, setInner] = createSignal(false)
  const [anchor, setAnchor] = createSignal<HTMLElement>()
  const open = () => props.open ?? inner()
  const setOpen = (next: boolean) => {
    setInner(next)
    props.onOpenChange?.(next)
  }
  const trigger: SwitcherTriggerProps = {
    ref: (el) => {
      setAnchor(el)
    },
    onClick: () => setOpen(!open()),
    "aria-haspopup": "dialog",
    "data-part": "switcher",
    get "aria-expanded"() {
      return open() ? "true" : "false"
    },
    get "data-open"() {
      return open() ? "" : undefined
    },
  } as SwitcherTriggerProps
  const name = () =>
    props["aria-label"] ??
    (typeof props.label === "string" ? `${props.label}, switch ${props.noun}` : `Switch ${props.noun}`)
  return (
    <>
      <Show
        when={props.trigger}
        fallback={
          <button
            type="button"
            class={cx("nc-switcher-trigger", props.class)}
            aria-label={name()}
            {...trigger}
          >
            <span class="nc-switcher-trigger__label">{props.label}</span>
            <Icon name="chevron-down" size="sm" />
          </button>
        }
      >
        {(render) => <>{render()(trigger)}</>}
      </Show>
      <Popover
        open={open()}
        anchor={anchor()}
        onClose={() => setOpen(false)}
        placement={props.placement ?? "bottom-start"}
        offset={props.offset ?? 6}
        initialFocus="auto"
        class="nc-switcher-popup"
      >
        <Show when={open()}>
          <SwitcherList
            noun={props.noun}
            sections={props.sections}
            wide={props.wide}
            onPick={(entry) => {
              setOpen(false)
              props.onPick(entry)
            }}
          />
        </Show>
      </Popover>
    </>
  )
}
