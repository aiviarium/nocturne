// The lens switch, inside the scope box after its magnifier: `⌕ │ ✦ Explore │ ▤ Product │ </> Build │ +1 ⌄`. A
// segmented control: the lens that is on is a raised neutral segment with its icon in full hue, the others quiet text
// with their icons in a muted mix of their hue. The rest fold into the `+N ⌄` menu, which also opens "Customise
// lenses…": show or hide each, and reorder them. ⌘1…⌘9 follow the order. In a narrow title bar the labels go first,
// then the last lenses fold into the menu one by one (`squeeze`); the one that is on always stays.
import type { JSX } from "@solidjs/web"
import { SegmentedControl, SegmentedControlItem } from "@ui-sdk/solid/segmented-control"
import { createSignal, For, onCleanup, Show, untrack } from "solid-js"
import { Button } from "../components/Button"
import { Icon } from "../components/Icon"
import { DropdownMenu, type MenuEntry } from "../components/Menu"
import { Popover } from "../components/Popover"
import { Switch } from "../components/Switch"
import { Tooltip } from "../components/Tooltip"
import { cx } from "../lib/cx"
import type { Lens, LensHue, LensPrefs } from "./types"

/** The colour a lens hue names, for inline use: `var(--label-sky)`. */
export const lensColor = (hue: LensHue) => `var(--label-${hue})`

/** The lens with this id, or undefined. */
export const lensById = (lenses: readonly Lens[], id: string | undefined) =>
  id === undefined ? undefined : lenses.find((l) => l.id === id)

/** The lenses in the person's order: the stored order first, then the rest as the scope lists them. */
export function orderLenses(lenses: readonly Lens[], prefs: LensPrefs | undefined): Lens[] {
  const order = prefs?.order ?? []
  const rank = (l: Lens) => {
    const i = order.indexOf(l.id)
    return i === -1 ? order.length + lenses.indexOf(l) : i
  }
  return [...lenses].sort((a, b) => rank(a) - rank(b))
}

/** The lenses ⌘1…⌘9 reach: the shown ones in the person's order. */
export function shownLenses(lenses: readonly Lens[], prefs: LensPrefs | undefined): Lens[] {
  const hidden = prefs?.hidden ?? []
  return orderLenses(lenses, prefs).filter((l) => !hidden.includes(l.id))
}

export interface LensSwitchProps {
  /** The scope's lenses, as the scope lists them. `prefs` puts them in the person's order. */
  lenses: Lens[]
  /** The id of the lens that is on. */
  value: string | undefined
  onChange: (id: string) => void
  /** The person's order and hidden lenses. Controlled when set; Customise reports changes in `onPrefsChange`. */
  prefs?: LensPrefs
  onPrefsChange?: (prefs: LensPrefs) => void
  /** Icons only: the title bar drops the labels when the box would not fit otherwise. */
  compact?: boolean
  /** How many of the last lenses fold into the `+N` menu. Never the one that is on. */
  squeeze?: number
  /** Binds ⌘1…⌘9 (Ctrl on other platforms) on `window`. Default true. */
  keys?: boolean
  /** Names the group for a screen reader. Default "Lenses". */
  label?: string
  class?: string
}

const NO_PREFS: LensPrefs = { order: [], hidden: [] }

/** The scope's lenses as a segmented control, the rest in a `+N` menu, and the dialog that arranges them. */
export function LensSwitch(props: LensSwitchProps): JSX.Element {
  const [local, setLocal] = createSignal<LensPrefs>(NO_PREFS)
  const prefs = () => props.prefs ?? local()
  const setPrefs = (next: LensPrefs) => {
    if (!props.prefs) setLocal(next)
    props.onPrefsChange?.(next)
  }
  const ordered = () => orderLenses(props.lenses, prefs())
  const shown = () => shownLenses(props.lenses, prefs())
  const hidden = () => ordered().filter((l) => prefs().hidden.includes(l.id))
  const active = () => lensById(props.lenses, props.value)
  /** A hidden lens the person has on still shows, after the others, so the box always says which is on. */
  const listed = () => {
    const on = active()
    return on && !shown().includes(on) ? [...shown(), on] : shown()
  }
  const squeezed = () => {
    const n = props.squeeze ?? 0
    if (!n) return []
    const others = listed().filter((l) => l !== active())
    return others.slice(Math.max(0, others.length - n))
  }
  const inBox = () => listed().filter((l) => !squeezed().includes(l))
  const more = () => [...squeezed(), ...hidden().filter((l) => l !== active() && !squeezed().includes(l))]
  /** A hairline parts two quiet neighbours; none touches the raised segment. */
  const sepBefore = (i: number) => {
    const list = inBox()
    return i > 0 && list[i - 1] !== active() && list[i] !== active()
  }
  const number = (l: Lens) => shown().indexOf(l) + 1
  const keyOf = (l: Lens) => (number(l) > 0 && number(l) <= 9 ? `⌘ ${number(l)}` : undefined)

  const [customise, setCustomise] = createSignal(false)
  let group: HTMLDivElement | undefined

  if (untrack(() => props.keys) !== false && typeof window !== "undefined") {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.defaultPrevented) return
      if (!/^[1-9]$/.test(e.key)) return
      const lens = shown()[Number(e.key) - 1]
      if (!lens) return
      e.preventDefault()
      if (lens.id !== props.value) props.onChange(lens.id)
    }
    window.addEventListener("keydown", onKey)
    onCleanup(() => window.removeEventListener("keydown", onKey))
  }

  const menu = (): MenuEntry[] => [
    ...(more().length ? [{ type: "label" as const, label: "More lenses" }] : []),
    ...more().map((l) => ({
      id: l.id,
      label: l.label,
      leading: <LensIcon lens={l} />,
      description: l.source ? `${l.purpose ?? ""}${l.purpose ? " · " : ""}${l.source}` : l.purpose,
      shortcut: keyOf(l),
      checked: l === active(),
    })),
    ...(more().length ? [{ type: "separator" as const }] : []),
    { id: "\u0000customise", label: "Customise lenses…", icon: "sliders-horizontal" },
  ]

  return (
    <div
      ref={(el) => {
        group = el
      }}
      data-part="lens-switch"
      data-compact={props.compact ? "" : undefined}
      class={cx("nc-lens-switch", props.class)}
    >
      <SegmentedControl
        aria-label={props.label ?? "Lenses"}
        class="nc-lens-switch__group"
        value={props.value ?? null}
        onValueChange={(next: string | null) => {
          if (next && next !== props.value) props.onChange(next)
        }}
      >
        <For each={inBox()} keyed={(l) => l.id}>
          {(lens, i) => (
            <Tooltip
              content={
                props.compact
                  ? `${lens().label}${lens().purpose ? `: ${lens().purpose}` : ""}`
                  : (lens().purpose ?? lens().label)
              }
              shortcut={keyOf(lens())}
              placement="bottom"
              type="description"
            >
              {(t) => (
                <SegmentedControlItem
                  {...t}
                  value={lens().id}
                  class="nc-lens-switch__lens"
                  aria-label={lens().label}
                  data-lens={lens().id}
                  data-hue={lens().hue}
                  data-hidden={shown().includes(lens()) ? undefined : ""}
                  data-sep={sepBefore(i()) ? "" : undefined}
                >
                  <Icon name={lens().icon} size="sm" />
                  <span class="nc-lens-switch__label" data-label="">
                    {lens().label}
                  </span>
                </SegmentedControlItem>
              )}
            </Tooltip>
          )}
        </For>
      </SegmentedControl>
      <DropdownMenu
        label="Lenses"
        matchWidth={false}
        minWidth="260px"
        placement="bottom-end"
        items={menu()}
        onSelect={(id) => {
          // After the menu has closed, so the dialog opens with no layer in the way.
          if (id === "\u0000customise") setTimeout(() => setCustomise(true), 0)
          else props.onChange(id)
        }}
        trigger={(t) => (
          <button
            {...t}
            type="button"
            class="nc-lens-switch__more"
            data-more={more().length ? "" : undefined}
            data-sep={sepBefore(inBox().length) ? "" : undefined}
            aria-label={more().length ? `${more().length} more lenses` : "Lens options"}
          >
            <Show when={more().length}>
              <span class="nc-lens-switch__count">+{more().length}</span>
            </Show>
            <Icon name="chevron-down" size="sm" />
          </button>
        )}
      />
      <Popover
        open={customise()}
        anchor={group}
        onClose={() => setCustomise(false)}
        placement="bottom-start"
        offset={6}
        initialFocus="auto"
        class="nc-lens-customise-popup"
        aria-label="Customise lenses"
      >
        <Show when={customise()}>
          <LensCustomise
            lenses={props.lenses}
            prefs={prefs()}
            onPrefsChange={setPrefs}
            onDone={() => setCustomise(false)}
          />
        </Show>
      </Popover>
    </div>
  )
}

/** A lens's icon in a muted mix of its hue, for menus and lists. */
function LensIcon(props: { lens: Lens }): JSX.Element {
  return (
    <span class="nc-lens-icon" data-hue={props.lens.hue}>
      <Icon name={props.lens.icon} size="sm" />
    </span>
  )
}

export interface LensCustomiseProps {
  lenses: Lens[]
  prefs: LensPrefs
  onPrefsChange: (prefs: LensPrefs) => void
  onDone?: () => void
}

/**
 * Show or hide each lens and put them in order: drag a row, or Alt and an arrow on the focused row. One lens always
 * stays shown. Reset goes back to the scope's own order with every lens shown.
 */
export function LensCustomise(props: LensCustomiseProps): JSX.Element {
  const order = () => orderLenses(props.lenses, props.prefs)
  const shown = () => shownLenses(props.lenses, props.prefs)
  const [drag, setDrag] = createSignal<string | undefined>(undefined)
  const [over, setOver] = createSignal<string | undefined>(undefined)
  let list: HTMLUListElement | undefined
  const move = (id: string, to: number) => {
    const ids = order()
      .map((l) => l.id)
      .filter((x) => x !== id)
    ids.splice(Math.max(0, Math.min(ids.length, to)), 0, id)
    props.onPrefsChange({ order: ids, hidden: props.prefs.hidden })
    queueMicrotask(() => list?.querySelector<HTMLElement>(`[data-lens="${CSS.escape(id)}"]`)?.focus())
  }
  const toggle = (lens: Lens, on: boolean) => {
    const hidden = props.prefs.hidden.filter((x) => x !== lens.id)
    if (!on) hidden.push(lens.id)
    if (hidden.length >= props.lenses.length) return
    props.onPrefsChange({ order: order().map((l) => l.id), hidden })
  }
  return (
    <div data-part="lens-customise" class="nc-lens-customise">
      <div class="nc-lens-customise__head">
        <span class="nc-lens-customise__title">Lenses</span>
        <span class="nc-lens-customise__note">
          Drag to reorder, or Alt and an arrow. Hidden ones stay in the menu.
        </span>
      </div>
      <ul
        ref={(el) => {
          list = el
        }}
        class="nc-lens-customise__list"
        aria-label="Lenses, in order"
      >
        <For each={order()} keyed={(l) => l.id}>
          {(lens, i) => (
            <li
              class="nc-lens-customise__row"
              draggable="true"
              tabindex="0"
              data-lens={lens().id}
              aria-label={`${lens().label}, ${i() + 1} of ${order().length}`}
              aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
              data-dragging={drag() === lens().id ? "" : undefined}
              data-over={over() === lens().id && drag() !== lens().id ? "" : undefined}
              onDragStart={(e: DragEvent) => {
                setDrag(lens().id)
                e.dataTransfer?.setData("text/plain", lens().id)
                if (e.dataTransfer) e.dataTransfer.effectAllowed = "move"
              }}
              onDragOver={(e: DragEvent) => {
                e.preventDefault()
                setOver(lens().id)
              }}
              onDragLeave={() => {
                if (over() === lens().id) setOver(undefined)
              }}
              onDrop={(e: DragEvent) => {
                e.preventDefault()
                const id = drag()
                if (id && id !== lens().id) move(id, i())
                setDrag(undefined)
                setOver(undefined)
              }}
              onDragEnd={() => {
                setDrag(undefined)
                setOver(undefined)
              }}
              onKeyDown={(e: KeyboardEvent) => {
                if (e.target !== e.currentTarget) return
                if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
                  e.preventDefault()
                  move(lens().id, i() + (e.key === "ArrowUp" ? -1 : 1))
                }
              }}
            >
              <span class="nc-lens-customise__grip" aria-hidden="true">
                <Icon name="grip-vertical" size="sm" />
              </span>
              <LensIcon lens={lens()} />
              <span class="nc-lens-customise__name">{lens().label}</span>
              <Show when={lens().purpose || lens().source}>
                <span class="nc-lens-customise__purpose">
                  {[lens().purpose, lens().source].filter(Boolean).join(" · ")}
                </span>
              </Show>
              <span class="nc-lens-customise__key">
                {shown().indexOf(lens()) >= 0 && shown().indexOf(lens()) < 9
                  ? `⌘${shown().indexOf(lens()) + 1}`
                  : ""}
              </span>
              <Switch
                checked={!props.prefs.hidden.includes(lens().id)}
                onChange={(on: boolean) => toggle(lens(), on)}
                aria-label={`Show ${lens().label} in the box`}
              />
            </li>
          )}
        </For>
      </ul>
      <div class="nc-lens-customise__foot">
        <Button variant="ghost" size="sm" onClick={() => props.onPrefsChange({ order: [], hidden: [] })}>
          Reset
        </Button>
        <span class="nc-lens-customise__grow" />
        <Button size="sm" onClick={() => props.onDone?.()}>
          Done
        </Button>
      </div>
    </div>
  )
}
