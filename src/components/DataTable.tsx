import type { JSX } from "@solidjs/web"
import { createMemo, createSignal, For, Match, Show, Switch } from "solid-js"
import { aria } from "../lib/aria"
import { createControllable } from "../lib/controllable"
import { cx } from "../lib/cx"
import { cameFrom } from "../lib/events"
import { activeElement } from "../lib/focus"
import { createId } from "../lib/id"
import { usePhone } from "../lib/phone"
import { createReorder, startsRowDrag } from "../lib/reorder"
import {
  defaultRowMenu,
  entryById,
  hasItems,
  isMenuKey,
  keyboardMenuPoint,
  menuTarget,
  type RowMenuEntry,
} from "../lib/rowmenu"
import { createSelection, selectionKey } from "../lib/selection"
import { createRowSwipe, touchScreen } from "../lib/swipe"
import { CodeBadge } from "./Badge"
import { Button } from "./Button"
import { EmptyState } from "./EmptyState"
import { RowMenu } from "./InsetList"
import { Kbd } from "./Kbd"
import type { MenuEntry } from "./Menu"
import { entriesFromButtons, removalToast } from "./rows"
import { Skeleton } from "./Skeleton"
import { Checkbox } from "./Switch"

export type SortDirection = "asc" | "desc"

export interface SortState {
  /** The column id being sorted. */
  columnId: string
  direction: SortDirection
}

export interface DataColumn<T> {
  /** Stable id, used for sorting. */
  id: string
  /** Header text. */
  header: string
  /** Reads the cell value. Used for display (unless `cell` is set), sorting and the em dash for null. */
  accessor?: (row: T) => unknown
  /** Custom cell content, such as a `State` or a `Badge`. */
  cell?: (row: T, index: number) => JSX.Element
  /**
   * How the value looks: `mono` for IDs, paths and hashes; `num` right-aligned and tabular;
   * `time` relative text in text-3; `text` (default).
   */
  type?: "text" | "mono" | "num" | "time"
  /** Click the header to sort. Default false. */
  sortable?: boolean
  /** Value to sort by when it differs from the displayed value (such as a timestamp behind "15m ago"). */
  sortValue?: (row: T) => string | number | null | undefined
  /** Fixed column width, such as `96px`. */
  width?: string
}

export interface TableError {
  /** The API code, shown as a code badge: "502". */
  code?: string
  /** One plain sentence: "Can't reach host build-01". */
  message: string
  /** What happened and when: "Last seen 4 min ago over SSH". */
  detail?: string
  /** Shows a Retry button. */
  onRetry?: () => void
}

export interface TableEmpty {
  /** "No sessions match" or "No sessions yet". */
  title: string
  /** The active filters, shown as text: "state: running · user: agent". */
  description?: string
  /** Shows a Clear filters button. */
  onClearFilters?: () => void
}

/** What a `DataTable`'s `rowMenu` is given: the rows the menu acts on. */
export interface TableMenuContext<T> {
  /** The rows, in the table's order: the selection, or the row alone. */
  rows: T[]
  ids: string[]
}

export interface DataTableProps<T> {
  /** The rows. */
  rows: readonly T[]
  /** The columns, in order. */
  columns: DataColumn<T>[]
  /** Stable id of a row, used for selection. */
  getRowId: (row: T) => string
  /** Accessible name of the table. */
  label: string
  /**
   * The group a row is in: a heading row stands before the first row of each group. Rows of a group follow one
   * another (the caller orders them); a row with no group (`null`) is under no heading.
   */
  groupOf?: (row: T) => { key: string; label: JSX.Element } | null
  /**
   * Rows can be selected, as on a desktop: Cmd or Ctrl and a click toggles a row, Shift and a click selects the
   * range from the last row clicked, Shift and an arrow extends it, Cmd or Ctrl+A selects all, Escape clears. A
   * checkbox column shows its boxes on a row's hover and focus, and on every row while something is selected (always
   * on a touch screen). Selecting any row turns the toolbar into the bulk bar.
   */
  selectable?: boolean
  /** Selected row ids. Controlled when set. */
  selected?: readonly string[]
  /** Called with the new selection. */
  onSelectionChange?: (ids: string[]) => void
  /** Sort state. Controlled when set; otherwise the table sorts itself. */
  sort?: SortState | null
  /** Called when a header is clicked. */
  onSortChange?: (sort: SortState | null) => void
  /** Do not sort rows here; the data source already did. */
  manualSort?: boolean
  /** Shown above the table when nothing is selected: search, filters. */
  toolbar?: JSX.Element
  /** Actions in the bulk bar, given the selected rows. */
  bulkActions?: (rows: T[]) => JSX.Element
  /**
   * Called when a row is clicked (not its checkbox), or Enter is pressed on it: the row opens. In a `selectable`
   * table a click with Cmd or Ctrl toggles the row and with Shift extends the range instead; without
   * `onRowClick` a plain click selects the row alone.
   */
  onRowClick?: (row: T) => void
  /**
   * Rows can be dragged into another order by the row itself (a press that moves past a few px; on a touch screen
   * a move after the long press that opens its menu), with a drop line and auto-scroll, or moved with Alt and an
   * arrow on a row. Called once per drop with indices of `rows`: move the row at `from` so it is at `to`
   * (`reorderItems`). Only offered while the table is not sorted by a column: a sorted table's order is the
   * column's.
   */
  onReorder?: (from: number, to: number) => void
  /**
   * Rows can be removed: Delete or Backspace on a focused row (the selection, when the row is in it), Delete in
   * the bulk bar and in the row's context menu. No row has a delete button of its own. Return a function to undo it, and the table shows a toast with Undo.
   */
  onRemove?: (ids: string[], rows: T[]) => undefined | (() => void)
  /** What a row is called in announcements, its controls and the undo toast. Default its id. */
  rowLabel?: (row: T) => string
  /**
   * The context menu of a row, or of the selection: a right click, the Menu key or Shift+F10 on a focused row. A
   * row in a selection of several opens it for the whole selection (say so: "Archive 3"); any other row is
   * selected alone first. An entry runs its own `onSelect`, or `onRowMenuSelect`; without either, `open` and
   * `delete` are the table's own (`onRowClick`, `onRemove` with Undo). Default: Open (with
   * `onRowClick`) and Delete, and for a selection the bulk bar's actions and "Delete 3".
   */
  rowMenu?: (target: TableMenuContext<T>) => RowMenuEntry[]
  /** An entry of `rowMenu` without an `onSelect` was chosen. */
  onRowMenuSelect?: (id: string, target: TableMenuContext<T>) => void
  /** Show skeleton rows. */
  loading?: boolean
  /** Number of skeleton rows. Default 5. */
  skeletonRows?: number
  /** Shown when there are no rows. */
  empty?: TableEmpty
  /** Shown instead of the rows when the data could not be loaded. */
  error?: TableError
  /** Pagination or totals. */
  footer?: JSX.Element
  /** No card edge, for a table that sits in a `Panel` or a frame of its own. */
  bare?: boolean
  class?: string
}

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === "number" && typeof b === "number") return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true })
}

/** Sort rows by a column. Stable; empty values go last in both directions. */
export function sortRows<T>(rows: readonly T[], column: DataColumn<T>, direction: SortDirection): T[] {
  const read = (row: T) => (column.sortValue ? column.sortValue(row) : column.accessor?.(row))
  const sign = direction === "asc" ? 1 : -1
  return rows
    .map((row, index) => ({ row, index }))
    .sort((x, y) => {
      const a = read(x.row)
      const b = read(y.row)
      if (a == null || b == null) return compare(a, b) || x.index - y.index
      return compare(a, b) * sign || x.index - y.index
    })
    .map((entry) => entry.row)
}

/**
 * A dense, sortable table with selection, a bulk-action bar, row reordering, removal with undo, a context menu per
 * row, and loading, empty and error states. Rows are one tab stop; the arrow keys move between them. Selection,
 * reordering and the menu behave as in a `RowList` and a `DataList`: they share lib/selection, lib/reorder and
 * lib/rowmenu.
 */
export function DataTable<T>(props: DataTableProps<T>): JSX.Element {
  const [sort, setSort] = createControllable<SortState | null>({
    value: () => props.sort,
    defaultValue: null,
    onChange: (v) => props.onSortChange?.(v),
  })
  const phone = usePhone()
  const [said, setSaid] = createSignal("")
  const announce = (text: string) => {
    setSaid("")
    queueMicrotask(() => setSaid(text))
  }
  const id = createId("table")
  const sorted = createMemo(() => {
    const s = sort()
    if (!s || props.manualSort) return props.rows
    const column = props.columns.find((c) => c.id === s.columnId)
    return column ? sortRows(props.rows, column, s.direction) : props.rows
  })
  const ids = createMemo(() => sorted().map(props.getRowId))
  const selection = createSelection<string>({
    keys: ids,
    value: () => props.selected,
    onChange: (v) => props.onSelectionChange?.(v),
    announce,
  })
  const selected = selection.selected
  const selectedSet = createMemo(() => new Set(selected()))
  const selectedRows = createMemo(() => sorted().filter((r) => selectedSet().has(props.getRowId(r))))
  const allState = (): boolean | "mixed" => {
    const total = props.rows.length
    const count = selectedRows().length
    return count === 0 ? false : count === total ? true : "mixed"
  }
  const toggleAll = () => selection.select(allState() === true ? "none" : "all")
  const clear = () => selection.select("none")
  const nameOf = (row: T | undefined) =>
    row === undefined ? "" : (props.rowLabel?.(row) ?? props.getRowId(row))

  // ---- Focus: one tab stop, the arrow keys between rows ----
  let scrollEl!: HTMLDivElement
  const [focusId, setFocusId] = createSignal<string | null>(null)
  const tabStop = () => {
    const f = focusId()
    return f !== null && ids().includes(f) ? f : (ids()[0] ?? null)
  }
  const rowEl = (i: number) =>
    scrollEl?.querySelector<HTMLElement>(`tbody:not([data-state]) > tr[data-index="${i}"]`) ?? undefined
  const focusRow = (i: number) => queueMicrotask(() => rowEl(i)?.focus())

  // ---- Reordering: only in the rows' own order ----
  const reorderable = () => Boolean(props.onReorder) && !sort() && !props.loading && !props.error
  const reorder = createReorder({
    count: () => sorted().length,
    container: () => scrollEl,
    rowAt: rowEl,
    onReorder: (from, to) => props.onReorder?.(from, to),
    name: (i) => nameOf(sorted()[i]),
    announce,
    refocus: (i) => focusRow(i),
    reveal: (i) => rowEl(i)?.scrollIntoView?.({ block: "nearest" }),
  })

  // ---- Removal ----
  const remove = (gone: string[]) => {
    if (!props.onRemove || !gone.length) return
    const set = new Set(gone)
    const rows = sorted().filter((r) => set.has(props.getRowId(r)))
    const first = ids().findIndex((x) => set.has(x))
    const hadFocus = scrollEl.contains(activeElement())
    const name = rows.length === 1 ? nameOf(rows[0]) : "rows"
    const undo = props.onRemove(gone, rows)
    if (selected().some((k) => set.has(k))) selection.set(selected().filter((k) => !set.has(k)))
    announce(`Removed ${rows.length === 1 ? name : `${rows.length} rows`}.`)
    removalToast(name, rows.length, undo)
    if (hadFocus) queueMicrotask(() => focusRow(Math.max(0, Math.min(first, sorted().length - 1))))
  }
  const removalAt = (rowId: string) =>
    selectedSet().has(rowId) && selected().length > 1 ? [...selected()] : [rowId]

  // ---- Context menu ----
  const [menu, setMenu] = createSignal<{
    at: { x: number; y: number }
    entries: RowMenuEntry[]
    run: (id: string) => void
    rowId: string
  } | null>(null)
  const openMenu = (row: T, at: { x: number; y: number }) => {
    const rowId = props.getRowId(row)
    const target = menuTarget(ids(), selected(), rowId, Boolean(props.selectable))
    if (target.reselect) selection.select("only", rowId)
    const set = new Set(target.keys)
    const context: TableMenuContext<T> = {
      ids: target.keys,
      rows: sorted().filter((r) => set.has(props.getRowId(r))),
    }
    let entries: RowMenuEntry[]
    let run: (id: string) => void
    if (props.rowMenu) {
      entries = props.rowMenu(context)
      run = (choice) => {
        const entry = entryById(entries, choice)
        if (entry?.onSelect) entry.onSelect()
        else if (props.onRowMenuSelect) props.onRowMenuSelect(choice, context)
        else if (choice === "open") props.onRowClick?.(row)
        else if (choice === "delete") remove(target.keys)
      }
    } else {
      const many = target.keys.length > 1
      entries = defaultRowMenu({
        count: target.keys.length,
        open: Boolean(props.onRowClick),
        actions: many ? entriesFromButtons(rootEl.querySelector("[data-bulk-actions]")) : [],
        remove: Boolean(props.onRemove),
      })
      run = (choice) => {
        if (choice === "open") props.onRowClick?.(row)
        else if (choice === "delete") remove(target.keys)
        else entryById(entries, choice)?.onSelect?.()
      }
    }
    if (!hasItems(entries)) return false
    setMenu({ at, entries, run, rowId })
    return true
  }

  // ---- Keyboard on a row ----
  // The keyboard's cursor moved from row `from` to `to`: Shift extends the selection to it, and the cursor is
  // where the next range starts.
  const moveCursor = (from: string, to: string | undefined, extend: boolean) => {
    if (!props.selectable || to === undefined) return
    if (extend) selection.extend(from, to)
    else selection.setAnchor(to)
  }
  const onRowKeyDown = (e: KeyboardEvent, row: T, index: number) => {
    const target = e.target as HTMLElement
    if (target !== e.currentTarget) return
    const rowId = props.getRowId(row)
    const handled = () => {
      e.preventDefault()
      e.stopPropagation()
    }
    if (isMenuKey(e)) {
      handled()
      openMenu(row, keyboardMenuPoint(e.currentTarget as HTMLElement))
      return
    }
    const gesture = selectionKey(e)
    if (gesture && props.selectable) {
      if (gesture === "none" && !selected().length) return
      handled()
      return selection.select(gesture, rowId)
    }
    const n = sorted().length
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp": {
        const delta = e.key === "ArrowDown" ? 1 : -1
        handled()
        if (e.altKey) {
          if (reorderable()) {
            reorder.nudge(index, delta)
            focusRow(Math.max(0, Math.min(n - 1, index + delta)))
          }
          return
        }
        const to = index + delta
        if (to < 0 || to >= n) return
        focusRow(to)
        moveCursor(rowId, ids()[to], e.shiftKey)
        return
      }
      case "Home":
      case "End": {
        handled()
        const to = e.key === "Home" ? 0 : n - 1
        focusRow(to)
        moveCursor(rowId, ids()[to], e.shiftKey)
        return
      }
      case "Enter":
        if (!props.onRowClick) return
        handled()
        return props.onRowClick(row)
      case "Delete":
      case "Backspace":
        if (!props.onRemove) return
        handled()
        return remove(removalAt(rowId))
    }
  }
  let rootEl!: HTMLDivElement
  const cycleSort = (column: DataColumn<T>) => {
    const current = sort()
    if (!current || current.columnId !== column.id)
      setSort({
        columnId: column.id,
        direction: column.type === "num" || column.type === "time" ? "desc" : "asc",
      })
    else if (current.direction === "desc" && (column.type === "num" || column.type === "time"))
      setSort({ columnId: column.id, direction: "asc" })
    else if (current.direction === "asc" && !(column.type === "num" || column.type === "time"))
      setSort({ columnId: column.id, direction: "desc" })
    else setSort(null)
  }
  const ariaSort = (column: DataColumn<T>) => {
    const s = sort()
    return s?.columnId === column.id ? (s.direction === "asc" ? "ascending" : "descending") : undefined
  }
  const showBody = () => !props.loading && !props.error && sorted().length > 0

  return (
    <div
      ref={rootEl}
      data-part="data-table"
      data-selecting={props.selectable && selected().length > 0 ? "" : undefined}
      data-touch={phone() || touchScreen() ? "" : undefined}
      class={cx(
        "nc-datatable",
        !props.bare && "nc-card",
        reorder.mode() !== null && "nc-datatable--reordering",
        reorderable() && "nc-datatable--movable",
        props.class,
      )}
      onKeyDown={(e) => {
        if (e.key === "Escape" && selected().length > 0) {
          e.stopPropagation()
          clear()
        }
      }}
    >
      <Show when={props.selectable && selected().length > 0} fallback={props.toolbar}>
        <div
          class="nc-bulkbar"
          data-part="bulk-bar"
          role="region"
          aria-label="Bulk actions"
          aria-live="polite"
        >
          <span class="nc-rows__count">{selected().length} selected</span>
          <Show when={selected().length < props.rows.length}>
            <Button size="sm" variant="ghost" onClick={() => selection.select("all")}>
              Select all
            </Button>
          </Show>
          <span class="nc-bulkbar__spacer" />
          <span class="nc-bulkbar__actions" data-bulk-actions="">
            {props.bulkActions?.(selectedRows())}
          </span>
          <Show when={props.onRemove}>
            <Button size="sm" variant="ghost" icon="trash" onClick={() => remove([...selected()])}>
              Delete
            </Button>
          </Show>
          <Button size="sm" variant="ghost" onClick={clear}>
            Clear <Kbd keys="Esc" />
          </Button>
        </div>
      </Show>
      <div class="nc-datatable__scroll" ref={scrollEl}>
        <table
          class="nc-table"
          aria-label={props.label}
          aria-rowcount={sorted().length + 1}
          aria-busy={props.loading ? "true" : undefined}
          id={id}
        >
          <thead>
            <tr>
              <Show when={props.selectable}>
                <th class="nc-table__check" scope="col">
                  <Checkbox
                    aria-label="Select all rows"
                    checked={allState()}
                    onChange={toggleAll}
                    disabled={props.rows.length === 0}
                  />
                </th>
              </Show>
              <For each={props.columns}>
                {(column) => (
                  <th
                    scope="col"
                    aria-sort={ariaSort(column)}
                    class={cx((column.type === "num" || column.type === "time") && "is-num")}
                    style={column.width ? { width: column.width } : undefined}
                    data-column={column.id}
                  >
                    <Show when={column.sortable} fallback={column.header}>
                      <button type="button" class="nc-th-sort" onClick={() => cycleSort(column)}>
                        {column.header}
                        <Show when={ariaSort(column)}>
                          <span aria-hidden="true">{ariaSort(column) === "ascending" ? "▲" : "▼"}</span>
                        </Show>
                      </button>
                    </Show>
                  </th>
                )}
              </For>
            </tr>
          </thead>
          <Show when={props.loading}>
            <tbody aria-hidden="true" data-state="loading">
              <For each={Array.from({ length: props.skeletonRows ?? 5 })}>
                {() => (
                  <tr>
                    <Show when={props.selectable}>
                      <td class="nc-table__check">
                        <Skeleton width="14px" />
                      </td>
                    </Show>
                    <For each={props.columns}>
                      {(_, i) => (
                        <td>
                          <Skeleton width={`${50 + ((i() * 17) % 40)}%`} />
                        </td>
                      )}
                    </For>
                  </tr>
                )}
              </For>
            </tbody>
          </Show>
          <Show when={showBody()}>
            <tbody>
              <For each={sorted()}>
                {(row, index) => {
                  const rowId = () => props.getRowId(row)
                  const isSelected = () => selectedSet().has(rowId())
                  // A long press on a touch screen opens the row's menu, as a right click does; moving the finger
                  // then lifts the row into a drag, and the menu goes.
                  let lastDown: PointerEvent | undefined
                  const press = createRowSwipe({
                    element: () => undefined,
                    leading: () => 0,
                    trailing: () => 0,
                    menu: () => phone() || touchScreen(),
                    onLongPress: (at) => {
                      openMenu(row, at)
                      if (reorderable() && lastDown)
                        reorder.pointerDown(lastDown, index(), { held: true, onLift: () => setMenu(null) })
                    },
                  })
                  const heading = () => {
                    const g = props.groupOf?.(row)
                    if (!g) return null
                    const before = index() > 0 ? props.groupOf?.(sorted()[index() - 1] as T) : undefined
                    return before?.key === g.key ? null : g
                  }
                  return (
                    <>
                      <Show when={heading()}>
                        {(g) => (
                          <tr class="nc-table__group" data-part="table-group" data-group={g().key}>
                            <th scope="rowgroup" colspan={props.columns.length + (props.selectable ? 1 : 0)}>
                              {g().label}
                            </th>
                          </tr>
                        )}
                      </Show>
                      <tr
                        aria-selected={props.selectable ? aria(isSelected()) : undefined}
                        data-row-id={rowId()}
                        data-index={index()}
                        data-grabbed={
                          reorder.mode() === "keyboard" && reorder.active() === index() ? "" : undefined
                        }
                        tabindex={tabStop() === rowId() ? 0 : -1}
                        class={cx((props.onRowClick || props.selectable) && "nc-table__row--clickable")}
                        onFocus={() => setFocusId(rowId())}
                        onMouseDown={(e) => {
                          // A Shift or Cmd click selects rows, not the text between them.
                          if (props.selectable && (e.shiftKey || e.metaKey || e.ctrlKey)) e.preventDefault()
                        }}
                        onKeyDown={(e) => onRowKeyDown(e, row, index())}
                        onContextMenu={(e) => {
                          if ((e.target as HTMLElement).closest("input, textarea, [contenteditable=true]"))
                            return
                          if (openMenu(row, { x: e.clientX, y: e.clientY })) e.preventDefault()
                        }}
                        {...press.handlers}
                        onPointerDown={(e) => {
                          lastDown = e
                          press.handlers.onPointerDown(e)
                          // A mouse drags the row itself: a press that moves lifts it, one that does not is a click.
                          if (
                            reorderable() &&
                            (e.pointerType === "mouse" || (e.pointerType === "pen" && !touchScreen())) &&
                            !(e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) &&
                            startsRowDrag(e.target as Element, e.currentTarget)
                          )
                            reorder.pointerDown(e, index())
                        }}
                        onClick={(e) => {
                          if (press.swallowClick(e)) return
                          if (cameFrom(e, "button, a, input, label", e.currentTarget)) return
                          setFocusId(rowId())
                          if (props.selectable && selection.click(rowId(), e, Boolean(props.onRowClick)))
                            return
                          props.onRowClick?.(row)
                        }}
                      >
                        <Show when={props.selectable}>
                          <td class="nc-table__check">
                            <Checkbox
                              tabindex={-1}
                              aria-label={`Select ${nameOf(row)}`}
                              checked={isSelected()}
                              onClick={(e: MouseEvent) => {
                                e.preventDefault()
                                selection.select(e.shiftKey ? "range" : "toggle", rowId())
                              }}
                            />
                          </td>
                        </Show>
                        <For each={props.columns}>
                          {(column) => (
                            <td
                              class={cx(
                                column.type === "mono" && "nc-mono nc-muted",
                                (column.type === "num" || column.type === "time") && "is-num",
                                column.type === "time" && "nc-table__time",
                              )}
                            >
                              <Cell column={column} row={row} index={index()} />
                            </td>
                          )}
                        </For>
                      </tr>
                    </>
                  )
                }}
              </For>
            </tbody>
          </Show>
        </table>
        <Show when={reorder.line() !== null}>
          <div class="nc-datatable__drop" data-part="drop-line" style={{ top: `${reorder.line()}px` }} />
        </Show>
      </div>
      <Switch>
        <Match when={props.error}>
          {(error) => (
            <div class="nc-datatable__state nc-datatable__state--error" role="alert" data-state="error">
              <Show when={error().code}>
                <CodeBadge>{error().code}</CodeBadge>
              </Show>
              <span class="nc-empty__title label">{error().message}</span>
              <Show when={error().detail}>
                <span class="nc-empty__desc nc-meta">{error().detail}</span>
              </Show>
              <Show when={error().onRetry}>
                <Button size="sm" onClick={() => error().onRetry?.()}>
                  Retry
                </Button>
              </Show>
            </div>
          )}
        </Match>
        <Match when={!props.loading && props.rows.length === 0 && props.empty}>
          <EmptyState
            class="nc-datatable__state"
            data-state="empty"
            icon="filter"
            title={props.empty?.title}
            description={props.empty?.description}
          >
            <Show when={props.empty?.onClearFilters}>
              <Button size="sm" onClick={() => props.empty?.onClearFilters?.()}>
                Clear filters
              </Button>
            </Show>
          </EmptyState>
        </Match>
      </Switch>
      <Show when={props.footer}>
        <div class="nc-datatable__footer" data-part="table-footer">
          {props.footer}
        </div>
      </Show>
      <Show when={menu()} keyed>
        {(m) => (
          <RowMenu
            at={m.at}
            phone={phone()}
            label={props.label}
            items={m.entries as MenuEntry[]}
            origin={rootEl}
            returnFocus={() =>
              scrollEl.querySelector<HTMLElement>(`tr[data-row-id="${CSS.escape(m.rowId)}"]`) ?? undefined
            }
            onClose={() => setMenu(null)}
            onSelect={(choice) => {
              const run = m.run
              setMenu(null)
              run(choice)
            }}
          />
        )}
      </Show>
      <div class="nc-visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {said()}
      </div>
    </div>
  )
}

function Cell<T>(props: { column: DataColumn<T>; row: T; index: number }): JSX.Element {
  const content = () => {
    if (props.column.cell) return props.column.cell(props.row, props.index)
    const value = props.column.accessor?.(props.row)
    if (value === null || value === undefined || value === "") return <span class="nc-null">—</span>
    return String(value)
  }
  return <>{content()}</>
}
