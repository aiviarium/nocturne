// The command palette, opened from the scope box (⌘K, or its magnifier) and laid over it: the box widens into a 32px
// field that starts with the scope's chips (and the lens that is on), and the results drop from it. Typing searches;
// `:` lists the scope's lenses, `>` its actions. ↑/↓ move, Enter runs, Esc clears the field and then closes, and
// Backspace in an empty field drops the last chip, widening the search. On ui-sdk's Command inside its Dialog.
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
import { DialogBackdrop, DialogContent, Dialog as DialogRoot } from "@ui-sdk/solid/dialog"
import { createMemo, createSignal, For, onCleanup, Show, untrack } from "solid-js"
import { Icon, type IconName } from "../components/Icon"
import { Kbd } from "../components/Kbd"
import { OpenLayer } from "../components/Popover"
import { cx } from "../lib/cx"
import { EntryLead } from "./Switcher"
import type { LensHue, ShellMark } from "./types"

export interface PaletteCommand {
  /** Unique across the palette's sections. */
  id: string
  label: string
  /** Quiet text after the label: where a result lives ("Build"), a record's title. Matched last. */
  hint?: string
  icon?: IconName
  mark?: ShellMark
  /** A lens's hue, for its icon. */
  hue?: LensHue
  /** Keys shown at the end, space-separated caps: "⌘ 1", "G I". */
  shortcut?: string
  /** More words the search matches. */
  keywords?: string[]
  run: () => void
}

export interface PaletteSection {
  title: string
  commands: PaletteCommand[]
}

/** A chip at the field's start: a scope the search is narrowed to, or the lens that is on. */
export interface PaletteChip {
  id: string
  label: string
  mark?: ShellMark
  icon?: IconName
  /** Set on the lens's chip: its icon takes the hue, and no "/" goes before it. */
  hue?: LensHue
}

/** What the palette asks the app for while the person types. */
export interface PaletteQuery {
  /** The search text, trimmed. Empty: what to show before typing. */
  text: string
  /** The chips left: the deepest scope is the last one that is not a lens. */
  chips: PaletteChip[]
}

export interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  /** The box the palette opens over: it widens from the box's centre. */
  anchor?: HTMLElement
  /** The chips the field starts with, from the workspace down, then the lens. Read each time it opens. */
  chips?: PaletteChip[]
  /** The results for a search, section by section. The palette ranks and trims each section. */
  search: (query: PaletteQuery) => PaletteSection[]
  /** What `:` lists: the scope's lenses. */
  lenses?: PaletteCommand[]
  /** What `>` lists: the scope's and the workspace's actions. */
  actions?: PaletteSection[]
  /** The search's name with no chips left: "Acme", read "Search Acme…". */
  workspace?: string
  /** Most results per section. Default 6 before typing, 8 while typing. */
  limit?: number
  /** The field's width at most. Default 560. */
  width?: number
  class?: string
}

/** How well a command matches: the label's start, a word's start, anywhere in the label, then its hint or keywords. */
export function paletteScore(query: string, c: Pick<PaletteCommand, "label" | "hint" | "keywords">): number {
  const q = query.trim().toLowerCase()
  if (!q) return 1
  const label = c.label.toLowerCase()
  if (label.startsWith(q)) return 4
  if (label.includes(` ${q}`)) return 3
  if (label.includes(q)) return 2
  const hay = `${label} ${c.hint ?? ""} ${(c.keywords ?? []).join(" ")}`.toLowerCase()
  return q.split(/\s+/).every((w) => hay.includes(w)) ? 1 : 0
}

const rank = (q: string, sections: PaletteSection[], limit: number): PaletteSection[] =>
  sections
    .map((s) => ({
      title: s.title,
      commands: s.commands
        .map((c, i) => ({ c, i, score: paletteScore(q, c) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score || a.i - b.i)
        .map((x) => x.c)
        .slice(0, limit),
    }))
    .filter((s) => s.commands.length)

/** Margin the field keeps from the window's edges. */
const EDGE = 16
/** The palette's field is 4px taller than the box it opens over. */
const GROW = 4

/** The palette over the scope box: scope chips, sections, `:` for lenses and `>` for actions. */
export function CommandPalette(props: CommandPaletteProps): JSX.Element {
  return (
    <DialogRoot
      open={props.open}
      closeOnOutsidePress
      onOpenChange={(next: boolean) => {
        if (!next) props.onClose()
      }}
    >
      <Show when={props.open}>
        <PaletteSurface {...props} />
      </Show>
    </DialogRoot>
  )
}

function PaletteSurface(props: CommandPaletteProps): JSX.Element {
  const [chips, setChips] = createSignal<PaletteChip[]>(untrack(() => props.chips ?? []))
  const [query, setQuery] = createSignal("")
  let input: HTMLInputElement | undefined
  // Focus goes back to what had it (the magnifier, or wherever ⌘K was pressed), else to the box's first button.
  const opener = typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null)
  const finalFocus = () =>
    opener?.isConnected && opener !== document.body
      ? opener
      : (props.anchor?.querySelector<HTMLElement>("button") ?? undefined)
  // The surface unmounts as it closes, so it hands focus back itself, unless a press outside already moved it.
  onCleanup(() =>
    setTimeout(() => {
      const now = document.activeElement
      if (!now || now === document.body) finalFocus()?.focus()
    }, 0),
  )

  // Laid over the box: centred on it, as wide as the room allows up to `width`, kept inside the window.
  const place = untrack(() => {
    const box = props.anchor?.getBoundingClientRect()
    const vw = typeof window === "undefined" ? 1280 : window.innerWidth
    const w = Math.max(240, Math.min(props.width ?? 560, vw - 2 * EDGE))
    if (!box || (box.width === 0 && box.height === 0)) return { width: w }
    const left = Math.round(Math.max(EDGE, Math.min(box.left + box.width / 2 - w / 2, vw - EDGE - w)))
    const bar = props.anchor?.closest<HTMLElement>('[data-part="title-bar"]')?.getBoundingClientRect()
    return {
      width: w,
      left,
      top: Math.round(box.top - GROW / 2),
      scrim: bar ? Math.round(bar.bottom) : undefined,
    }
  })

  const mode = () => (query().startsWith(":") ? "lenses" : query().startsWith(">") ? "actions" : "all")
  const text = () => (mode() === "all" ? query() : query().slice(1)).trim()
  const sections = createMemo((): PaletteSection[] => {
    const q = text()
    if (mode() === "lenses") return rank(q, [{ title: "Lenses", commands: props.lenses ?? [] }], 20)
    if (mode() === "actions") return rank(q, props.actions ?? [], 12)
    return rank(q, props.search({ text: q, chips: chips() }), props.limit ?? (q ? 8 : 6))
  })
  const byId = (id: string) => {
    for (const s of sections()) for (const c of s.commands) if (c.id === id) return c
    return undefined
  }
  const run = (id: string) => {
    const c = byId(id)
    if (!c) return
    props.onClose()
    c.run()
  }
  const widenTo = () => {
    const rest = chips().slice(0, -1)
    return rest[rest.length - 1]?.label ?? props.workspace ?? "everything"
  }

  return (
    <>
      <DialogBackdrop
        data-part="command-palette-scrim"
        class="nc-palette-scrim"
        style={place.scrim === undefined ? undefined : { top: `${place.scrim}px` }}
      />
      <DialogContent
        data-part="command-palette"
        aria-label="Command palette"
        initialFocus={() => input}
        class={cx("nc-palette", props.class)}
        data-placed={place.left === undefined ? undefined : ""}
        style={{
          width: `${place.width}px`,
          ...(place.left === undefined ? {} : { left: `${place.left}px`, top: `${place.top}px` }),
        }}
      >
        <OpenLayer />
        <Command
          class="nc-palette__command"
          filter={false}
          loop
          query={query()}
          onQueryChange={(next: string) => setQuery(next)}
          onAction={(value: string) => run(value)}
        >
          <div class="nc-palette__field">
            <Icon name="search" size="sm" class="nc-palette__glyph" />
            <For each={chips()} keyed={(c) => c.id}>
              {(chip, i) => (
                <>
                  <Show when={i() > 0 && !chip().hue}>
                    <span class="nc-palette__sep" aria-hidden="true">
                      /
                    </span>
                  </Show>
                  <span
                    class="nc-palette__chip"
                    data-hue={chip().hue}
                    data-lens={chip().hue ? "" : undefined}
                    data-last={i() === chips().length - 1 ? "" : undefined}
                  >
                    <Show when={chip().mark || chip().icon}>
                      <EntryLead mark={chip().mark} icon={chip().icon} />
                    </Show>
                    {chip().label}
                  </span>
                </>
              )}
            </For>
            <CommandInput
              ref={(el: HTMLInputElement) => {
                input = el
              }}
              class="nc-palette__input"
              aria-label="Command palette"
              placeholder={
                chips().length
                  ? "Search, or : for lenses, > for actions"
                  : `Search ${props.workspace ?? "everything"}…`
              }
              spellcheck={false}
              autocomplete="off"
              onKeyDown={(e: KeyboardEvent) => {
                if (e.key === "Backspace" && !query() && chips().length > 0) {
                  e.preventDefault()
                  setChips((c) => c.slice(0, -1))
                }
              }}
            />
            <Kbd keys="esc" class="nc-palette__esc" />
          </div>
          <div class="nc-palette__pop">
            <CommandEmpty class="nc-palette__empty">No results for “{text()}”</CommandEmpty>
            <CommandList class="nc-palette__list">
              <For each={sections()} keyed={(s) => s.title}>
                {(section) => (
                  <CommandGroup class="nc-palette__group">
                    <CommandGroupLabel class="nc-palette__title">{section().title}</CommandGroupLabel>
                    <For each={section().commands} keyed={(c) => c.id}>
                      {(c) => (
                        <CommandItem value={c().id} label={c().label} class="nc-palette__item">
                          <span class="nc-palette__lead" data-hue={c().hue}>
                            <EntryLead mark={c().mark} icon={c().icon ?? "arrow-right"} />
                          </span>
                          <span class="nc-palette__label">{c().label}</span>
                          <Show when={c().hint}>
                            <span class="nc-palette__hint">{c().hint}</span>
                          </Show>
                          <Show when={c().shortcut}>
                            <span class="nc-palette__keys">
                              <For each={c().shortcut!.split(" ")}>{(k) => <Kbd keys={k} />}</For>
                            </span>
                          </Show>
                        </CommandItem>
                      )}
                    </For>
                  </CommandGroup>
                )}
              </For>
            </CommandList>
            <div class="nc-palette__foot">
              <span>
                <Kbd keys="↑" />
                <Kbd keys="↓" /> move
              </span>
              <span>
                <Kbd keys="↵" /> open
              </span>
              <span>
                <Kbd keys=":" /> lenses
              </span>
              <span>
                <Kbd keys=">" /> actions
              </span>
              <Show when={chips().length && !query()}>
                <span class="nc-palette__widen">
                  <Kbd keys="⌫" /> widen to {widenTo()}
                </span>
              </Show>
            </div>
          </div>
        </Command>
      </DialogContent>
    </>
  )
}
