// The context menu of a row in a list or table, shared by `RowList`, `DataTable` and `DataList` so they open it
// alike: a right click, the Menu key or Shift+F10 on a focused row, a long press on a touch screen. What it acts
// on is decided as in a file manager: a row that is part of a selection of several opens the menu for the whole
// selection; any other row is selected alone first and the menu is for it. The decisions are pure functions here.
import type { MenuItemEntry, MenuLabelEntry, MenuSeparatorEntry } from "../components/Menu"

/** An entry of a row's menu: a menu item that may run itself, a separator or a group label. */
export type RowMenuEntry = (MenuItemEntry & { onSelect?: () => void }) | MenuSeparatorEntry | MenuLabelEntry

/** What a row's menu acts on. */
export interface RowMenuTarget<K> {
  /** The rows it acts on, in list order: the selection, or the row alone. */
  keys: K[]
  /** The row it was opened on. */
  at: K
  /** The selection must become this row alone before the menu opens. */
  reselect: boolean
}

/**
 * The rows a menu opened on row `at` acts on. In a selectable list a row that is part of a selection of more than
 * one acts on the selection; otherwise the row is selected alone (unless it already is) and the menu is for it.
 */
export function menuTarget<K>(
  keys: readonly K[],
  selected: readonly K[],
  at: K,
  selectable: boolean,
): RowMenuTarget<K> {
  if (selectable && selected.length > 1 && selected.includes(at)) {
    const set = new Set(selected)
    return { keys: keys.filter((k) => set.has(k)), at, reselect: false }
  }
  return { keys: [at], at, reselect: selectable && !(selected.length === 1 && selected[0] === at) }
}

/** The Menu key, or Shift+F10: the keyboard's right click. */
export function isMenuKey(e: { key: string; shiftKey?: boolean }): boolean {
  return e.key === "ContextMenu" || (e.key === "F10" && Boolean(e.shiftKey))
}

/** Where a menu opened from the keyboard on `el` goes: under its start, as a right click there would put it. */
export function keyboardMenuPoint(el: Element): { x: number; y: number } {
  const r = el.getBoundingClientRect()
  return { x: Math.round(r.left + Math.min(24, r.width / 2)), y: Math.round(r.bottom) }
}

export interface DefaultMenuOptions {
  /** How many rows it acts on. */
  count: number
  /** The row's own actions (one row), or the bulk actions (several), as menu items. */
  actions?: RowMenuEntry[]
  /** An Open item, first, for one row. */
  open?: boolean
  /** A Rename item, for one row. */
  rename?: boolean
  /** A Delete item, last. */
  remove?: boolean
}

/**
 * The menu a list builds when its caller gives none: Open, the row's actions (or, for several, the bulk actions
 * under a "3 selected" label), Rename for one row, and Delete last, with the count when it is more than one.
 * Ids `open`, `rename` and `delete` are the list's own.
 */
export function defaultRowMenu(o: DefaultMenuOptions): RowMenuEntry[] {
  const out: RowMenuEntry[] = []
  const many = o.count > 1
  if (many) out.push({ type: "label", label: `${o.count} selected` })
  if (o.open && !many) out.push({ id: "open", label: "Open", icon: "arrow-up-right" })
  out.push(...(o.actions ?? []))
  if (o.rename && !many) out.push({ id: "rename", label: "Rename", icon: "edit", shortcut: "F2" })
  if (o.remove) {
    if (out.some((e) => e.type !== "label")) out.push({ type: "separator" })
    out.push({ id: "delete", label: many ? `Delete ${o.count}` : "Delete", icon: "trash", danger: true })
  }
  return out
}

/** Whether a menu has anything to choose. */
export function hasItems(entries: readonly RowMenuEntry[]): boolean {
  return entries.some((e) => (e.type ?? "item") === "item")
}

/** The item with `id`, to run its own `onSelect`. */
export function entryById(
  entries: readonly RowMenuEntry[],
  id: string,
): (MenuItemEntry & { onSelect?: () => void }) | undefined {
  return entries.find(
    (e): e is MenuItemEntry & { onSelect?: () => void } =>
      (e.type ?? "item") === "item" && (e as MenuItemEntry).id === id,
  )
}
