import type { JSX } from "@solidjs/web"
import { createMemo, createSignal, For, omit, onCleanup, Show, untrack } from "solid-js"
import { aria } from "../lib/aria"
import { caretAt } from "../lib/caret"
import { cx } from "../lib/cx"
import { cameFrom } from "../lib/events"
import { activeElement } from "../lib/focus"
import { usePhone } from "../lib/phone"
import { createReorder, reorderItems, startsRowDrag } from "../lib/reorder"
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
import { Icon } from "./Icon"
import { RowMenu, SWIPE_ACTION_WIDTH, SwipeButton } from "./InsetList"
import type { MenuEntry } from "./Menu"
import { entriesFromButtons, removalToast, SelectionBar } from "./rows"
import { Checkbox } from "./Switch"

export interface DataListInputProps
  extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "value" | "onInput" | "onChange"> {
  value: string
  /** Every keystroke: the list's value changes as it is typed, like any form field. */
  onInput: (value: string) => void
  /** Accessible name ("Tag 2", "Name of NODE_ENV"). */
  label: string
  /** An ID, a path, a URL or a variable: monospaced. */
  mono?: boolean
  /** Marks the field invalid (its row says why). */
  invalid?: boolean
}

/**
 * A field of a `DataList` row: text at rest, the row's hover fill, the edge and focus ring while typing, like an
 * `InlineField`. `fields` makes them; use it in a row of your own (`children`) for anything else.
 */
export function DataListInput(props: DataListInputProps): JSX.Element {
  const rest = omit(props, "value", "onInput", "label", "mono", "invalid", "class")
  return (
    <input
      data-part="data-list-input"
      class={cx(
        "nc-inline-field",
        props.mono ? "nc-inline-field--mono" : "nc-inline-field--text",
        props.class,
      )}
      aria-label={props.label}
      aria-invalid={props.invalid ? "true" : undefined}
      value={props.value}
      spellcheck={props.mono ? "false" : "true"}
      autocomplete="off"
      onInput={(e) => props.onInput(e.currentTarget.value)}
      {...rest}
    />
  )
}

/** One field of a record: a column of the list. */
export interface DataListField<T> {
  /** Stable id. */
  id: string
  /** The column's header, and the start of each field's accessible name ("Name of NODE_ENV"). */
  label: string
  /** The field's text. */
  value: (item: T) => string
  /** The item with the field changed to `value` (as typed: clean it up here, such as upper case for a name). */
  set: (item: T, value: string) => T
  placeholder?: string
  /** Monospaced: IDs, paths, URLs, variable names. */
  mono?: boolean
  /** The column's width as a grid track, such as `12rem` or `minmax(0, 2fr)`. Default `minmax(0, 1fr)`. */
  width?: string
}

/** What a `DataList`'s `rowMenu` is given: the rows the menu acts on. */
export interface DataListMenuContext<T> {
  /** The items, in list order: the selection, or the row alone. */
  items: T[]
  /** Their indices in `value`. */
  indices: number[]
}

export interface DataListProps<T> {
  /** What the list is ("Tags", "Environment"): the group's accessible name and the start of each row's name. */
  label: string
  /** The records. */
  value: readonly T[]
  /** The new list, after an edit, an addition, a removal or a move. */
  onChange: (next: T[]) => void
  /** A new item for the add row. Default an empty string. */
  create?: () => T
  /**
   * The fields of a record, one column each (a variable's name and value). Default one field for an item that is a
   * string (tags, URLs).
   */
  fields?: DataListField<T>[]
  /** Or the fields of one row, laid out by you: `DataListInput`s in one cell. */
  children?: (item: () => T, set: (next: T) => void, index: number) => JSX.Element
  /** A stable key for an item, so selection follows rows that move. Default: the list keeps one per row itself. */
  getKey?: (item: T, index: number) => string | number
  /** Placeholder of the default field. */
  placeholder?: string
  /** The default field is monospaced (URLs, paths, IDs). */
  mono?: boolean
  /** What one item is ("Tag", "Variable"): the add row says "Add tag", and row 2 is "Tag 2". */
  itemName?: string
  /** The add row's label. Default "Add <itemName>", or "Add". */
  addLabel?: string
  /** What item `index` is called in its controls and announcements. Default "<itemName> <n>". */
  itemLabel?: (item: T, index: number) => string
  /** At most this many items: the add row goes at the limit. */
  max?: number
  /**
   * Rows can be dragged into another order by the row itself, outside its fields (on a touch screen, a move after
   * the long press that opens its menu), or moved with Alt and an arrow. Default true.
   */
  reorderable?: boolean
  /**
   * Rows can be removed: Delete on a focused row, Delete in its context menu, Backspace in an empty row, a swipe to
   * the left on a touch screen. Default true.
   */
  removable?: boolean
  /** What is wrong with an item, said under its row. */
  invalid?: (item: T, index: number) => string | undefined
  /**
   * Rows can be selected, as in a `DataTable`: the checkbox at a row's start (shown on hover and focus, and on
   * every row while something is selected; Shift for a range), a click on the row outside its fields (Cmd or Ctrl
   * toggles, Shift extends), and on a focused row Space, Shift and an arrow, Cmd or Ctrl+A, and Escape. While something is selected a bar at the list's foot shows the count, `bulkActions`
   * and Delete.
   */
  selectable?: boolean
  /** The selected rows' indices changed. */
  onSelectedChange?: (indices: number[]) => void
  /** Actions for the selected items, in the selection bar (`Button size="sm" variant="ghost"`). */
  bulkActions?: (items: T[], indices: number[]) => JSX.Element
  /**
   * The context menu of a row, or of the selection (a right click, the Menu key or Shift+F10, or on a touch screen
   * a finger held on the row outside its fields). A row in a selection of several opens it for the selection; any other row is
   * selected alone first. An entry runs its own `onSelect`, or `onRowMenuSelect`; without either, `delete` is the
   * list's own removal (with Undo). Default: Delete, and for a selection the bar's actions and "Delete 3".
   */
  rowMenu?: (target: DataListMenuContext<T>) => RowMenuEntry[]
  /** An entry of `rowMenu` without an `onSelect` was chosen. */
  onRowMenuSelect?: (id: string, target: DataListMenuContext<T>) => void
  /**
   * Where it sits. `boxed` (default): one field-like box, for a form. `inline`: no box, the rows on the content's
   * edge, for an inspector or a `PropertyList` value. `table`: a box with a header row of the fields' labels (and
   * the select-all checkbox), rows divided by hairlines: records edited as a table, such as a service's environment.
   */
  variant?: "boxed" | "inline" | "table"
  /** Row height in the `table` variant: 30px `compact` (default) or 36px `comfortable`. */
  density?: "compact" | "comfortable"
  class?: string
}

const FIELD = "input, textarea, select, [contenteditable=true]"
const isEmpty = (v: unknown): boolean =>
  v === "" || v === null || v === undefined || (typeof v === "object" && Object.values(v).every(isEmpty))

/**
 * A list of records edited in place: tags and URLs (one field), environment variables (a name and a value), any
 * record of a few short fields. Each row edits its fields inline; it selects, reorders, removes, adds and moves by
 * keyboard as a `DataTable` does, and its rows have a context menu. With a mouse a row at rest is one target: a
 * click selects it, a press drags it from anywhere, a double click edits the field under the pointer. A row is
 * removed from its menu, the Delete key or a swipe: it has no grip and no remove button. On touch a tap edits.
 *
 * In a field the keys are the caret's: Enter goes to the next row (from the last, adds one), Backspace in an empty
 * row removes it, Up and Down go to the same field of the row above or below, Alt and an arrow moves the row, and
 * Escape leaves the field for its row. On a row, Up and Down move between rows (Shift extends the selection),
 * Space selects, Enter or F2 edits, Delete removes, and the Menu key opens its menu. Its value changes as it is
 * typed, like any field.
 */
export function DataList<T = string>(props: DataListProps<T>): JSX.Element {
  const phone = usePhone()
  const touch = () => phone() || touchScreen()
  let root!: HTMLDivElement
  const [said, setSaid] = createSignal("")
  const announce = (text: string) => {
    setSaid("")
    queueMicrotask(() => setSaid(text))
  }
  const variant = () => props.variant ?? "boxed"
  const removable = () => props.removable !== false
  const reorderable = () => props.reorderable !== false && props.value.length > 1
  const nameOf = (i: number) =>
    props.itemLabel?.(props.value[i] as T, i) ?? `${props.itemName ?? props.label} ${i + 1}`
  const canAdd = () => props.max === undefined || props.value.length < props.max

  // ---- Keys: the list's own per row, so a selection follows a row it moves ----
  let nextId = 0
  let own: number[] = []
  const keys = createMemo<Array<string | number>>(() => {
    const value = props.value
    if (props.getKey) return value.map((item, i) => props.getKey?.(item, i) as string | number)
    untrack(() => {
      while (own.length < value.length) own.push(nextId++)
      if (own.length > value.length) own = own.slice(0, value.length)
    })
    return own.slice()
  })
  const change = (next: T[], ids?: number[]) => {
    if (ids && !props.getKey) own = ids
    props.onChange(next)
  }

  // ---- Selection ----
  const selection = createSelection<string | number>({
    keys,
    onChange: (next) => {
      const set = new Set(next)
      props.onSelectedChange?.(keys().flatMap((k, i) => (set.has(k) ? [i] : [])))
    },
    announce,
  })
  const selectedIndices = () => {
    const set = new Set(selection.selected())
    return keys().flatMap((k, i) => (set.has(k) ? [i] : []))
  }
  const selectable = () => Boolean(props.selectable)
  const allState = (): boolean | "mixed" => {
    const n = selection.count()
    return n === 0 ? false : n >= props.value.length ? true : "mixed"
  }

  // ---- Editing: with a mouse a row's fields take the pointer only while the row is being edited ----
  // A click selects the row and a press drags it from anywhere; a double click (or Enter, F2, Tab into a field)
  // edits, with the caret where it was clicked. On touch a tap edits, as there is no double tap convention.
  const [editing, setEditing] = createSignal<string | number | null>(null)
  const editRow = (i: number) => setEditing(keys()[i] ?? null)

  // ---- Rows and focus ----
  const rowAt = (i: number) =>
    root.querySelector<HTMLElement>(`.nc-datalist__row[data-index="${i}"]`) ?? undefined
  const fieldsOf = (i: number) => [...(rowAt(i)?.querySelectorAll<HTMLElement>(FIELD) ?? [])]
  const focusField = (i: number, column = 0, at: "start" | "end" | "keep" = "keep") => {
    editRow(i)
    queueMicrotask(() => {
      const fields = fieldsOf(i)
      const el = (fields[column] ?? fields[0]) as HTMLInputElement | undefined
      if (!el) return
      el.focus()
      if (at !== "keep" && typeof el.setSelectionRange === "function") {
        const n = at === "end" ? el.value.length : 0
        el.setSelectionRange(n, n)
      }
    })
  }
  const focusRow = (i: number) => queueMicrotask(() => rowAt(i)?.focus())

  // ---- Changes ----
  const set = (i: number, next: T) => {
    const out = props.value.slice()
    out[i] = next
    change(out)
  }
  const add = () => {
    if (!canAdd()) return
    const at = props.value.length
    change([...props.value, props.create ? props.create() : ("" as T)])
    focusField(at)
  }
  /** Remove rows; focus goes to the row that took the first one's place, or as asked. */
  const removeIndices = (gone: number[], focus: "prev" | "next" | "row" | "none" = "none") => {
    if (!removable() || !gone.length) return
    const before = props.value.slice()
    const beforeIds = own.slice()
    const drop = new Set(gone)
    const first = Math.min(...gone)
    const name =
      gone.length === 1 ? nameOf(first) : `${gone.length} ${(props.itemName ?? "item").toLowerCase()}s`
    const hadFocus = root.contains(activeElement())
    const keep = (_: unknown, i: number) => !drop.has(i)
    const removedKeys = new Set(gone.map((i) => keys()[i]))
    change(props.value.filter(keep), own.filter(keep))
    if (selection.selected().some((k) => removedKeys.has(k)))
      selection.set(selection.selected().filter((k) => !removedKeys.has(k)))
    announce(`Removed ${name}.`)
    // An empty row goes without a word; anything else can be put back.
    if (!gone.every((i) => isEmpty(before[i])))
      removalToast(
        gone.length === 1 ? name : `${(props.itemName ?? "item").toLowerCase()}s`,
        gone.length,
        () => change(before, beforeIds),
      )
    const n = props.value.length
    if (focus === "none" && !hadFocus) return
    if (n <= 0) return queueMicrotask(() => root.querySelector<HTMLElement>(".nc-datalist__add")?.focus())
    const to = focus === "prev" ? Math.max(0, first - 1) : Math.min(n - 1, first)
    if (focus === "prev" || focus === "next") focusField(to, 0, "end")
    else focusRow(to)
  }
  /** The rows a removal at row `i` takes: the selection when the row is in it. */
  const removalAt = (i: number) => {
    const key = keys()[i]
    const sel = selectedIndices()
    return key !== undefined && selection.isSelected(key) && sel.length > 1 ? sel : [i]
  }
  const move = (from: number, to: number) =>
    change(reorderItems(props.value, from, to), reorderItems(own, from, to))
  const reorder = createReorder({
    count: () => props.value.length,
    container: () => root,
    rowAt,
    onReorder: move,
    name: nameOf,
    announce,
    refocus: (i) => focusRow(i),
    reveal: (i) => rowAt(i)?.scrollIntoView?.({ block: "nearest" }),
  })

  // ---- Context menu ----
  const [menu, setMenu] = createSignal<{
    at: { x: number; y: number }
    entries: RowMenuEntry[]
    run: (id: string) => void
    row: number
  } | null>(null)
  const openMenu = (i: number, at: { x: number; y: number }) => {
    const key = keys()[i]
    if (key === undefined) return false
    const target = menuTarget(keys(), selection.selected(), key, selectable())
    if (target.reselect) selection.select("only", key)
    const set = new Set(target.keys)
    const indices = keys().flatMap((k, n) => (set.has(k) ? [n] : []))
    const context: DataListMenuContext<T> = { indices, items: indices.map((n) => props.value[n] as T) }
    let entries: RowMenuEntry[]
    let run: (id: string) => void
    if (props.rowMenu) {
      entries = props.rowMenu(context)
      run = (id) => {
        const entry = entryById(entries, id)
        if (entry?.onSelect) entry.onSelect()
        else if (id === "delete" && removable() && !props.onRowMenuSelect) removeIndices(indices, "row")
        else props.onRowMenuSelect?.(id, context)
      }
    } else {
      const many = indices.length > 1
      entries = defaultRowMenu({
        count: indices.length,
        actions: many ? entriesFromButtons(root.querySelector("[data-bulk-actions]")) : [],
        remove: removable(),
      })
      run = (id) => (id === "delete" ? removeIndices(indices, "row") : entryById(entries, id)?.onSelect?.())
    }
    if (!hasItems(entries)) return false
    setMenu({ at, entries, run, row: i })
    return true
  }

  // ---- Keyboard ----
  // The cursor moved from row `from` to `to`: Shift extends the selection to it; the cursor is the next anchor.
  const moveCursor = (from: number, to: number, extend: boolean) => {
    const a = keys()[from]
    const b = keys()[to]
    if (!selectable() || a === undefined || b === undefined) return
    if (extend) selection.extend(a, b)
    else selection.setAnchor(b)
  }
  const onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    const row = target.closest<HTMLElement>(".nc-datalist__row")
    if (!row || row.closest("[data-part=data-list]") !== root) return
    const i = Number(row.dataset.index)
    const key = keys()[i]
    const handled = () => {
      e.preventDefault()
      e.stopPropagation()
    }
    if (isMenuKey(e)) {
      handled()
      openMenu(i, keyboardMenuPoint(row))
      return
    }
    // ---- In a field: the caret's keys ----
    if (target.matches(FIELD)) {
      const input = target as HTMLInputElement
      const column = fieldsOf(i).indexOf(target)
      if ((e.key === "ArrowUp" || e.key === "ArrowDown") && e.altKey) {
        handled()
        if (!reorderable()) return
        const to = i + (e.key === "ArrowDown" ? 1 : -1)
        if (to < 0 || to >= props.value.length) return
        reorder.nudge(i, to - i)
        focusField(to, column)
      } else if ((e.key === "ArrowUp" || e.key === "ArrowDown") && !e.shiftKey) {
        const to = i + (e.key === "ArrowDown" ? 1 : -1)
        if (to < 0 || to >= props.value.length) return
        handled()
        focusField(to, column, "end")
      } else if (e.key === "Enter" && !e.isComposing) {
        handled()
        if (i < props.value.length - 1) focusField(i + 1, column, "end")
        else if (input.value.trim() !== "") add()
      } else if (
        e.key === "Backspace" &&
        removable() &&
        input.value === "" &&
        input.selectionStart === 0 &&
        fieldsOf(i).every((f) => (f as HTMLInputElement).value === "")
      ) {
        handled()
        removeIndices([i], i > 0 ? "prev" : "next")
      } else if (e.key === "Escape" && !e.isComposing) {
        handled()
        row.focus()
      }
      return
    }
    if (target !== row) return
    // ---- On a row: the list's keys ----
    const gesture = selectionKey(e)
    if (gesture && selectable() && key !== undefined) {
      if (gesture === "none" && !selection.count()) return
      handled()
      return selection.select(gesture, key)
    }
    switch (e.key) {
      case "ArrowUp":
      case "ArrowDown": {
        const to = i + (e.key === "ArrowDown" ? 1 : -1)
        handled()
        if (e.altKey) {
          if (reorderable() && to >= 0 && to < props.value.length) {
            reorder.nudge(i, to - i)
            focusRow(to)
          }
          return
        }
        if (to < 0 || to >= props.value.length) return
        focusRow(to)
        moveCursor(i, to, e.shiftKey)
        return
      }
      case "Home":
      case "End": {
        handled()
        const to = e.key === "Home" ? 0 : props.value.length - 1
        focusRow(to)
        moveCursor(i, to, e.shiftKey)
        return
      }
      case "Enter":
      case "F2":
        handled()
        return focusField(i, 0, "end")
      case "Delete":
      case "Backspace":
        if (!removable()) return
        handled()
        return removeIndices(removalAt(i), "row")
    }
  }

  const onRowClick = (e: MouseEvent, i: number) => {
    if (cameFrom(e, `${FIELD}, button, a, label`, e.currentTarget)) return
    const key = keys()[i]
    rowAt(i)?.focus()
    if (selectable() && key !== undefined) selection.click(key, e)
  }
  /** A double click edits the field under the pointer, with the caret at the clicked character. */
  const onRowDblClick = (e: MouseEvent, i: number) => {
    if (touch() || editing() === keys()[i]) return
    const fields = fieldsOf(i) as HTMLInputElement[]
    if (!fields.length) return
    const hit =
      fields.find((f) => {
        const r = f.getBoundingClientRect()
        return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
      }) ??
      fields.find((f) => {
        const r = f.getBoundingClientRect()
        return e.clientX >= r.left && e.clientX <= r.right
      }) ??
      fields[0]!
    editRow(i)
    hit.focus()
    if (typeof hit.setSelectionRange === "function" && hit.tagName === "INPUT") {
      const n = caretAt(hit, e.clientX)
      hit.setSelectionRange(n, n)
    }
  }
  const onFocusIn = (e: FocusEvent) => {
    const target = e.target as HTMLElement
    if (!target.matches(FIELD)) return
    const row = target.closest<HTMLElement>(".nc-datalist__row")
    if (row?.dataset.index !== undefined && row.closest("[data-part=data-list]") === root)
      editRow(Number(row.dataset.index))
  }
  const onFocusOut = () =>
    queueMicrotask(() => {
      const now = activeElement()
      if (!(now instanceof HTMLElement && root.contains(now) && now.matches(FIELD))) setEditing(null)
    })
  const onContextMenu = (e: MouseEvent, i: number) => {
    // A field with text selected keeps the browser's menu, to copy and paste.
    const field = (e.target as HTMLElement).closest(FIELD) as HTMLInputElement | null
    if (field && typeof field.selectionStart === "number" && field.selectionStart !== field.selectionEnd)
      return
    if (openMenu(i, { x: e.clientX, y: e.clientY })) e.preventDefault()
  }

  const tracks = () => {
    const f = props.fields
    const cells = f?.length
      ? f.map((x, n) => `[${n === 0 ? "fields " : ""}f${x.id}] ${x.width ?? "minmax(0, 1fr)"}`).join(" ")
      : "[fields] minmax(0, 1fr)"
    return `[check] auto ${cells} [end]`
  }
  const header = () => variant() === "table" && (Boolean(props.fields?.length) || selectable())

  return (
    <div
      ref={root}
      data-part="data-list"
      role="group"
      aria-label={props.label}
      data-variant={variant()}
      data-density={props.density ?? "compact"}
      data-selecting={selectable() && selection.count() > 0 ? "" : undefined}
      data-touch={touch() ? "" : undefined}
      class={cx(
        "nc-datalist",
        `nc-datalist--${variant()}`,
        reorder.mode() !== null && "nc-datalist--reordering",
        reorderable() && "nc-datalist--movable",
        props.class,
      )}
      style={{ "--nc-datalist-cols": tracks() }}
      onKeyDown={onKeyDown}
      onFocusIn={onFocusIn}
      onFocusOut={onFocusOut}
    >
      <div role="list" class="nc-datalist__list">
        <Show when={header()}>
          <div class="nc-datalist__head" aria-hidden={selectable() ? undefined : "true"}>
            <Show when={selectable() && !phone()}>
              <span class="nc-datalist__check">
                <Checkbox
                  aria-label="Select all rows"
                  checked={allState()}
                  disabled={props.value.length === 0}
                  onChange={() => selection.select(allState() === true ? "none" : "all")}
                />
              </span>
            </Show>
            <For each={props.fields ?? []}>
              {(f) => (
                <span class="nc-datalist__th" style={{ "grid-column": `f${f.id}` }}>
                  {f.label}
                </span>
              )}
            </For>
          </div>
        </Show>
        <For keyed={false} each={props.value}>
          {(item, i) => {
            const error = () => props.invalid?.(item(), i)
            const key = () => keys()[i]
            const selected = () => {
              const k = key()
              return k !== undefined && selection.isSelected(k)
            }
            let rowEl!: HTMLDivElement
            let lastDown: PointerEvent | undefined
            let onField = false
            // On a touch screen a swipe to the left shows Delete; a long press opens the row's menu, and moving
            // the finger then lifts the row into a drag and the menu goes.
            const swipe = createRowSwipe({
              element: () => rowEl,
              leading: () => 0,
              trailing: () => (touch() && removable() ? SWIPE_ACTION_WIDTH : 0),
              onFull: () => removeIndices([i]),
              accepts: (e) => e.pointerType !== "mouse",
              // A finger held on a field selects its text; elsewhere on the row it opens the menu.
              menu: () => touch() && !onField,
              onLongPress: (at) => {
                openMenu(i, at)
                if (reorderable() && lastDown)
                  reorder.pointerDown(lastDown, i, { held: true, onLift: () => setMenu(null) })
              },
            })
            onCleanup(() => {
              if (menu()?.row === i) setMenu(null)
            })
            return (
              <div
                ref={rowEl}
                role="listitem"
                class="nc-datalist__row"
                data-index={i}
                data-selected={selected() ? "" : undefined}
                data-editing={editing() !== null && editing() === key() ? "" : undefined}
                data-invalid={error() ? "" : undefined}
                data-grabbed={reorder.mode() === "keyboard" && reorder.active() === i ? "" : undefined}
                data-swipe={swipe.offset() !== 0 ? "" : undefined}
                data-dragging={swipe.dragging() ? "" : undefined}
                style={swipe.offset() !== 0 ? { "--nc-swipe": `${swipe.offset()}px` } : undefined}
                aria-label={nameOf(i)}
                aria-selected={selectable() ? aria(selected()) : undefined}
                tabindex={-1}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest(".nc-datalist__tray")) return
                  if (swipe.swallowClick(e)) return
                  onRowClick(e, i)
                }}
                onDblClick={(e) => onRowDblClick(e, i)}
                onMouseDown={(e) => {
                  // A double click on a row at rest edits it; it does not select a word of the page.
                  if (e.detail > 1 && editing() !== key() && !touch()) e.preventDefault()
                  // A Shift or Cmd click on the row's edge selects rows, not the text between them.
                  if (
                    selectable() &&
                    (e.shiftKey || e.metaKey || e.ctrlKey) &&
                    !(e.target as HTMLElement).closest(FIELD)
                  )
                    e.preventDefault()
                }}
                onContextMenu={(e) => onContextMenu(e, i)}
                onPointerDown={(e) => {
                  lastDown = e
                  onField = Boolean((e.target as HTMLElement).closest(FIELD))
                  if (!(e.target as HTMLElement).closest("button")) swipe.handlers.onPointerDown(e)
                  // A mouse drags the row by anything but its fields and controls.
                  if (
                    reorderable() &&
                    (e.pointerType === "mouse" || (e.pointerType === "pen" && !touch())) &&
                    !(e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) &&
                    startsRowDrag(e.target as Element, rowEl)
                  )
                    reorder.pointerDown(e, i)
                }}
                onPointerMove={swipe.handlers.onPointerMove}
                onPointerUp={swipe.handlers.onPointerUp}
                onPointerCancel={swipe.handlers.onPointerCancel}
              >
                <Show when={selectable() && !phone()}>
                  <span class="nc-datalist__check">
                    <Checkbox
                      tabindex={-1}
                      aria-label={`Select ${nameOf(i)}`}
                      checked={selected()}
                      onClick={(e: MouseEvent) => {
                        const k = key()
                        if (k === undefined) return
                        e.preventDefault()
                        selection.select(e.shiftKey ? "range" : "toggle", k)
                      }}
                    />
                  </span>
                </Show>
                <Show when={phone() && selectable()}>
                  <span class="nc-datalist__check">
                    <Checkbox
                      aria-label={`Select ${nameOf(i)}`}
                      checked={selected()}
                      onChange={() => {
                        const k = key()
                        if (k !== undefined) selection.select("toggle", k)
                      }}
                    />
                  </span>
                </Show>
                <Show
                  when={props.fields?.length}
                  fallback={
                    <div class="nc-datalist__fields">
                      <Show
                        when={props.children}
                        fallback={
                          <DataListInput
                            value={item() as unknown as string}
                            onInput={(v) => set(i, v as unknown as T)}
                            label={nameOf(i)}
                            placeholder={props.placeholder}
                            mono={props.mono}
                            invalid={Boolean(error())}
                          />
                        }
                      >
                        {props.children?.(item, (next) => set(i, next), i)}
                      </Show>
                    </div>
                  }
                >
                  <For each={props.fields}>
                    {(f) => (
                      <div class="nc-datalist__cell" style={{ "grid-column": `f${f.id}` }}>
                        <DataListInput
                          value={f.value(item())}
                          onInput={(v) => set(i, f.set(item(), v))}
                          label={`${f.label} of ${nameOf(i)}`}
                          placeholder={f.placeholder}
                          mono={f.mono}
                          invalid={Boolean(error())}
                        />
                      </div>
                    )}
                  </For>
                </Show>
                <Show when={error()}>
                  <span class="nc-datalist__error">{error()}</span>
                </Show>
                <Show when={touch() && removable()}>
                  <div
                    class="nc-lrow__tray nc-lrow__tray--trailing nc-datalist__tray"
                    style={{ width: `${Math.max(-swipe.offset(), 0)}px` }}
                  >
                    <SwipeButton
                      action={{
                        id: "delete",
                        label: "Delete",
                        icon: "trash",
                        tone: "danger",
                        onAction: () => removeIndices([i]),
                      }}
                      close={() => swipe.setOpen(null)}
                    />
                  </div>
                </Show>
              </div>
            )
          }}
        </For>
        <Show when={canAdd()}>
          <div role="listitem" class="nc-datalist__row nc-datalist__row--add">
            <button type="button" class="nc-datalist__add" onClick={add}>
              <Icon name="plus" size="sm" />
              <span>
                {props.addLabel ?? (props.itemName ? `Add ${props.itemName.toLowerCase()}` : "Add")}
              </span>
            </button>
          </div>
        </Show>
      </div>
      <Show when={reorder.line() !== null}>
        <div class="nc-datalist__drop" data-part="drop-line" style={{ top: `${reorder.line()}px` }} />
      </Show>
      <Show when={selectable() && selection.count() > 0}>
        <SelectionBar
          class="nc-datalist__bulk"
          count={selection.count()}
          total={props.value.length}
          phone={phone()}
          onSelectAll={() => selection.select("all")}
          onClear={() => selection.select("none")}
          onDelete={removable() ? () => removeIndices(selectedIndices()) : undefined}
          actions={props.bulkActions?.(
            selectedIndices().map((n) => props.value[n] as T),
            selectedIndices(),
          )}
        />
      </Show>
      <Show when={menu()} keyed>
        {(m) => (
          <RowMenu
            at={m.at}
            phone={phone()}
            label={nameOf(m.row)}
            items={m.entries as MenuEntry[]}
            origin={root}
            returnFocus={() => rowAt(m.row)}
            onClose={() => setMenu(null)}
            onSelect={(id) => {
              const run = m.run
              setMenu(null)
              run(id)
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
