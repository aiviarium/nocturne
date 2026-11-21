import type { JSX } from "@solidjs/web"
import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  For,
  omit,
  onCleanup,
  onSettled,
  Show,
  untrack,
  useContext,
} from "solid-js"
import { aria } from "../lib/aria"
import { createControllable } from "../lib/controllable"
import { cx } from "../lib/cx"
import { activeElement } from "../lib/focus"
import { createId } from "../lib/id"
import { callClick, useLinkClick } from "../lib/link"
import { usePhone } from "../lib/phone"
import { createReorder, type ReorderControl, startsRowDrag } from "../lib/reorder"
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
import { Icon, type IconName, type LucideNode } from "./Icon"
import { InlineField } from "./InlineField"
import { RowMenu, SWIPE_ACTION_WIDTH, type SwipeAction, SwipeButton } from "./InsetList"
import { List } from "./List"
import type { MenuEntry } from "./Menu"
import { entriesFromButtons, removalToast, SelectionBar } from "./rows"
import { Checkbox } from "./Switch"
import { titleOf } from "./Truncate"

export type RowDensity = "compact" | "comfortable"

/**
 * Where a `RowList` sits. `plain`: on its own in a view or a sidebar, inset 6px so selection is an inset fill.
 * `inset`: inside a padded container (a `Card`, a `Panel`, an inspector's section), wherever it is in it: the rows
 * hang into the container's padding, so their text is on the container's text edge and their fill 6px from its
 * edge. `inline`: among other content (a `PropertyList` value, a form, under a paragraph): the text is on the
 * content's edge, the fill hangs 6px past it, and rows are 28px like the property rows around them. `boxed`: a
 * group of its own with an edge, rows divided by hairlines and filled to the edge, for a list set into a card's
 * content or a form.
 */
export type RowListVariant = "plain" | "inset" | "inline" | "boxed"

/** The key of a `RowList` item, from `getKey`. */
export type RowKey = string | number

/** A row registered with its list: the list moves focus between them and finds their keys. */
interface RowEntry {
  el: () => HTMLElement | undefined
  focus: () => void
  index: () => number | undefined
  key: () => RowKey | undefined
  depth: () => number
  interactive: () => boolean
  /** Start renaming; false when the row cannot be renamed. */
  rename: () => boolean
  expanded: () => boolean | undefined
  setExpanded: (open: boolean) => void
  /** Open the row's context menu at this point. */
  openMenu: (at: { x: number; y: number }) => void
}

/** A menu ready to show: its entries and what choosing one does. */
interface ResolvedMenu {
  entries: RowMenuEntry[]
  run: (id: string) => void
}

/** What a `RowList`'s `rowMenu` is given: the rows the menu acts on. */
export interface RowMenuContext<T> {
  /** The items, in list order: the selection, or the row alone. */
  items: T[]
  keys: RowKey[]
}

/** What a `RowList` tells its rows. */
interface RowListContext {
  density: () => RowDensity | undefined
  tree: () => boolean
  addBranch: () => () => void
  editing: () => boolean
  selectable: () => boolean
  isSelected: (key: RowKey) => boolean
  /**
   * A click on a row's main control; `activates` when the row opens something. True when it was a selection
   * gesture that must not open the row.
   */
  click: (index: number, key: RowKey, e: MouseEvent, activates: boolean) => boolean
  toggle: (index: number, key: RowKey) => void
  reorderable: () => boolean
  reorder: ReorderControl
  removable: () => boolean
  remove: (index: number) => void
  /** Focus the row of item `index` (after it was re-created). */
  focusIndex: (index: number) => void
  /**
   * The menu of the row with `key`, which the list decides: for a selection of several the list's menu, for one
   * row the list's `rowMenu` or else `own` (the row's own menu, or the one built from its actions). It selects the
   * row alone first when it is not part of the selection.
   */
  menuFor: (key: RowKey, own: () => ResolvedMenu) => ResolvedMenu
  /** The list gives its rows a menu (`rowMenu`), so every row has one. */
  hasRowMenu: () => boolean
  register: (entry: RowEntry) => () => void
  tabStop: (entry: RowEntry) => boolean
}
// `null` is "not inside one": in Solid 2 a default-less context throws instead of reading as undefined.
const RowListCtx = createContext<RowListContext | null>(null)
/** The item a row renders, in a `RowList` given `items`. */
const RowItem = createContext<{ index: () => number; key: RowKey } | null>(null)
/** How deep a row is in a tree of rows, inside the group of a parent row. */
const RowDepth = createContext<number | null>(null)

/** Inside a virtualised `RowList` the list is a listbox and each row its option, so a row is no list item. */
const InListbox = createContext(false)

export interface ListRowProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "title" | "onClick" | "children"> {
  /** What the row is. A string is cut with an ellipsis and its full text is the row's tooltip. */
  title: JSX.Element
  /**
   * Secondary text: the kind, a path, a preview. On a one-line row it follows the title in text-3 on the same
   * line and gives way first when the row is narrow; with `lines={2}` or more it is the second line.
   */
  secondary?: JSX.Element
  /** A third line for rows that carry more (a pull request's branch, checks and reviewers): a `MetaLine`. */
  detail?: JSX.Element
  /** A named icon at the start. */
  icon?: IconName
  /** Any other Lucide icon at the start, as a node. */
  iconNode?: LucideNode
  /** Leading content instead of an icon: an `Avatar`, a checkbox, a coloured dot. It is centred in the same box. */
  leading?: JSX.Element
  /**
   * Trailing metadata in text-3: a time, a count, an owner. In a `RowList` it is a column; on a row of two or
   * three lines it ends the first line.
   */
  meta?: JSX.Element
  /**
   * The row's state, as a `State` (dot plus word). At most one per row; see the guide for badges. In a `RowList`
   * it is a column, so the states of all rows line up; on a row of two or three lines it ends the second line,
   * under the time.
   */
  status?: JSX.Element
  /**
   * Contextual actions (`IconButton size="sm"`). With a mouse they show on hover, focus or selection. On a phone
   * or touch screen they take no width: a swipe to the left reveals them, and a long press lists them in a menu.
   */
  actions?: JSX.Element
  /** Actions that stay visible everywhere (answer controls that are the point of the row). */
  persistentActions?: JSX.Element
  /** Swipe actions revealed by dragging the row to the right on a touch screen; a full swipe runs the first. */
  leadingActions?: SwipeAction[]
  /**
   * Swipe actions revealed by dragging the row to the left on a touch screen; a full swipe runs the first. Without
   * them a left swipe reveals `actions`. In a list with `onRemove`, Delete comes first.
   */
  trailingActions?: SwipeAction[]
  /** The row's context menu: a right click, or a long press on a touch screen. Without it a long press lists `actions`. */
  menu?: MenuEntry[]
  /** Accessible name of the context menu. Default "Actions". */
  menuLabel?: string
  /** An entry of `menu` was chosen. */
  onMenuSelect?: (id: string) => void
  /**
   * `compact` 30px (default), `comfortable` 36px, from the row tokens. Multi-line rows grow with their lines.
   * Set it on the `RowList` for the whole list; a row's own value wins.
   */
  density?: RowDensity
  /** 1 (default), 2 or 3 lines. More than one puts the secondary text and the detail on their own lines. */
  lines?: 1 | 2 | 3
  /**
   * The open or chosen item: the inset fill. Sets `aria-selected` or, with `href`, `aria-current`. In a
   * `selectable` list the list's selection sets it.
   */
  selected?: boolean
  /**
   * Not seen yet: a bold title and an accent dot at the row's leading edge, inside its fill. A list that tracks
   * what was read passes `false` for the rows that were, so every row keeps the dot's place and marking a row
   * read or unread moves nothing.
   */
  unread?: boolean
  /** Dimmed text: done, read, archived. */
  muted?: boolean
  /**
   * In a `RowList` with `onReorder` every row can be dragged by itself (a press that moves, or on a touch screen a
   * move after the long press); `false` pins this one.
   */
  movable?: boolean
  /** Makes the row a link. */
  href?: string
  /** Makes the row a button (or runs alongside `href`). */
  onClick?: (e: MouseEvent) => void
  /** Accessible name of the row's main control, when the title is not plain text. */
  label?: string
  /**
   * Renames the row in place: F2 (or Enter, on a row that opens nothing), a double click (a click, on a row that
   * opens nothing), or Rename in its menu turns the title into an `InlineField`; Enter commits, Escape puts the
   * old title back. The title must be text.
   */
  onRename?: (title: string) => void
  /**
   * Rows nested under this one, in a tree: they are indented a level and shown while the row is expanded. Its
   * disclosure toggles them, and so do the Right and Left arrow keys.
   */
  children?: JSX.Element
  /** Whether the nested rows show. Controlled when set; for a flat list of a tree, set it with `depth`. */
  expanded?: boolean
  /** Whether the nested rows show at first, when `expanded` is not set. */
  defaultExpanded?: boolean
  /** The disclosure was toggled. */
  onExpandedChange?: (expanded: boolean) => void
  /**
   * How deep the row is in a tree (0 at the top), for a tree flattened into `items` (a long one, virtualised).
   * Rows nested as `children` take it from their parent.
   */
  depth?: number
}

/**
 * One row of a list: an optional leading icon or avatar in a fixed box, the title and secondary text, then
 * status, metadata and actions at the end. The whole row is one link or button (the actions sit above it), it
 * shows hover, the keyboard focus ring and selection as an inset rounded fill, and it takes the phone's row
 * height and type on a phone. Put rows in a `RowList`: its rows share their columns, so leading icons, titles,
 * states and times line up. The title is the cell that matters: it keeps the width of its longest title, up to 40% of the row, before the
 * trailing cells take their width, and the secondary text gives way first.
 */
export function ListRow(props: ListRowProps): JSX.Element {
  const rest = omit(
    props,
    "title",
    "secondary",
    "detail",
    "icon",
    "iconNode",
    "leading",
    "meta",
    "status",
    "actions",
    "persistentActions",
    "leadingActions",
    "trailingActions",
    "menu",
    "menuLabel",
    "onMenuSelect",
    "density",
    "lines",
    "selected",
    "unread",
    "muted",
    "movable",
    "href",
    "onClick",
    "label",
    "onRename",
    "children",
    "expanded",
    "defaultExpanded",
    "onExpandedChange",
    "depth",
    "class",
    "style",
  )
  const linkClick = useLinkClick()
  const inListbox = useContext(InListbox)
  const list = useContext(RowListCtx)
  const item = useContext(RowItem) ?? undefined
  const parentDepth = useContext(RowDepth) ?? undefined
  const phone = usePhone()
  const lines = () => props.lines ?? 1
  const titleText = () => titleOf(props.title)
  const secondaryText = () => titleOf(props.secondary)
  const tooltip = () => [titleText(), secondaryText()].filter(Boolean).join(" · ") || undefined
  // On a phone or a touch screen nothing is revealed by hover: contextual actions go to a swipe and a long press.
  const touch = () => phone() || touchScreen()

  // ---- What the list makes of the row ----
  const index = () => item?.index()
  const managed = () => Boolean(list && item)
  const selected = () =>
    props.selected ?? (managed() && list?.selectable() ? list.isSelected(item!.key) : undefined)
  const removable = () => managed() && Boolean(list?.removable())
  const reorderable = () => managed() && Boolean(list?.reorderable()) && props.movable !== false
  const editing = () => Boolean(list?.editing())
  const interactive = () => Boolean(props.href || props.onClick || (managed() && list?.selectable()))
  const remove = () => {
    const i = index()
    if (i !== undefined) list?.remove(i)
  }

  // ---- Tree ----
  const hasChildren = "children" in props
  const [expanded, setExpanded] = createControllable<boolean>({
    value: () => props.expanded,
    defaultValue: untrack(() => props.defaultExpanded ?? false),
    onChange: (v) => props.onExpandedChange?.(v),
  })
  const disclosure = () => hasChildren || props.expanded !== undefined || Boolean(props.onExpandedChange)
  const depth = () => props.depth ?? parentDepth ?? 0
  const branch = () =>
    disclosure() || props.depth !== undefined || parentDepth !== undefined || Boolean(list?.tree())
  if (hasChildren && list) onCleanup(list.addBranch())
  const groupId = createId("rows")

  // ---- Rename ----
  const [renaming, setRenaming] = createSignal(false)
  const startRename = () => {
    if (props.onRename) setRenaming(true)
  }

  // ---- Swipe and long press ----
  const trailing = (): SwipeAction[] => [
    ...(removable()
      ? [
          {
            id: "delete",
            label: "Delete",
            icon: "trash" as IconName,
            tone: "danger" as const,
            onAction: remove,
          },
        ]
      : []),
    ...(props.trailingActions ?? []),
  ]
  const tray = () => touch() && Boolean(props.actions) && !trailing().length

  let row!: HTMLDivElement
  let mainEl: HTMLElement | undefined
  let trayInner: HTMLDivElement | undefined
  let menuSource: HTMLDivElement | undefined
  let actionsEl: HTMLElement | undefined
  let lastDown: PointerEvent | undefined
  let holdClick = false
  const [menuAt, setMenuAt] = createSignal<{ x: number; y: number } | null>(null)
  const [shown, setShown] = createSignal<ResolvedMenu | null>(null)
  // The row's own menu: `menu`, or one built from its actions (what a hover shows), Rename and Delete, with Open
  // first on a row that opens something. Read from the buttons when it opens, so it is what the row shows now.
  const ownMenu = (): ResolvedMenu => {
    if (props.menu?.length)
      return {
        entries: props.menu as RowMenuEntry[],
        run: (id) => {
          const own = entryById(props.menu as RowMenuEntry[], id)
          if (own?.onSelect) own.onSelect()
          else props.onMenuSelect?.(id)
        },
      }
    const entries = defaultRowMenu({
      count: 1,
      open: Boolean(props.href || props.onClick),
      actions: entriesFromButtons(trayInner ?? menuSource ?? actionsEl),
      rename: Boolean(props.onRename),
      remove: removable(),
    })
    return {
      // A row that only opens keeps the browser's own menu (open in a new tab, copy the link).
      entries: entries.some((e) => (e.type ?? "item") === "item" && (e as { id: string }).id !== "open")
        ? entries
        : [],
      run: (id) => {
        if (id === "open") mainEl?.click()
        else if (id === "rename") startRename()
        else if (id === "delete") remove()
        else entryById(entries, id)?.onSelect?.()
      },
    }
  }
  const hasMenu = () =>
    Boolean(props.menu?.length) ||
    Boolean(props.actions) ||
    Boolean(props.onRename) ||
    removable() ||
    Boolean(managed() && list?.hasRowMenu())
  const swipe = createRowSwipe({
    element: () => row,
    leading: () => (touch() ? (props.leadingActions?.length ?? 0) * SWIPE_ACTION_WIDTH : 0),
    trailing: () => {
      if (!touch()) return 0
      if (trailing().length) return trailing().length * SWIPE_ACTION_WIDTH
      return tray() ? (trayInner?.scrollWidth ?? 0) : 0
    },
    // A full swipe runs the first swipe action; the hover actions under the row only open, as nothing is first.
    onFull: (side) =>
      side === "trailing" && tray()
        ? swipe.setOpen("trailing")
        : (side === "leading" ? props.leadingActions : trailing())?.[0]?.onAction(),
    accepts: (e) => e.pointerType !== "mouse" || phone(),
    menu: () => touch() && (hasMenu() || reorderable()),
    onLongPress: (at) => {
      // As on iOS, a long press opens the row's menu; in a list that reorders, moving the finger then lifts the
      // row into a drag and the menu goes.
      const i = index()
      openMenu(at)
      if (reorderable() && lastDown && i !== undefined) {
        holdClick = true
        const release = () => {
          window.removeEventListener("pointerup", release)
          window.removeEventListener("pointercancel", release)
          setTimeout(() => (holdClick = false), 50)
        }
        window.addEventListener("pointerup", release)
        window.addEventListener("pointercancel", release)
        list?.reorder.pointerDown(lastDown, i, { held: true, onLift: () => setMenuAt(null) })
      }
    },
  })
  // In a managed list the list decides what the menu acts on (the selection, or this row alone).
  const openMenu = (at: { x: number; y: number }) => {
    const key = item?.key
    const menu = list && managed() && key !== undefined ? list.menuFor(key, ownMenu) : ownMenu()
    if (!hasItems(menu.entries)) return false
    setShown(menu)
    setMenuAt(at)
    return true
  }
  // The row's cells move with the finger. The shift stays set while they slide back, so the slide animates.
  const [shifted, setShifted] = createSignal(false)
  createEffect(swipe.offset, (x) => {
    if (x !== 0) {
      setShifted(true)
      return
    }
    const t = setTimeout(() => setShifted(false), 240)
    return () => clearTimeout(t)
  })
  // Clicks inside a row that was just dragged, or whose actions are open, only close it.
  onSettled(() => {
    const swallow = (e: MouseEvent) => {
      if ((e.target as Element).closest?.(".nc-lrow__tray")) return
      if (holdClick) {
        e.preventDefault()
        e.stopPropagation()
        return
      }
      if (swipe.swallowClick(e)) e.stopPropagation()
    }
    row.addEventListener("click", swallow, true)
    return () => row.removeEventListener("click", swallow, true)
  })

  // ---- Registration with the list, for keyboard focus ----
  const entry: RowEntry = {
    el: () => row,
    focus: () => mainEl?.focus(),
    index,
    key: () => item?.key,
    depth,
    interactive,
    rename: () => {
      if (!props.onRename) return false
      startRename()
      return true
    },
    expanded: () => (disclosure() ? expanded() : undefined),
    setExpanded: (open) => disclosure() && setExpanded(open),
    openMenu: (at) => {
      openMenu(at)
    },
  }
  if (list) onCleanup(list.register(entry))
  const focusable = () =>
    Boolean(list) && (interactive() || managed() || Boolean(props.onRename) || disclosure())
  const tabIndex = () => (focusable() ? (list?.tabStop(entry) ? 0 : -1) : undefined)

  // On a row of two or three lines the time ends the first line and the state the second, inside the text,
  // so the title has the first line to itself but for the time.
  const multi = () => lines() > 1
  const statusCell = () => <span class="nc-lrow__status">{props.status}</span>
  const metaCell = () => <span class="nc-lrow__meta">{props.meta}</span>
  const title = () => (
    <Show when={renaming()} fallback={<span class="nc-lrow__title">{props.title}</span>}>
      <span class="nc-lrow__title nc-lrow__title--edit">
        <InlineField
          value={titleText() ?? ""}
          label={`Rename ${titleText() ?? ""}`}
          selectOnFocus
          ref={(el: HTMLElement) => queueMicrotask(() => el.focus())}
          onCommit={(v) => {
            const next = v.trim()
            if (next && next !== titleText()) props.onRename?.(next)
          }}
          onFocusOut={(e: FocusEvent) => {
            setRenaming(false)
            // The caller may replace the item, and with it the row: focus the row at this index then.
            const i = index()
            if (!e.relatedTarget)
              queueMicrotask(() =>
                mainEl?.isConnected ? mainEl.focus() : i !== undefined && list?.focusIndex(i),
              )
          }}
        />
      </span>
    </Show>
  )
  const text = (
    <span class="nc-lrow__text">
      <Show when={multi() && props.meta} fallback={title()}>
        <span class="nc-lrow__line">
          {title()}
          {metaCell()}
        </span>
      </Show>
      <Show
        when={multi() && props.status}
        fallback={
          <Show when={props.secondary}>
            <span class="nc-lrow__secondary">{props.secondary}</span>
          </Show>
        }
      >
        <span class="nc-lrow__line">
          <span class="nc-lrow__secondary">{props.secondary}</span>
          {statusCell()}
        </span>
      </Show>
      <Show when={props.detail && lines() > 2}>
        <span class="nc-lrow__detail">{props.detail}</span>
      </Show>
    </span>
  )
  const onMainClick = (e: MouseEvent) => {
    const i = index()
    if (list && item && i !== undefined && list.click(i, item.key, e, Boolean(props.href || props.onClick))) {
      e.preventDefault()
      return
    }
    callClick(props.onClick, e)
    if (props.href) linkClick(e as MouseEvent & { currentTarget: HTMLAnchorElement }, props.href)
  }
  const common = () => ({
    ref: (el: HTMLElement) => {
      mainEl = el
    },
    class: "nc-lrow__main",
    title: renaming() ? undefined : tooltip(),
    "data-row-focus": focusable() ? "" : undefined,
    tabindex: tabIndex(),
    // The row is dragged by itself: the browser's own drag of a link would take the pointer.
    draggable: reorderable() ? ("false" as const) : undefined,
    // A Shift or Cmd click in a selectable list selects rows, not the text between them.
    onMouseDown: (e: MouseEvent) => {
      if (list?.selectable() && (e.shiftKey || e.metaKey || e.ctrlKey)) e.preventDefault()
    },
    onDblClick: props.onRename
      ? (e: MouseEvent) => {
          if ((e.target as Element).closest?.(".nc-lrow__title")) startRename()
        }
      : undefined,
    // A row that opens nothing renames on a click on its title, as an InlineField edits on a click.
    onClick:
      props.onRename && !interactive()
        ? (e: MouseEvent) => {
            if (!renaming() && (e.target as Element).closest?.(".nc-lrow__title")) startRename()
          }
        : undefined,
  })
  const main = () => {
    if (props.href && !renaming())
      return (
        <a
          {...common()}
          href={props.href}
          aria-label={props.label}
          aria-current={selected() ? "page" : undefined}
          onClick={onMainClick}
        >
          {text}
        </a>
      )
    if (interactive() && !renaming())
      return (
        <button
          type="button"
          {...common()}
          aria-label={props.label}
          aria-pressed={selected() === undefined ? undefined : aria(selected())}
          onClick={onMainClick}
        >
          {text}
        </button>
      )
    return <span {...common()}>{text}</span>
  }
  const lead = () => (
    <Show when={props.leading || props.icon || props.iconNode}>
      <span class="nc-lrow__lead">
        <Show when={props.leading} fallback={<Icon name={props.icon} node={props.iconNode} />}>
          {props.leading}
        </Show>
      </span>
    </Show>
  )
  const style = () => {
    const own = typeof props.style === "object" ? props.style : {}
    const vars: Record<string, string> = {}
    if (shifted()) vars["--nc-swipe"] = `${swipe.offset()}px`
    if (branch()) vars["--nc-lrow-depth"] = String(depth())
    return Object.keys(vars).length ? { ...own, ...vars } : props.style
  }
  const rowView = (
    <div
      ref={row}
      data-part="list-row"
      role={inListbox ? undefined : "listitem"}
      aria-level={branch() && !inListbox ? depth() + 1 : undefined}
      class={cx("nc-lrow", props.class)}
      data-density={props.density ?? list?.density() ?? "compact"}
      data-lines={lines()}
      data-index={index()}
      data-depth={branch() ? depth() : undefined}
      data-selected={selected() ? "" : undefined}
      data-unread={props.unread ? "" : undefined}
      data-muted={props.muted ? "" : undefined}
      data-interactive={interactive() ? "" : undefined}
      data-touch={touch() ? "" : undefined}
      data-editing={editing() ? "" : undefined}
      data-swipe={shifted() ? "" : undefined}
      data-dragging={swipe.dragging() ? "" : undefined}
      data-grabbed={
        list?.reorder.mode() === "keyboard" && index() !== undefined && list.reorder.active() === index()
          ? ""
          : undefined
      }
      data-menu={hasMenu() || reorderable() ? "" : undefined}
      data-movable={reorderable() ? "" : undefined}
      data-swipeable={
        touch() && (tray() || props.leadingActions?.length || trailing().length) ? "" : undefined
      }
      style={style()}
      {...swipe.handlers}
      onPointerDown={(e) => {
        lastDown = e
        swipe.handlers.onPointerDown(e)
        // A mouse or pen drags the row itself: a press that moves lifts it, one that does not is a click.
        const i = index()
        if (
          reorderable() &&
          !renaming() &&
          (e.pointerType === "mouse" || (e.pointerType === "pen" && !touch())) &&
          !(e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) &&
          i !== undefined &&
          startsRowDrag(e.target as Element, row, ".nc-lrow__main")
        )
          list?.reorder.pointerDown(e, i)
      }}
      onContextMenu={(e) => {
        // A finger's long press is the swipe's (it may lift the row first); a right click opens the menu here.
        if (touch() && lastDown && lastDown.pointerType !== "mouse" && (hasMenu() || reorderable()))
          return e.preventDefault()
        if ((e.target as Element).closest?.("input, textarea, [contenteditable=true]")) return
        if (hasMenu() && openMenu({ x: e.clientX, y: e.clientY })) e.preventDefault()
      }}
      {...rest}
    >
      <Show when={props.unread !== undefined}>
        <span
          class="nc-lrow__unread"
          data-on={props.unread ? "" : undefined}
          role={props.unread ? "img" : undefined}
          aria-label={props.unread ? "Unread" : undefined}
          aria-hidden={props.unread ? undefined : "true"}
        />
      </Show>
      <Show when={editing() && managed() && list?.selectable()}>
        <span class="nc-lrow__check">
          <Checkbox
            tabindex={-1}
            aria-label={`Select ${titleText()}`}
            checked={Boolean(selected())}
            onChange={() => {
              const i = index()
              if (i !== undefined && item) list?.toggle(i, item.key)
            }}
          />
        </span>
      </Show>
      <Show
        when={branch()}
        fallback={
          <>
            {lead()}
            {main()}
          </>
        }
      >
        <span class="nc-lrow__branch">
          <Show when={disclosure()} fallback={<span class="nc-lrow__toggle" aria-hidden="true" />}>
            <button
              type="button"
              class="nc-lrow__toggle"
              tabindex={-1}
              aria-label={expanded() ? `Collapse ${titleText()}` : `Expand ${titleText()}`}
              aria-expanded={aria(expanded())}
              aria-controls={hasChildren ? groupId : undefined}
              data-open={expanded() ? "" : undefined}
              onClick={() => setExpanded(!expanded())}
            >
              <Icon name="chevron-right" size="sm" />
            </button>
          </Show>
          {lead()}
          {main()}
        </span>
      </Show>
      <Show when={props.status && !multi()}>{statusCell()}</Show>
      <Show when={props.meta && !multi()}>{metaCell()}</Show>
      <Show when={props.actions && !touch()}>
        <span
          class="nc-lrow__actions"
          ref={(el) => {
            actionsEl = el
          }}
        >
          {props.actions}
        </span>
      </Show>
      <Show when={props.persistentActions}>
        <span class="nc-lrow__actions nc-lrow__actions--persistent">{props.persistentActions}</span>
      </Show>
      <Show when={touch() && props.leadingActions?.length}>
        <div
          class="nc-lrow__tray nc-lrow__tray--leading"
          style={{ width: `${Math.max(swipe.offset(), 0)}px` }}
        >
          <For each={props.leadingActions}>
            {(a) => <SwipeButton action={a} close={() => swipe.setOpen(null)} />}
          </For>
        </div>
      </Show>
      <Show when={touch() && trailing().length}>
        <div
          class="nc-lrow__tray nc-lrow__tray--trailing"
          style={{ width: `${Math.max(-swipe.offset(), 0)}px` }}
        >
          <For each={trailing()}>{(a) => <SwipeButton action={a} close={() => swipe.setOpen(null)} />}</For>
        </div>
      </Show>
      <Show when={tray()}>
        {/* The hover actions, under the row: a left swipe slides the row over to show them. Focusing one by
            keyboard opens the tray too, so they stay reachable without a finger. */}
        <div
          class="nc-lrow__tray nc-lrow__tray--trailing nc-lrow__tray--actions"
          style={{ width: `${Math.max(-swipe.offset(), 0)}px` }}
          onFocusIn={() => swipe.setOpen("trailing")}
          onClick={() => setTimeout(() => swipe.setOpen(null), 0)}
        >
          <div
            ref={(el) => {
              trayInner = el
            }}
            class="nc-lrow__tray-inner"
          >
            {props.actions}
          </div>
        </div>
      </Show>
      <Show when={touch() && props.actions && !tray()}>
        {/* The swipe shows other actions here: the hover actions are still in the long-press menu. */}
        <div
          ref={(el) => {
            menuSource = el
          }}
          hidden
        >
          {props.actions}
        </div>
      </Show>
      <Show when={menuAt()}>
        {(at) => (
          <RowMenu
            at={at()}
            phone={phone()}
            label={props.menuLabel ?? "Actions"}
            items={(shown()?.entries ?? []) as MenuEntry[]}
            origin={row}
            returnFocus={() => mainEl}
            onClose={() => setMenuAt(null)}
            onSelect={(id) => {
              const menu = shown()
              setMenuAt(null)
              menu?.run(id)
            }}
          />
        )}
      </Show>
    </div>
  )
  if (!hasChildren) return rowView
  return (
    <>
      {rowView}
      <Show when={expanded()}>
        {/* Nested rows are not the parent's item. */}
        <RowItem value={null}>
          <RowDepth value={depth() + 1}>
            <div class="nc-lrow-group" id={groupId} data-part="row-group">
              {props.children}
            </div>
          </RowDepth>
        </RowItem>
      </Show>
    </>
  )
}

export interface RowListProps<T> extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Accessible name of the list. */
  label: string
  /** Rows as children, for short lists. */
  children?: JSX.Element | ((item: T, index: number) => JSX.Element)
  /**
   * Or the items, rendered with `children(item, index)`. Long lists (more than `virtualizeAt`) render only what is
   * in view. Reordering, selection and removal need `items` and `getKey`.
   */
  items?: readonly T[]
  /** Stable key of an item: selection is kept by key. Default the index. */
  getKey?: (item: T, index: number) => RowKey
  /** Height of one row in px, for the virtualised list. Default: the density's row height. */
  itemHeight?: number
  /** Rows above which the list is virtualised (it then needs a height from its parent). Default 150. */
  virtualizeAt?: number
  /** Hairlines between rows, for multi-line rows. The inset fill stays the selection. */
  divided?: boolean
  /** Row height of every row: `compact` 30px (default) or `comfortable` 36px. */
  density?: RowDensity
  /** Where the list sits: see `RowListVariant`. Default `plain`. */
  variant?: RowListVariant
  /** Flush to the container's edge instead of inset by 6px. Prefer `variant="inset"`, which also fits nested lists. */
  flush?: boolean
  /**
   * Rows can be reordered: dragged by the row itself with a mouse (a press that moves past a few px; one that
   * does not is a click), on a touch screen by moving the finger after the long press that opens the row's menu,
   * and from the keyboard with Alt and an arrow on the row. There are no handles. Called once per drop: move the
   * item at `from` so it is at `to` (`reorderItems`). Indices are of `items`, so it works when the list is
   * virtualised.
   */
  onReorder?: (from: number, to: number) => void
  /**
   * Rows can be selected, as on a desktop: a plain click opens a row (one that opens nothing is selected alone),
   * Cmd or Ctrl and a click toggles one, Shift and a click selects the range from the last row clicked, Shift and
   * an arrow extends it, Space toggles the focused row, Cmd or Ctrl+A selects all, Escape clears. While something
   * is selected a bar at the list's foot shows the count and `bulkActions`.
   */
  selectable?: boolean
  /** The selected keys, controlled. */
  selected?: readonly RowKey[]
  /** The selected keys at first, uncontrolled. */
  defaultSelected?: readonly RowKey[]
  /** The selection changed. */
  onSelectedChange?: (keys: RowKey[]) => void
  /** Actions for the selected items, in the selection bar (`Button size="sm" variant="ghost"`). */
  bulkActions?: (items: T[], keys: RowKey[]) => JSX.Element
  /**
   * Rows can be removed: Delete or Backspace on a focused row (the selection, when the row is in it), Delete in
   * the row's context menu and in the selection bar, and a swipe to the left on a touch screen. No row has a
   * delete button of its own. Return a function to undo it, and the list shows a toast with Undo.
   */
  onRemove?: (keys: RowKey[], items: T[]) => undefined | (() => void)
  /** What an item is called in announcements and the undo toast. Default the row's title. */
  itemLabel?: (item: T) => string
  /** An add row at the end of the list ("Add page"). */
  onAdd?: () => void
  /** The add row's label. Default "Add". */
  addLabel?: string
  /**
   * Editing mode, as on iOS: a selection circle at each row's start (selectable), then the content. A click
   * toggles selection instead of opening.
   */
  editing?: boolean
  /** Every row keeps a disclosure's place, so leaves line up with rows that have children. Set by itself when a row has children. */
  tree?: boolean
  /**
   * The context menu of a row, or of the selection: a right click, the Menu key or Shift+F10 on a focused row, a
   * long press on a touch screen. A row that is part of a selection of several opens it for the whole selection
   * (say so: "Archive 3"); any other row is selected alone first. An entry runs its own `onSelect`, or
   * `onRowMenuSelect`; without either, `delete` is the list's removal (`onRemove`, with Undo) and `open` and
   * `rename` the row's. Without it a row's menu is its `menu`, or Open, its actions, Rename and Delete; a
   * selection's is the selection bar's actions and "Delete 3".
   */
  rowMenu?: (target: RowMenuContext<T>) => RowMenuEntry[]
  /** An entry of `rowMenu` without an `onSelect` was chosen. */
  onRowMenuSelect?: (id: string, target: RowMenuContext<T>) => void
}

/** The trailing columns a virtualised list measures, since its rows cannot share one grid. */
const MEASURED = ["status", "meta", "actions"] as const

/** Widths a `RowList` measures in its rows, in px. */
export interface RowColumns {
  /** The widest title's full text: the title column keeps at least this much (up to 40% of the row). */
  title: number
  status: number
  meta: number
  actions: number
}

/**
 * The widest title of the rows in `root` (its full text, however it is cut) and the widest cell of each trailing
 * column, margins included. A list gives its title column at least the widest title (up to its share), so short
 * titles leave the trailing columns room; a virtualised list also gives every row the trailing widths, so states
 * and times line up as in a short list.
 */
export function measureRowColumns(root: ParentNode): RowColumns {
  const out = { title: 0, status: 0, meta: 0, actions: 0 }
  for (const el of root.querySelectorAll<HTMLElement>(".nc-lrow__title"))
    out.title = Math.max(out.title, Math.ceil(el.scrollWidth))
  for (const col of MEASURED) {
    for (const el of root.querySelectorAll<HTMLElement>(`.nc-lrow > .nc-lrow__${col}`)) {
      const css = getComputedStyle(el)
      const width =
        Math.max(el.getBoundingClientRect().width, el.scrollWidth) +
        (Number.parseFloat(css.marginLeft) || 0) +
        (Number.parseFloat(css.marginRight) || 0)
      out[col] = Math.max(out[col], Math.ceil(width))
    }
  }
  return out
}

const sameOrder = (a: HTMLElement, b: HTMLElement) =>
  a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1

/**
 * The container of `ListRow`s: the 6px inset that makes selection an inset fill, the gap between rows, and
 * hairlines for multi-line lists. Its rows share one set of columns (a CSS subgrid), so leading icons, titles,
 * states, times and actions each sit on one edge whatever a row holds. With `items`, a long list is virtualised:
 * it fills its parent's height and scrolls inside it, and the trailing columns take the widest cell seen so far.
 * The arrow keys move focus between rows (one tab stop for the list), Home and End go to the ends. With
 * `onReorder`, `selectable`, `onRemove` and `onAdd` it is a list the person manages; `variant` fits it into a
 * card, an inspector or a form.
 */
export function RowList<T = unknown>(props: RowListProps<T>): JSX.Element {
  const rest = omit(
    props,
    "label",
    "children",
    "items",
    "getKey",
    "itemHeight",
    "virtualizeAt",
    "divided",
    "density",
    "variant",
    "flush",
    "onReorder",
    "selectable",
    "selected",
    "defaultSelected",
    "onSelectedChange",
    "bulkActions",
    "onRemove",
    "itemLabel",
    "onAdd",
    "addLabel",
    "editing",
    "tree",
    "rowMenu",
    "onRowMenuSelect",
    "class",
    "ref",
    "style",
  )
  const phone = usePhone()
  const virtual = createMemo(() => (props.items?.length ?? 0) > (props.virtualizeAt ?? 150))
  const keyOf = (item: T, index: number): RowKey => props.getKey?.(item, index) ?? index
  const keys = createMemo(() => (props.items ?? []).map(keyOf))
  const render = (item: T, index: () => number) =>
    typeof props.children === "function" ? (
      <RowItem value={{ index, key: keyOf(item, untrack(index)) }}>
        {(props.children as (i: T, n: number) => JSX.Element)(item, untrack(index))}
      </RowItem>
    ) : null
  const variant = () => props.variant ?? (props.flush ? "inset" : "plain")
  const height = () =>
    props.itemHeight ??
    (phone() ? 44 : variant() === "inline" ? 28 : props.density === "comfortable" ? 36 : 30)
  let root!: HTMLDivElement
  const [said, setSaid] = createSignal("")
  const announce = (text: string) => {
    // The same words twice are still announced.
    setSaid("")
    queueMicrotask(() => setSaid(text))
  }

  // ---- Rows, for focus ----
  const rows = new Set<RowEntry>()
  const [activeRow, setActiveRow] = createSignal<RowEntry | null>(null)
  const [firstRow, setFirstRow] = createSignal<RowEntry | null>(null)
  let firstQueued = false
  const ordered = () =>
    [...rows]
      .filter((r) => r.el()?.isConnected && r.el()?.querySelector("[data-row-focus]"))
      .sort((a, b) => sameOrder(a.el() as HTMLElement, b.el() as HTMLElement))
  const findFirst = () => {
    if (firstQueued) return
    firstQueued = true
    queueMicrotask(() => {
      firstQueued = false
      setFirstRow(ordered()[0] ?? null)
    })
  }
  // A branch row registers from its own body, which is an owned scope.
  const [branches, setBranches] = createSignal(0, { ownedWrite: true })
  const rowOf = (el: Element | null) => {
    const rowEl = el?.closest?.(".nc-lrow")
    if (!rowEl || rowEl.closest("[data-part=row-list]") !== root) return undefined
    for (const r of rows) if (r.el() === rowEl) return r
    return undefined
  }

  // ---- Selection ----
  const selection = createSelection<RowKey>({
    keys,
    value: () => props.selected,
    defaultValue: untrack(() => props.defaultSelected ?? []),
    onChange: (next) => props.onSelectedChange?.(next),
    announce,
  })
  const selected = selection.selected
  const select = selection.select
  const selectedSet = createMemo(() => new Set(selected()))
  const selectedItems = () => {
    const set = selectedSet()
    return (props.items ?? []).filter((item, i) => set.has(keyOf(item, i)))
  }

  // ---- Removal ----
  const nameOf = (index: number) => {
    const item = props.items?.[index]
    if (item !== undefined && props.itemLabel) return props.itemLabel(item)
    return rowAt(index)?.querySelector(".nc-lrow__title")?.textContent?.trim() || `Item ${index + 1}`
  }
  const removeKeys = (gone: RowKey[]) => {
    if (!props.onRemove || !gone.length) return
    const items = props.items ?? []
    const set = new Set(gone)
    const indices = items.map((item, i) => (set.has(keyOf(item, i)) ? i : -1)).filter((i) => i >= 0)
    const removed = indices.map((i) => items[i] as T)
    const name = indices.length === 1 ? nameOf(indices[0] as number) : "items"
    const focusAt = indices[0] ?? 0
    const hadFocus = root.contains(activeElement())
    const undo = props.onRemove(gone, removed)
    if (selected().some((k) => set.has(k))) selection.set(selected().filter((k) => !set.has(k)))
    announce(`Removed ${indices.length === 1 ? name : `${indices.length} items`}.`)
    removalToast(indices.length === 1 ? name : "items", indices.length, undo)
    // Focus stays in the list: on the row that took the removed one's place, or the new last row.
    if (hadFocus)
      queueMicrotask(() => {
        const left = ordered()
        const next = left.find((r) => (r.index() ?? -1) >= focusAt) ?? left[left.length - 1]
        next?.focus()
      })
  }
  const removeAt = (index: number) => {
    const key = keys()[index]
    if (key === undefined) return
    removeKeys(selectedSet().has(key) && selected().length > 1 ? [...selected()] : [key])
  }

  // ---- Reordering ----
  const scroller = () => (virtual() ? (root.querySelector<HTMLElement>(".nc-list") ?? undefined) : undefined)
  const rowAt = (index: number): HTMLElement | undefined => {
    if (virtual()) return root.querySelector<HTMLElement>(`.nc-list__row[data-index="${index}"]`) ?? undefined
    for (const el of root.querySelectorAll<HTMLElement>(`.nc-lrow[data-index="${index}"]`))
      if (el.closest("[data-part=row-list]") === root) return el
    return undefined
  }
  const [virtualActive, setVirtualActive] = createSignal<number | undefined>(undefined)
  const focusIndex = (index: number) => {
    const go = () => {
      const target = rowAt(index)?.querySelector<HTMLElement>("[data-row-focus]")
      target?.focus()
      return Boolean(target)
    }
    if (virtual()) setVirtualActive(index)
    queueMicrotask(() => {
      if (!go()) setTimeout(go, 16)
    })
  }
  const reorder = createReorder({
    count: () => props.items?.length ?? 0,
    container: () => root,
    rowAt,
    scroller,
    slots: (s) => {
      if (!virtual()) {
        const top = (s === document.scrollingElement ? 0 : s.getBoundingClientRect().top) - s.scrollTop
        const out = { tops: [] as number[], bottoms: [] as number[] }
        for (let i = 0; i < (props.items?.length ?? 0); i++) {
          const r = rowAt(i)?.getBoundingClientRect()
          out.tops.push(r ? r.top - top : 0)
          out.bottoms.push(r ? r.bottom - top : 0)
        }
        return out
      }
      const space = root.querySelector(".nc-list__space")?.getBoundingClientRect().top ?? 0
      const base = space - s.getBoundingClientRect().top + s.scrollTop
      const h = height()
      const n = props.items?.length ?? 0
      return {
        tops: Array.from({ length: n }, (_, i) => base + i * h),
        bottoms: Array.from({ length: n }, (_, i) => base + (i + 1) * h),
      }
    },
    onReorder: (from, to) => props.onReorder?.(from, to),
    name: nameOf,
    announce,
    refocus: (index) => focusIndex(index),
    reveal: (index) => {
      if (virtual()) setVirtualActive(index)
      else rowAt(index)?.scrollIntoView?.({ block: "nearest" })
    },
  })

  // ---- Keyboard ----
  const moveFocus = (from: RowEntry, to: "next" | "prev" | "first" | "last", extend: boolean) => {
    if (virtual()) {
      const n = props.items?.length ?? 0
      const at = from.index() ?? 0
      const i = to === "next" ? at + 1 : to === "prev" ? at - 1 : to === "first" ? 0 : n - 1
      if (i < 0 || i >= n) return
      focusIndex(i)
      const fromKey = from.key()
      const toKey = keys()[i]
      if (props.selectable && toKey !== undefined) {
        if (extend) selection.extend(fromKey ?? toKey, toKey)
        else selection.setAnchor(toKey)
      }
      return
    }
    const list = ordered()
    const at = list.indexOf(from)
    const target =
      to === "next"
        ? list[at + 1]
        : to === "prev"
          ? list[at - 1]
          : to === "first"
            ? list[0]
            : list[list.length - 1]
    if (!target) return
    target.focus()
    const key = target.key()
    if (props.selectable && key !== undefined) {
      // The keyboard's cursor is where the next range starts; Shift extends from where it was.
      if (extend) selection.extend(from.key() ?? key, key)
      else selection.setAnchor(key)
    }
  }
  const parentOf = (r: RowEntry) => {
    const list = ordered()
    const depth = r.depth()
    for (let i = list.indexOf(r) - 1; i >= 0; i--) if ((list[i]?.depth() ?? 0) < depth) return list[i]
    return undefined
  }
  const onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (target.closest("input, textarea, select, [contenteditable=true]")) return
    const r = rowOf(target)
    if (!r) return
    // Keys that act on the row itself, not on an action button inside it.
    const onRow = Boolean(target.closest("[data-row-focus]"))
    const index = r.index()
    const key = r.key()
    const mod = e.metaKey || e.ctrlKey
    const handled = () => {
      e.preventDefault()
      e.stopPropagation()
    }
    if (isMenuKey(e)) {
      if (!onRow) return
      handled()
      return r.openMenu(keyboardMenuPoint(r.el() as HTMLElement))
    }
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp":
        if (e.altKey && props.onReorder && index !== undefined) {
          handled()
          reorder.nudge(index, e.key === "ArrowDown" ? 1 : -1)
          focusIndex(Math.max(0, Math.min(keys().length - 1, index + (e.key === "ArrowDown" ? 1 : -1))))
          return
        }
        handled()
        return moveFocus(r, e.key === "ArrowDown" ? "next" : "prev", e.shiftKey)
      case "Home":
      case "End":
        handled()
        return moveFocus(r, e.key === "Home" ? "first" : "last", e.shiftKey)
      case "ArrowRight":
        if (r.expanded() === false) {
          handled()
          return r.setExpanded(true)
        }
        if (r.expanded() === true) {
          handled()
          return moveFocus(r, "next", false)
        }
        return
      case "ArrowLeft":
        if (r.expanded() === true) {
          handled()
          return r.setExpanded(false)
        }
        if (r.depth() > 0) {
          handled()
          return parentOf(r)?.focus()
        }
        return
      case " ":
        if (!onRow) return
        if (props.selectable && key !== undefined && !mod) {
          handled()
          return select(selectionKey(e) ?? "toggle", key)
        }
        return
      case "Enter":
        if (!onRow) return
        if (!r.interactive() && r.rename()) handled()
        return
      case "F2":
        if (onRow && r.rename()) handled()
        return
      case "Delete":
      case "Backspace":
        if (onRow && props.onRemove && index !== undefined) {
          handled()
          removeAt(index)
        }
        return
      case "a":
      case "A":
      case "Escape": {
        const gesture = selectionKey(e)
        if (gesture && props.selectable && (gesture === "all" || selected().length)) {
          handled()
          select(gesture)
        }
        return
      }
    }
  }

  const ctx: RowListContext = {
    density: () => props.density,
    tree: () => Boolean(props.tree) || branches() > 0,
    addBranch: () => {
      setBranches((n) => n + 1)
      return () => setBranches((n) => n - 1)
    },
    editing: () => Boolean(props.editing),
    selectable: () => Boolean(props.selectable),
    isSelected: (key) => selectedSet().has(key),
    click: (_index, key, e, activates) => {
      if (!props.selectable) return false
      if (props.editing) {
        select("toggle", key)
        return true
      }
      return selection.click(key, e, activates)
    },
    toggle: (_index, key) => select("toggle", key),
    reorderable: () => Boolean(props.onReorder) && Boolean(props.items),
    reorder,
    removable: () => Boolean(props.onRemove) && Boolean(props.items),
    remove: removeAt,
    focusIndex: (index) => focusIndex(index),
    hasRowMenu: () => Boolean(props.rowMenu),
    menuFor: (key, own) => {
      const target = menuTarget(keys(), selected(), key, Boolean(props.selectable))
      if (target.reselect) select("only", key)
      const set = new Set(target.keys)
      const context: RowMenuContext<T> = {
        keys: target.keys,
        items: (props.items ?? []).filter((item, i) => set.has(keyOf(item, i))),
      }
      if (props.rowMenu) {
        const entries = props.rowMenu(context)
        return {
          entries,
          run: (id) => {
            const entry = entryById(entries, id)
            if (entry?.onSelect) entry.onSelect()
            else if (props.onRowMenuSelect) props.onRowMenuSelect(id, context)
            // The list's own: Delete removes what the menu acts on; Open and Rename are the row's.
            else if (id === "delete") removeKeys(target.keys)
            else if (id === "open" || id === "rename") own().run(id)
          },
        }
      }
      if (target.keys.length < 2) return own()
      // A selection's menu is what its bar offers. The bar is shown while several rows are selected.
      const actions = entriesFromButtons(root.querySelector("[data-bulk-actions]"))
      const entries = defaultRowMenu({ count: target.keys.length, actions, remove: Boolean(props.onRemove) })
      return {
        entries,
        run: (id) => (id === "delete" ? removeKeys(target.keys) : entryById(entries, id)?.onSelect?.()),
      }
    },
    register: (entry) => {
      rows.add(entry)
      findFirst()
      return () => {
        rows.delete(entry)
        if (activeRow() === entry) setActiveRow(null)
        findFirst()
      }
    },
    tabStop: (entry) => {
      const active = activeRow()
      return active ? active === entry : firstRow() === entry
    },
  }

  // The title column keeps at least the widest title (up to its share of the row), so a list of short titles
  // gives its states and times their width. A virtualised list renders a window of absolutely placed rows, which
  // cannot share grid columns: it also measures the trailing cells as rows come into view and gives every row the
  // widest seen so far. A new set of items starts it over; a list that is not virtualised measures again as its
  // rows change, so a reorder or a removal does not make the columns jump.
  const none: RowColumns = { title: 0, status: 0, meta: 0, actions: 0 }
  const [widths, setWidths] = createSignal(none)
  createEffect(virtual, (v) => {
    setWidths(none)
    if (typeof MutationObserver === "undefined" || typeof requestAnimationFrame === "undefined") return
    let frame = 0
    const measure = () => {
      frame = 0
      const seen = measureRowColumns(root)
      const now = widths()
      const next = v
        ? {
            title: Math.max(now.title, seen.title),
            status: Math.max(now.status, seen.status),
            meta: Math.max(now.meta, seen.meta),
            actions: Math.max(now.actions, seen.actions),
          }
        : { ...none, title: seen.title }
      if (MEASURED.some((c) => next[c] !== now[c]) || next.title !== now.title) setWidths(next)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    const observer = new MutationObserver(schedule)
    observer.observe(root, { childList: true, subtree: true, characterData: true })
    schedule()
    document.fonts?.ready.then(schedule)
    return () => {
      observer.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  })
  createEffect(
    () => props.items,
    () => {
      if (untrack(virtual)) setWidths(none)
    },
    { defer: true },
  )
  const columns = () => {
    const w = widths()
    const own = typeof props.style === "object" ? props.style : {}
    if (!w.title && !virtual()) return props.style
    return {
      ...own,
      ...(w.title ? { "--nc-lrow-title": `${w.title}px` } : {}),
      ...(virtual()
        ? {
            "--nc-lrow-status": `${w.status}px`,
            "--nc-lrow-meta": `${w.meta}px`,
            "--nc-lrow-actions": `${w.actions}px`,
          }
        : {}),
    }
  }
  onSettled(() => {
    // Capture: a virtualised list's listbox would take the arrow keys first.
    root.addEventListener("keydown", onKeyDown, true)
    return () => root.removeEventListener("keydown", onKeyDown, true)
  })
  const addRow = () => (
    <Show when={props.onAdd}>
      <div role={virtual() ? undefined : "listitem"} class="nc-rows__add">
        <button
          type="button"
          class="nc-lrow nc-lrow--add"
          data-part="row-add"
          data-density={props.density ?? "compact"}
          data-interactive=""
          onClick={() => props.onAdd?.()}
        >
          <span class="nc-lrow__lead">
            <Icon name="plus" />
          </span>
          <span class="nc-lrow__main">
            <span class="nc-lrow__text">
              <span class="nc-lrow__title">{props.addLabel ?? "Add"}</span>
            </span>
          </span>
        </button>
      </div>
    </Show>
  )
  const count = () => selected().length
  return (
    <div
      ref={(el) => {
        root = el
        if (typeof props.ref === "function") (props.ref as (el: HTMLDivElement) => void)(el)
      }}
      data-part="row-list"
      data-variant={variant()}
      class={cx(
        "nc-rows",
        `nc-rows--${variant()}`,
        props.divided && "nc-rows--divided",
        props.flush && "nc-rows--flush",
        virtual() && "nc-rows--virtual",
        props.editing && "nc-rows--editing",
        reorder.mode() !== null && "nc-rows--reordering",
        Boolean(props.onReorder && props.items) && "nc-rows--movable",
        props.class,
      )}
      style={columns()}
      onFocusIn={(e) => {
        const r = rowOf(e.target as Element)
        if (r && (e.target as Element).closest("[data-row-focus]")) {
          setActiveRow(r)
          const i = r.index()
          if (virtual() && i !== undefined) setVirtualActive(i)
        }
      }}
      {...rest}
    >
      <Show
        when={virtual()}
        fallback={
          <div role="list" aria-label={props.label} class="nc-rows__list">
            <RowListCtx value={ctx}>
              <Show when={props.items} fallback={props.children as JSX.Element}>
                {(items) => <For each={items()}>{(item, i) => render(item, i)}</For>}
              </Show>
            </RowListCtx>
            {addRow()}
          </div>
        }
      >
        <InListbox value={true}>
          <RowListCtx value={ctx}>
            <List
              items={props.items as T[]}
              itemHeight={height()}
              label={props.label}
              getKey={props.getKey}
              activeIndex={virtualActive()}
              tabIndex={-1}
              isSelected={props.selectable ? (i) => selectedSet().has(keys()[i] as RowKey) : undefined}
              multiselectable={props.selectable}
            >
              {(item, i) => render(item, () => i)}
            </List>
          </RowListCtx>
        </InListbox>
        {addRow()}
      </Show>
      <Show when={reorder.line() !== null}>
        <div class="nc-rows__drop" data-part="drop-line" style={{ top: `${reorder.line()}px` }} />
      </Show>
      <Show when={props.selectable && count() > 0}>
        <SelectionBar
          class="nc-rows__bulk"
          count={count()}
          total={keys().length}
          phone={phone()}
          onSelectAll={() => select("all")}
          onClear={() => select("none")}
          onDelete={props.onRemove ? () => removeKeys([...selected()]) : undefined}
          actions={props.bulkActions?.(selectedItems(), [...selected()])}
        />
      </Show>
      <div class="nc-visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {said()}
      </div>
    </div>
  )
}
