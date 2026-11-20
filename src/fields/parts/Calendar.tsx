// A month of days to pick one from, in the person's locale: its week starts where theirs does, its names are theirs.
// Arrow keys move by a day or a week, Page Up and Down by a month, Home and End to the ends of the week, Enter picks.

import type { JSX } from "@solidjs/web"
import { createEffect, createMemo, createSignal, For } from "solid-js"
import { IconButton } from "../../components/IconButton"
import { aria } from "../../lib/aria"
import { cx } from "../../lib/cx"

const pad = (n: number) => String(n).padStart(2, "0")
/** `YYYY-MM-DD` of a local date. */
export const dayOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
/** The local date a `YYYY-MM-DD` names, at noon so a clock change never moves it; null if it is not one. */
export function parseDay(v: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v ?? "")
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)
  return Number.isNaN(d.getTime()) ? null : d
}
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12)
const addMonths = (d: Date, n: number) => {
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1, 12)
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0, 12).getDate()
  t.setDate(Math.min(d.getDate(), last))
  return t
}

/** 0 is Sunday: the first day of the week of the person's locale (Monday where the browser does not say). */
export function firstWeekday(): number {
  try {
    const l = new Intl.Locale(navigator.language) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number }
      weekInfo?: { firstDay: number }
    }
    const first = l.getWeekInfo?.().firstDay ?? l.weekInfo?.firstDay ?? 1
    return first % 7
  } catch {
    return 1
  }
}

export interface CalendarProps {
  /** The picked day, `YYYY-MM-DD`. */
  value: string | null
  onPick(day: string): void
  /** Focus a day when it mounts: the popover has just opened. */
  autofocus?: boolean
  class?: string
}

export function Calendar(props: CalendarProps): JSX.Element {
  const today = new Date()
  const picked = () => parseDay(props.value)
  const [focus, setFocus] = createSignal<Date>(picked() ?? today)
  createEffect(
    picked,
    (p) => {
      if (p) setFocus(p)
    },
    { defer: true },
  )
  // Primitives, so moving the focus inside a month does not draw the month again.
  const year = createMemo(() => focus().getFullYear())
  const mon = createMemo(() => focus().getMonth())
  const month = () => ({ y: year(), m: mon() })
  const first = firstWeekday()
  const weekdays = createMemo(() => {
    const fmt = new Intl.DateTimeFormat(undefined, { weekday: "short" })
    // 2023-01-01 is a Sunday.
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2023, 0, 1 + ((first + i) % 7), 12)))
  })
  const days = createMemo(() => {
    const y = year()
    const m = mon()
    const start = new Date(y, m, 1, 12)
    const lead = (start.getDay() - first + 7) % 7
    const rows: Date[][] = []
    for (let r = 0; r < 6; r++)
      rows.push(Array.from({ length: 7 }, (_, c) => addDays(start, r * 7 + c - lead)))
    return rows
  })
  const title = () =>
    new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(
      new Date(month().y, month().m, 1, 12),
    )
  let grid!: HTMLDivElement
  // The first day is focused once, when the calendar opens.
  let focused = false
  const focusDay = (d: Date) => {
    setFocus(d)
    queueMicrotask(() => grid.querySelector<HTMLElement>(`[data-day="${dayOf(d)}"]`)?.focus())
  }
  const onKey = (e: KeyboardEvent) => {
    const f = focus()
    const dow = (f.getDay() - first + 7) % 7
    const next: Record<string, Date> = {
      ArrowLeft: addDays(f, -1),
      ArrowRight: addDays(f, 1),
      ArrowUp: addDays(f, -7),
      ArrowDown: addDays(f, 7),
      PageUp: addMonths(f, -1),
      PageDown: addMonths(f, 1),
      Home: addDays(f, -dow),
      End: addDays(f, 6 - dow),
    }
    const to = next[e.key]
    if (!to) return
    e.preventDefault()
    focusDay(to)
  }
  return (
    <div class={cx("nc-calendar", props.class)} data-part="calendar">
      <div class="nc-calendar__head">
        <IconButton
          icon="chevron-left"
          label="Previous month"
          onClick={() => setFocus(addMonths(focus(), -1))}
        />
        <span class="nc-calendar__title" aria-live="polite">
          {title()}
        </span>
        <IconButton icon="chevron-right" label="Next month" onClick={() => setFocus(addMonths(focus(), 1))} />
      </div>
      <div ref={grid} class="nc-calendar__grid" role="grid" aria-label={title()} onKeyDown={onKey}>
        <div class="nc-calendar__row" role="row">
          <For each={weekdays()}>
            {(w) => (
              <span class="nc-calendar__weekday" role="columnheader">
                {w}
              </span>
            )}
          </For>
        </div>
        <For each={days()}>
          {(row) => (
            <div class="nc-calendar__row" role="row">
              <For each={row}>
                {(d) => {
                  const iso = dayOf(d)
                  const inMonth = d.getMonth() === mon()
                  const selected = () => props.value === iso
                  const roving = () => dayOf(focus()) === iso
                  return (
                    <div role="gridcell" aria-selected={aria(selected())}>
                      <button
                        type="button"
                        class="nc-calendar__day"
                        data-day={iso}
                        data-today={iso === dayOf(today) || undefined}
                        data-outside={!inMonth || undefined}
                        data-selected={selected() || undefined}
                        tabindex={roving() ? 0 : -1}
                        ref={(el) => {
                          if (props.autofocus && roving() && !focused) {
                            focused = true
                            queueMicrotask(() => el.focus({ preventScroll: true }))
                          }
                        }}
                        onFocus={() => setFocus(d)}
                        onClick={() => props.onPick(iso)}
                      >
                        {d.getDate()}
                      </button>
                    </div>
                  )
                }}
              </For>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}
