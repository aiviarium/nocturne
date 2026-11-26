// A surface's trail: its structure from its root down to what it shows, the last crumb current. Drawn like the
// title bar's path (drill size, "/" between crumbs), so the window has one trail style. No leading arrow: the
// first crumb is the way up. Structural only: it never walks time (that is the history's job).
import type { JSX } from "@solidjs/web"
import { createEffect, createMemo, createSignal, For, onSettled, Show, untrack } from "solid-js"
import { Icon, type IconName } from "../components/Icon"
import { DropdownMenu } from "../components/Menu"
import { Tooltip } from "../components/Tooltip"
import { cx } from "../lib/cx"
import { EntryLead, Switcher, type SwitcherEntry, type SwitcherSection } from "./Switcher"
import type { ShellMark } from "./types"

export interface TrailCrumb {
  /** Stable across renders; default the label. */
  id?: string
  label: string
  /** Goes to this crumb. Every crumb but the last needs it. */
  onClick?: () => void
  /** Drawn before the label of a crumb that goes up, and in the fold menu. */
  mark?: ShellMark
  icon?: IconName
  /**
   * The last crumb only: makes it a switcher ("WEB-142 ⌄") over the list it came from, in that list's order and
   * filter, the current entry checked.
   */
  switcher?: {
    noun: string
    sections: SwitcherSection[]
    onPick: (entry: SwitcherEntry) => void
    wide?: boolean
  }
}

export interface TrailProps {
  crumbs: TrailCrumb[]
  /** Names the trail for a screen reader. Default "Trail". */
  label?: string
  /**
   * How many leading crumbs fold into one "…" menu. `auto` (default) folds from the start, as few as fit; the
   * last crumb never folds.
   */
  fold?: number | "auto"
  /** A shortcut shown in the tooltip of the crumb right before the current one, such as `Esc` for up. */
  upShortcut?: string
  class?: string
}

const keyOf = (c: TrailCrumb) => c.id ?? c.label

/**
 * The free width in the trail's row: a trail sized to its content (a header's) is only as wide as what it shows, so
 * its own width is not the room it could take. An empty sibling that grows (a header's middle) counts as free.
 */
const empty = (c: HTMLElement) =>
  getComputedStyle(c).flexGrow !== "0" && !c.childElementCount && !c.textContent?.trim()

function slack(el: HTMLElement): number {
  const row = el.parentElement
  if (!row) return 0
  const cs = getComputedStyle(row)
  const kids = [...row.children].filter((c): c is HTMLElement => c instanceof HTMLElement && !c.hidden)
  const gap = Number.parseFloat(cs.columnGap) || 0
  const used =
    kids.reduce((s, c) => s + (c !== el && empty(c) ? 0 : c.offsetWidth), 0) +
    gap * Math.max(0, kids.length - 1) +
    (Number.parseFloat(cs.paddingLeft) || 0) +
    (Number.parseFloat(cs.paddingRight) || 0)
  return Math.max(0, row.clientWidth - used)
}
/** Room the "…" button and its separator take, in px: a 24px button and a 16px slash. */
const FOLD_W = 40

/**
 * Crumbs at the drill size: the ones that go up in `--text-3` and clickable, the current one in `--text-1`. Colour
 * is the only difference, so a label keeps its size and place as it moves between title and crumb.
 */
export function Trail(props: TrailProps): JSX.Element {
  let nav: HTMLElement | undefined
  const [auto, setAuto] = createSignal(0, { ownedWrite: true })
  const widths = new Map<string, number>()
  const folded = createMemo(() => {
    const n = props.crumbs.length
    const want = props.fold === undefined || props.fold === "auto" ? auto() : props.fold
    return Math.max(0, Math.min(want, n - 1))
  })
  const shown = createMemo(() => props.crumbs.slice(folded()))
  const hidden = createMemo(() => props.crumbs.slice(0, folded()))

  // Widths of crumbs as last drawn in full; a crumb not seen yet unfolds everything once so it can be measured.
  const fit = () =>
    untrack(() => {
      if (!nav || (props.fold !== undefined && props.fold !== "auto")) return
      for (const li of nav.querySelectorAll<HTMLElement>("[data-crumb]"))
        widths.set(li.dataset.crumb!, li.offsetWidth)
      const list = props.crumbs
      if (list.some((c) => !widths.has(keyOf(c)))) {
        if (auto() !== 0) setAuto(0)
        return
      }
      const room = nav.clientWidth + slack(nav)
      if (!room) return
      const total = (from: number) =>
        list.slice(from).reduce((s, c) => s + (widths.get(keyOf(c)) ?? 0), 0) + (from > 0 ? FOLD_W : 0)
      let k = 0
      while (k < list.length - 1 && total(k) > room) k++
      if (k !== auto()) setAuto(k)
    })
  createEffect(
    () => `${props.crumbs.map(keyOf).join("/")}|${auto()}`,
    () => fit(),
  )
  onSettled(() => {
    if (!nav || typeof ResizeObserver !== "function") return
    const ro = new ResizeObserver(() => fit())
    ro.observe(nav)
    return () => ro.disconnect()
  })

  return (
    <nav
      ref={(el) => {
        nav = el
      }}
      data-part="trail"
      aria-label={props.label ?? "Trail"}
      class={cx("nc-trail", props.class)}
    >
      <ol class="nc-trail__list">
        <Show when={hidden().length}>
          <li class="nc-trail__item" data-fold="">
            <DropdownMenu
              label="Folded trail"
              matchWidth={false}
              minWidth="200px"
              items={hidden().map((c) => ({
                id: keyOf(c),
                label: c.label,
                leading: c.mark || c.icon ? <EntryLead mark={c.mark} icon={c.icon} /> : undefined,
              }))}
              onSelect={(id) =>
                hidden()
                  .find((c) => keyOf(c) === id)
                  ?.onClick?.()
              }
              trigger={(t) => (
                <button {...t} type="button" class="nc-trail__fold" aria-label="Show the folded trail">
                  <Icon name="more" size="sm" />
                </button>
              )}
            />
          </li>
        </Show>
        <For each={shown()} keyed={(c) => keyOf(c)}>
          {(crumb, i) => (
            <li class="nc-trail__item" data-crumb={keyOf(crumb())}>
              <Show when={i() > 0 || hidden().length > 0}>
                <span class="nc-trail__sep" aria-hidden="true">
                  /
                </span>
              </Show>
              <Show
                when={i() < shown().length - 1}
                fallback={
                  <Show
                    when={crumb().switcher}
                    fallback={
                      <span class="nc-trail__here" aria-current="location">
                        {crumb().label}
                      </span>
                    }
                  >
                    {(sw) => (
                      <Switcher
                        label={crumb().label}
                        noun={sw().noun}
                        sections={sw().sections}
                        onPick={(e) => sw().onPick(e)}
                        wide={sw().wide}
                        trigger={(t) => (
                          <button
                            {...t}
                            type="button"
                            class="nc-trail__switch"
                            aria-current="location"
                            aria-label={`${crumb().label}, switch ${sw().noun}`}
                          >
                            <span class="nc-trail__switch-label">{crumb().label}</span>
                            <Icon name="chevron-down" size="sm" />
                          </button>
                        )}
                      />
                    )}
                  </Show>
                }
              >
                <Tooltip
                  content={`Up to ${crumb().label}`}
                  shortcut={i() === shown().length - 2 ? props.upShortcut : undefined}
                >
                  {(t) => (
                    <button {...t} type="button" class="nc-trail__crumb" onClick={() => crumb().onClick?.()}>
                      <Show when={crumb().mark || crumb().icon}>
                        <EntryLead mark={crumb().mark} icon={crumb().icon} />
                      </Show>
                      {crumb().label}
                    </button>
                  )}
                </Tooltip>
              </Show>
            </li>
          )}
        </For>
      </ol>
    </nav>
  )
}
