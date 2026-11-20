// Multi-selection in a list, as in Finder, Gmail or Linear, as a pure function: a plain click activates a row
// (opens it; a row that opens nothing is selected alone), Cmd or Ctrl and a click (or Space) toggles one, Shift and
// a click (or Shift and an arrow) selects the range from the anchor, Cmd or Ctrl+A takes every row and Escape
// clears. The anchor is where the next range starts: the last row clicked, opened or toggled on its own.
import { createMemo, createSignal } from "solid-js"

export type SelectGesture = "only" | "toggle" | "range" | "all" | "none"

export interface SelectionState<K> {
  selected: K[]
  anchor: K | null
}

/** The gesture a click with these modifier keys makes. */
export function gestureOf(e: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean }): SelectGesture {
  if (e.shiftKey) return "range"
  if (e.metaKey || e.ctrlKey) return "toggle"
  return "only"
}

/**
 * The selection after `gesture` on the row with key `at`. `keys` are every row's keys in list order. A range
 * replaces what was selected with the rows between the anchor and `at` (both included); without an anchor it
 * starts at `at`. Keys that are no longer in the list drop out.
 */
export function selectRows<K>(
  keys: readonly K[],
  state: SelectionState<K>,
  gesture: SelectGesture,
  at?: K,
): SelectionState<K> {
  const present = new Set(keys)
  const kept = state.selected.filter((k) => present.has(k))
  switch (gesture) {
    case "none":
      return { selected: [], anchor: null }
    case "all":
      return { selected: keys.slice(), anchor: state.anchor }
    case "only":
      return at === undefined ? { selected: kept, anchor: state.anchor } : { selected: [at], anchor: at }
    case "toggle": {
      if (at === undefined) return { selected: kept, anchor: state.anchor }
      const on = kept.includes(at)
      const next = on ? kept.filter((k) => k !== at) : [...kept, at]
      return { selected: keys.filter((k) => next.includes(k)), anchor: at }
    }
    case "range": {
      if (at === undefined) return { selected: kept, anchor: state.anchor }
      const anchor = state.anchor !== null && present.has(state.anchor) ? state.anchor : at
      const a = keys.indexOf(anchor)
      const b = keys.indexOf(at)
      const [lo, hi] = a < b ? [a, b] : [b, a]
      return { selected: keys.slice(lo, hi + 1), anchor }
    }
  }
}

/**
 * What a key press on a focused row does to the selection: Space toggles the row (Shift+Space extends the range
 * to it), Cmd or Ctrl+A selects every row, Escape clears. Null for any other key. Shift and an arrow, which moves
 * focus and extends the range, is the list's: it knows the next row.
 */
export function selectionKey(e: {
  key: string
  shiftKey?: boolean
  metaKey?: boolean
  ctrlKey?: boolean
  altKey?: boolean
}): SelectGesture | null {
  const mod = e.metaKey || e.ctrlKey
  if (e.key === " " && !mod && !e.altKey) return e.shiftKey ? "range" : "toggle"
  if ((e.key === "a" || e.key === "A") && mod && !e.altKey) return "all"
  if (e.key === "Escape") return "none"
  return null
}

export interface SelectionOptions<K> {
  /** Every row's key, in list order. */
  keys: () => readonly K[]
  /** The selected keys, controlled when not undefined. */
  value?: () => readonly K[] | undefined
  /** The selected keys at first, uncontrolled. */
  defaultValue?: readonly K[]
  /** The selection changed. */
  onChange?: (keys: K[]) => void
  /** Say this in the list's live region ("3 selected."). */
  announce?: (text: string) => void
}

export interface SelectionControl<K> {
  selected: () => readonly K[]
  /** Where the next range starts. */
  anchor: () => K | null
  /** Move the anchor without changing the selection (a row was opened, or focus moved without Shift). */
  setAnchor: (key: K | null) => void
  /**
   * Shift and an arrow from row `from` to row `to`: the range from the anchor (or from `from`, when there is
   * none) to `to`.
   */
  extend: (from: K, to: K) => void
  isSelected: (key: K) => boolean
  count: () => number
  /** Apply a gesture at a row (or to the whole list, for "all" and "none"). */
  select: (gesture: SelectGesture, at?: K) => void
  /** Replace the selection (keys that are not rows drop out). */
  set: (keys: readonly K[]) => void
  /**
   * A click on a row, with its modifier keys. Cmd or Ctrl toggles the row and Shift extends the range to it; both
   * return true, and the click must not also open the row. A plain click on a row that `activates` (opens
   * something) leaves the selection as it is, moves the anchor there and returns false: open it. A plain click on
   * a row that opens nothing selects it alone and returns true.
   */
  click: (
    key: K,
    e: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean },
    activates?: boolean,
  ) => boolean
}

/**
 * The selection of a list, shared by `RowList`, `DataTable` and `DataList` so they select alike: the gestures
 * of `selectRows`, the anchor they keep, controlled or not, and the announcement of the count.
 */
export function createSelection<K>(o: SelectionOptions<K>): SelectionControl<K> {
  const [local, setLocal] = createSignal<readonly K[]>(o.defaultValue ?? [])
  const [anchor, setAnchor] = createSignal<K | null>(null)
  const selected = () => o.value?.() ?? local()
  const set = (next: readonly K[]) => {
    const before = selected()
    if (next.length === before.length && next.every((k, i) => k === before[i])) return
    if (o.value?.() === undefined) setLocal(next)
    o.onChange?.([...next])
    o.announce?.(next.length ? `${next.length} selected.` : "Selection cleared.")
  }
  const set_ = createMemo(() => new Set(selected()))
  // A read after a write returns the old value in Solid 2, so the anchor is passed in rather than read back.
  const apply = (gesture: SelectGesture, at: K | undefined, from: K | null) => {
    const next = selectRows(o.keys(), { selected: [...selected()], anchor: from }, gesture, at)
    setAnchor(() => next.anchor)
    set(next.selected)
  }
  const select = (gesture: SelectGesture, at?: K) => apply(gesture, at, anchor())
  return {
    selected,
    anchor,
    setAnchor: (key) => setAnchor(() => key),
    extend: (from, to) => {
      const a = anchor()
      const start = a === null || !o.keys().includes(a) ? from : a
      setAnchor(() => start)
      apply("range", to, start)
    },
    isSelected: (key) => set_().has(key),
    count: () => selected().length,
    select,
    set: (keys) => {
      const present = new Set(o.keys())
      set(keys.filter((k) => present.has(k)))
    },
    click: (key, e, activates) => {
      const gesture = gestureOf(e)
      if (gesture === "only" && activates) {
        setAnchor(() => key)
        return false
      }
      select(gesture, key)
      return true
    },
  }
}
