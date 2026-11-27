// A widget board: the one system behind every place that shows widgets the person arranges, a dashboard's grid as
// much as the bars and columns around a conversation. `createWidgetBoard` keeps the layout and its edits,
// `WidgetBoard` hosts them, and each `WidgetZone` draws the widgets of one zone where the view puts it.
import { type JSX, Portal } from "@solidjs/web"
import { type Accessor, createSignal, For, onCleanup, onSettled, Show, untrack } from "solid-js"
import { cx } from "../lib/cx"
import { place as placeInGrid } from "../lib/grid"
import type { Placement } from "../lib/placement"
import { isMenuKey, keyboardMenuPoint, type RowMenuEntry } from "../lib/rowmenu"
import {
  formsIn,
  moveWidget,
  newWidgetId,
  placementType,
  stepWidget,
  WIDGET_FORM_LABEL,
  type WidgetConfig,
  type WidgetForm,
  type WidgetPlacement,
  type WidgetSetting,
  type WidgetType,
  type WidgetZoneDef,
  widgetConfig,
} from "../lib/widgets"
import { readJson, type ShellStorage, writeJson } from "../shell/storage"
import { Icon } from "./Icon"
import { IconButton } from "./IconButton"
import { RowMenu } from "./InsetList"
import { DropdownMenu } from "./Menu"
import { Popover } from "./Popover"
import { Select } from "./Select"
import { StatusDot } from "./StatusDot"
import { Switch } from "./Switch"
import type { ViewAction } from "./ViewHeader"
import { WidgetGrid } from "./WidgetGrid"

export interface WidgetBoardOptions<X> {
  /** The widget types the person can place, by id. */
  types: Record<string, WidgetType<X>>
  /** The zones of the view, in the order the Place list shows them. */
  zones: WidgetZoneDef[]
  /** The layout until the person changes it, and after Reset. */
  initial: WidgetPlacement[]
  /** Where the layout is kept, under `key`. Without it the layout lasts as long as the board. */
  storage?: ShellStorage
  key?: string
  /** What every widget reads, such as the conversation shown. Undefined, the zones draw nothing. */
  context: () => X | undefined
  /**
   * The zone a zone's widgets show in at a width of the measured element (`measure`), so a side column folds into
   * a bar on a narrow window and comes back when there is room. The layout itself never changes for it.
   */
  fit?: (zone: string, width: number) => string
  /** A widget with nothing to say (`WidgetType.live`) leaves its zone outside editing. */
  hideEmpty?: boolean
  /** A card in a column is one line until opened, and folds back from its corner. */
  collapsible?: boolean
}

interface Drag {
  id: string
  x: number
  y: number
  /** Where in the widget it was grabbed. */
  dx: number
  dy: number
  w: number
  h: number
  form: WidgetForm
}

export interface WidgetBoardState<X> {
  readonly options: WidgetBoardOptions<X>
  layout: Accessor<WidgetPlacement[]>
  setLayout: (next: WidgetPlacement[]) => void
  editing: Accessor<boolean>
  setEditing: (on: boolean) => void
  /** The widget whose settings are open, while editing. */
  settingsOf: Accessor<string | null>
  openSettings: (id: string | null) => void
  /** The width `fit` reads. Give the element that decides it to `measure` as a ref. */
  width: Accessor<number>
  measure: (el: HTMLElement) => void
  zone: (id: string) => WidgetZoneDef | undefined
  /** Whether a zone shows at this width: `fit` keeps its own widgets in it. */
  visible: (zone: WidgetZoneDef) => boolean
  /** The widgets that show in a zone now, in order, its folded zones' included. */
  itemsIn: (zone: WidgetZoneDef) => WidgetPlacement[]
  typeOf: (p: WidgetPlacement) => WidgetType<X> | undefined
  configOf: (p: WidgetPlacement) => WidgetConfig
  /** The form a widget takes in a zone: a grown row, the person's pick, a collapsed line or the zone's own. */
  formOf: (p: WidgetPlacement, zone: WidgetZoneDef) => WidgetForm
  isRow: (p: WidgetPlacement, zone: WidgetZoneDef) => boolean
  /** The widgets of a zone that grew to a full row now: `WidgetRows` draws them, apart from the zone. */
  rowsIn: (zone: WidgetZoneDef) => WidgetPlacement[]
  /** Sets a widget's form and, for a card in a column, its height: what resizing it does. */
  setSize: (id: string, form: WidgetForm | undefined, height?: number) => void
  moveTo: (id: string, zone: string, before?: string) => void
  step: (id: string, by: -1 | 1) => void
  remove: (id: string) => void
  add: (type: string) => string
  setForm: (id: string, form: WidgetForm | undefined) => void
  setConfig: (id: string, key: string, value: string | boolean) => void
  toggleOpen: (id: string) => void
  reset: () => void
  /** The types the add menu offers: those not placed yet, and those placed more than once. */
  addable: () => WidgetType<X>[]
  /**
   * The view header's actions for the board: Edit widgets, and while editing, Add widget, Reset and Done. Put them
   * among the view's own; the header keeps More actions last.
   */
  actions: () => ViewAction[]
  drag: Accessor<Drag | null>
  target: Accessor<{ zone: string; before?: string } | null>
  /** Starts dragging a widget of a row or column zone from a press on it. */
  startDrag: (e: PointerEvent, id: string, item: HTMLElement, form: WidgetForm) => void
  /** Zone elements, for finding where a drag lands. */
  zoneEls: Map<string, HTMLElement>
  /** The form the dragged widget takes over where it would land. */
  ghostForm: () => WidgetForm
  /** A widget changing zone remounts, and its settings popover reports closing as it goes: not the person's close. */
  moving: () => string | undefined
}

/**
 * The state of a widget board: the layout, kept in `storage`, and every change to it. Create it in the view that
 * shows the widgets, host it in a `WidgetBoard` and draw its zones with `WidgetZone`.
 */
export function createWidgetBoard<X>(options: WidgetBoardOptions<X>): WidgetBoardState<X> {
  const o = options
  const read = () => (o.key ? readJson<WidgetPlacement[]>(o.storage, o.key) : undefined) ?? o.initial
  const [layout, setLayoutRaw] = createSignal<WidgetPlacement[]>(read(), { ownedWrite: true })
  const setLayout = (next: WidgetPlacement[]) => {
    setLayoutRaw(next)
    if (o.key) writeJson(o.storage, o.key, next)
  }
  const [editing, setEditingRaw] = createSignal(false, { ownedWrite: true })
  const [settingsOf, openSettings] = createSignal<string | null>(null, { ownedWrite: true })
  const setEditing = (on: boolean) => {
    setEditingRaw(on)
    if (!on) openSettings(null)
  }
  const [width, setWidth] = createSignal(Number.POSITIVE_INFINITY, { ownedWrite: true })
  let ro: ResizeObserver | undefined
  const measure = (el: HTMLElement) => {
    ro?.disconnect()
    if (typeof ResizeObserver === "undefined") return
    ro = new ResizeObserver(([e]) => setWidth(Math.round(e!.contentRect.width)))
    ro.observe(el)
  }
  onCleanup(() => ro?.disconnect())

  const fitOf = (zone: string) => (o.fit ? o.fit(zone, width()) : zone)
  const zone = (id: string) => o.zones.find((z) => z.id === id)
  const typeOf = (p: WidgetPlacement) => o.types[placementType(p)]
  const configOf = (p: WidgetPlacement) => widgetConfig(typeOf(p) as WidgetType<never> | undefined, p.cfg)
  const shown = (p: WidgetPlacement) => {
    const x = o.context()
    const t = typeOf(p)
    if (x === undefined || !t) return false
    // While editing an empty widget shows too, so it can be moved and set up.
    return !o.hideEmpty || editing() || (t.live?.(x, configOf(p)) ?? true)
  }
  const visible = (z: WidgetZoneDef) => fitOf(z.id) === z.id
  const itemsIn = (z: WidgetZoneDef) => layout().filter((p) => fitOf(p.zone) === z.id && shown(p))
  const isRow = (p: WidgetPlacement, z: WidgetZoneDef) => {
    const x = o.context()
    return !!z.grow && x !== undefined && !!typeOf(p)?.expands?.(x, configOf(p))
  }
  const formOf = (p: WidgetPlacement, z: WidgetZoneDef): WidgetForm => {
    if (isRow(p, z)) return "row"
    const can = formsIn(typeOf(p) as WidgetType<never> | undefined, z)
    if (p.form && can.includes(p.form)) return p.form
    const own = can[0] ?? z.forms[0] ?? "card"
    return o.collapsible && own === "card" && z.layout !== "grid" && !p.open ? "line" : own
  }

  let movingId: string | undefined
  const moveTo = (id: string, to: string, before?: string) => {
    movingId = id
    setTimeout(() => {
      if (movingId === id) movingId = undefined
    }, 0)
    setLayout(moveWidget(layout(), id, to, before, (p) => fitOf(p.zone) === to))
  }
  const step = (id: string, by: -1 | 1) => {
    const p = layout().find((x) => x.id === id)
    const z = p ? zone(fitOf(p.zone)) : undefined
    if (z) setLayout(stepWidget(layout(), itemsIn(z), id, by))
  }
  const remove = (id: string) => {
    if (settingsOf() === id) openSettings(null)
    setLayout(layout().filter((p) => p.id !== id))
  }
  /** A new instance, in the zone the initial layout first had its type in, else the first zone it can go in. */
  const add = (type: string) => {
    const t = o.types[type]
    const id = newWidgetId(layout(), type, t?.multiple)
    const to =
      o.initial.find((p) => placementType(p) === type)?.zone ??
      o.zones.find((z) => formsIn(t as WidgetType<never> | undefined, z).length)?.id ??
      o.zones[0]!.id
    setLayout([...layout(), { id, type, zone: to }])
    return id
  }
  const patch = (id: string, change: Partial<WidgetPlacement>) =>
    setLayout(layout().map((p) => (p.id === id ? { ...p, ...change } : p)))
  const addable = () =>
    Object.values(o.types).filter((t) => t.multiple || !layout().some((p) => placementType(p) === t.id))

  // ── Dragging, between row and column zones ──────────────────────────────────────────────────────────
  // A sortable: the widget lifts into a ghost held where it was grabbed, a gap of its size opens where it will land
  // and the source closes up. Over a zone of another form the ghost takes that zone's form. Esc cancels; a drop is
  // never also a click.
  const zoneEls = new Map<string, HTMLElement>()
  const [drag, setDrag] = createSignal<Drag | null>(null, { ownedWrite: true })
  const [target, setTarget] = createSignal<{ zone: string; before?: string } | null>(null, {
    ownedWrite: true,
  })
  const ghostForm = (): WidgetForm => {
    const d = drag()
    const t = target()
    const z = t ? zone(t.zone) : undefined
    const p = d ? layout().find((x) => x.id === d.id) : undefined
    return d && z && p ? formOf({ ...p, form: undefined }, z) : (d?.form ?? "card")
  }
  const findTarget = (x: number, y: number, id: string) => {
    // Zones may overlap: the smallest under the pointer wins, then the nearest within a margin.
    let best: { zid: string; el: HTMLElement; z: WidgetZoneDef; score: number } | undefined
    const p = layout().find((q) => q.id === id)
    for (const [zid, el] of zoneEls) {
      const z = zone(zid)
      if (!z || z.layout === "grid" || !el.isConnected || !visible(z)) continue
      if (!formsIn(p ? (typeOf(p) as WidgetType<never> | undefined) : undefined, z).length) continue
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) continue
      const dist = Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom))
      if (dist > 16) continue
      const score = dist > 0 ? 1e9 + dist : r.width * r.height
      if (!best || score < best.score) best = { zid, el, z, score }
    }
    if (!best) return null
    const across = best.z.layout === "row"
    const kids = [...best.el.querySelectorAll<HTMLElement>(":scope > [data-widget-id]")].filter(
      (k) => k.dataset.widgetId !== id,
    )
    const before = kids.find((k) => {
      const kr = k.getBoundingClientRect()
      return across ? x < kr.left + kr.width / 2 : y < kr.top + kr.height / 2
    })
    return { zone: best.zid, before: before?.dataset.widgetId }
  }
  const startDrag = (e: PointerEvent, id: string, item: HTMLElement, form: WidgetForm) => {
    if (e.button !== 0) return
    e.preventDefault()
    const sx = e.clientX
    const sy = e.clientY
    const box = item.getBoundingClientRect()
    let moved = false
    const move = (m: PointerEvent) => {
      if (!moved && Math.hypot(m.clientX - sx, m.clientY - sy) < 4) return
      moved = true
      setDrag({
        id,
        x: m.clientX,
        y: m.clientY,
        dx: sx - box.left,
        dy: sy - box.top,
        w: box.width,
        h: box.height,
        form,
      })
      setTarget(findTarget(m.clientX, m.clientY, id))
    }
    const end = (drop: boolean) => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", cancel)
      window.removeEventListener("keydown", key, true)
      const t = target()
      if (moved && drop && t) moveTo(id, t.zone, t.before)
      if (moved) {
        // The press ends in a click on whatever is under it; a drag isn't one.
        const swallow = (c: MouseEvent) => {
          c.stopPropagation()
          c.preventDefault()
        }
        window.addEventListener("click", swallow, { capture: true, once: true })
        setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0)
      }
      setDrag(null)
      setTarget(null)
    }
    const up = () => end(true)
    const cancel = () => end(false)
    const key = (k: KeyboardEvent) => {
      if (k.key !== "Escape" || !moved) return
      k.preventDefault()
      k.stopPropagation()
      end(false)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", cancel)
    window.addEventListener("keydown", key, true)
  }

  const actions = (): ViewAction[] =>
    editing()
      ? [
          {
            id: "widgets-add",
            label: "Add widget",
            icon: "plus",
            disabled: !addable().length,
            menu: addable().map((t) => ({ id: t.id, label: t.label, description: t.hint, icon: t.icon })),
            onSelect: (id) => openSettings(add(id)),
          },
          {
            id: "widgets-reset",
            label: "Reset widgets",
            icon: "rotate-ccw",
            overflow: true,
            onClick: () => setLayout(o.initial),
          },
          { id: "widgets-done", label: "Done", primary: true, onClick: () => setEditing(false) },
        ]
      : [
          {
            id: "widgets-edit",
            label: "Edit widgets",
            icon: "layout-dashboard",
            onClick: () => setEditing(true),
          },
        ]

  return {
    options: o,
    layout,
    setLayout,
    editing,
    setEditing,
    settingsOf,
    openSettings,
    width,
    measure,
    zone,
    visible,
    itemsIn,
    rowsIn: (z) => itemsIn(z).filter((p) => isRow(p, z)),
    setSize: (id, form, height) => patch(id, { form, height }),
    typeOf,
    configOf,
    formOf,
    isRow,
    moveTo,
    step,
    remove,
    add,
    setForm: (id, form) => patch(id, { form }),
    setConfig: (id, key, value) => {
      const p = layout().find((x) => x.id === id)
      patch(id, { cfg: { ...p?.cfg, [key]: value } })
    },
    toggleOpen: (id) => patch(id, { open: !layout().find((p) => p.id === id)?.open }),
    reset: () => setLayout(o.initial),
    addable,
    actions,
    drag,
    target,
    startDrag,
    zoneEls,
    ghostForm,
    moving: () => movingId,
  }
}

/**
 * Hosts a board around the view's content: its zones can sit anywhere inside. It draws the widget being dragged, and
 * while editing Esc closes the open settings, then ends editing.
 */
export function WidgetBoard<X>(props: { board: WidgetBoardState<X>; children: JSX.Element }): JSX.Element {
  const b = props.board
  let ghostEl: HTMLElement | undefined
  onSettled(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !b.editing() || b.drag()) return
      // An open list or menu inside the settings closes first.
      if (
        (document.activeElement as HTMLElement | null)?.closest(
          '[role="listbox"], [role="menu"], [role="option"], [role="menuitem"]',
        )
      )
        return
      e.preventDefault()
      e.stopPropagation()
      if (b.settingsOf()) b.openSettings(null)
      else b.setEditing(false)
    }
    window.addEventListener("keydown", key, true)
    return () => window.removeEventListener("keydown", key, true)
  })
  /** The ghost: held at the grab point while it keeps its form, else just under the pointer, and on screen. */
  const ghostAt = () => {
    const d = b.drag()!
    const same = b.ghostForm() === d.form
    const w = ghostEl?.offsetWidth ?? d.w
    const h = ghostEl?.offsetHeight ?? d.h
    const x = same ? d.x - d.dx : d.x - Math.min(24, w / 2)
    const y = same ? d.y - d.dy : d.y - Math.min(14, h / 2)
    return {
      left: `${Math.max(4, Math.min(window.innerWidth - w - 4, x))}px`,
      top: `${Math.max(4, Math.min(window.innerHeight - h - 4, y))}px`,
      width: b.ghostForm() === d.form && (d.form === "card" || d.form === "line") ? `${d.w}px` : undefined,
    }
  }
  return (
    <div
      data-part="widget-board"
      class="nc-wboard"
      data-editing={b.editing() ? "" : undefined}
      data-dragging={b.drag() ? "" : undefined}
    >
      {props.children}
      <Show when={b.drag()}>
        {(d) => {
          const p = () => b.layout().find((x) => x.id === d().id)
          return (
            <Portal>
              <div
                class="nc-wboard__ghost nc"
                data-form={b.ghostForm()}
                ref={(el) => {
                  ghostEl = el
                }}
                style={ghostAt()}
              >
                <Show when={p() && b.options.context() !== undefined}>
                  {b.typeOf(p()!)?.render(b.options.context() as X, b.ghostForm(), b.configOf(p()!))}
                </Show>
              </div>
            </Portal>
          )
        }}
      </Show>
    </div>
  )
}

export interface WidgetZoneProps<X> {
  board: WidgetBoardState<X>
  /** The zone's id, from the board's `zones`. */
  zone: string
  /** Where a chip's or tile's card and the settings open. Default by the zone's layout. */
  placement?: Placement
  /** For a grid zone: the height of a row in px. */
  rowHeight?: number
  class?: string
}

/**
 * The widgets of one zone, where the view puts it: a bar, a column, a strip or a grid. Outside editing they just work;
 * while editing a press drags a widget, a click opens its settings and its menu moves it.
 */
export function WidgetZone<X>(props: WidgetZoneProps<X>): JSX.Element {
  const b = props.board
  const z = () => b.zone(props.zone)
  return (
    <Show when={z() && b.visible(z()!) ? z() : undefined} keyed>
      {(zone) =>
        zone.layout === "grid" ? <GridZone {...props} def={zone} /> : <ListZone {...props} def={zone} />
      }
    </Show>
  )
}

type Entry = { key: string; placed?: WidgetPlacement }

function ListZone<X>(props: WidgetZoneProps<X> & { def: WidgetZoneDef }) {
  const b = props.board
  const entries = (): Entry[] => {
    const d = b.drag()
    const t = b.target()
    // A widget grown to a row draws in `WidgetRows`, so the zone keeps its place and size.
    const list = b.itemsIn(props.def).filter((x) => !(d && t && x.id === d.id) && !b.isRow(x, props.def))
    const out: Entry[] = list.map((x) => ({ key: x.id, placed: x }))
    if (d && t?.zone === props.def.id) {
      const at = t.before ? list.findIndex((x) => x.id === t.before) : -1
      out.splice(at < 0 ? out.length : at, 0, { key: "__gap" })
    }
    return out
  }
  /** The gap's size: the widget's own where it keeps its form, else the form's usual size. */
  const gap = () => {
    const d = b.drag()
    const f = b.ghostForm()
    if (d && f === d.form) return { w: f === "chip" || f === "tile" ? d.w : undefined, h: d.h }
    return {
      card: { h: 72 },
      line: { h: 28 },
      tile: { w: 32, h: 36 },
      chip: { w: 96, h: 26 },
      row: { h: 36 },
    }[f]
  }
  return (
    <div
      data-part="widget-zone"
      class={cx("nc-wzone", props.class)}
      data-zone={props.def.id}
      data-layout={props.def.layout ?? "column"}
      data-target={b.target()?.zone === props.def.id ? "" : undefined}
      data-empty={entries().length ? undefined : ""}
      data-label={props.def.label}
      aria-label={props.def.label}
      role="group"
      ref={(el) => {
        b.zoneEls.set(props.def.id, el)
      }}
    >
      <For each={entries()} keyed={(x) => x.key}>
        {(e) => (
          <Show
            when={e().placed}
            fallback={
              <div
                class="nc-wzone__gap"
                data-form={b.ghostForm()}
                style={{ width: gap().w ? `${gap().w}px` : undefined, height: `${gap().h}px` }}
              />
            }
          >
            {(placed) => (
              <WidgetItem board={b} placed={placed()} zone={props.def} placement={props.placement} />
            )}
          </Show>
        )}
      </For>
    </div>
  )
}

function GridZone<X>(props: WidgetZoneProps<X> & { def: WidgetZoneDef }) {
  const b = props.board
  // Placements without a cell yet (added, or moved in from another zone) get the first free one of their size.
  const cells = () => {
    const placed: (WidgetPlacement & { x: number; y: number; w: number; h: number })[] = []
    for (const p of b.itemsIn(props.def)) {
      const g = b.typeOf(p)?.grid ?? { w: 4, h: 2 }
      const w = p.w ?? g.w
      const h = p.h ?? g.h
      const at = p.x !== undefined && p.y !== undefined ? { x: p.x, y: p.y } : placeInGrid(placed, { w, h })
      placed.push({ ...p, ...at, w, h, minW: p.minW ?? g.minW, minH: p.minH ?? g.minH })
    }
    return placed
  }
  const empty = () => {
    const x = b.options.context()
    return b.editing() || x === undefined
      ? []
      : b
          .itemsIn(props.def)
          .filter((p) => !(b.typeOf(p)?.live?.(x, b.configOf(p)) ?? true))
          .map((p) => p.id)
  }
  return (
    <WidgetGrid
      label={props.def.label}
      class={props.class}
      items={cells()}
      editing={b.editing()}
      rowHeight={props.rowHeight}
      empty={empty()}
      itemLabel={(p) => b.typeOf(p)?.label ?? p.id}
      onChange={(next) =>
        b.setLayout(
          b.layout().map((p) => {
            const n = next.find((c) => c.id === p.id)
            return n ? { ...p, x: n.x, y: n.y, w: n.w, h: n.h } : p
          }),
        )
      }
    >
      {(cell) => <WidgetItem board={b} placed={cell()} zone={props.def} placement={props.placement} />}
    </WidgetGrid>
  )
}

/**
 * The widgets of some zones that grew to a full row while they have something to act on, such as an approval over
 * the composer. They draw here, over the zones, so the zones themselves never move or shrink for them.
 */
export function WidgetRows<X>(props: {
  board: WidgetBoardState<X>
  zones: string[]
  placement?: Placement
  class?: string
}): JSX.Element {
  const b = props.board
  const rows = () =>
    props.zones.flatMap((id) => {
      const z = b.zone(id)
      return z && b.visible(z) ? b.rowsIn(z).map((p) => ({ p, z })) : []
    })
  return (
    <Show when={rows().length}>
      <div data-part="widget-rows" class={cx("nc-wrows", props.class)}>
        <For each={rows()} keyed={(r) => r.p.id}>
          {(r) => <WidgetItem board={b} placed={r().p} zone={r().z} placement={props.placement} />}
        </For>
      </div>
    </Show>
  )
}

function placementFor(zone: WidgetZoneDef): Placement {
  return zone.layout === "row" ? "top-start" : "right-start"
}

function WidgetItem<X>(props: {
  board: WidgetBoardState<X>
  placed: WidgetPlacement
  zone: WidgetZoneDef
  placement?: Placement
}) {
  const b = props.board
  // The item is keyed by its widget, so its type never changes.
  const type = untrack(() => b.typeOf(props.placed))!
  const cfg = () => b.configOf(props.placed)
  const x = () => b.options.context() as X
  const grid = () => props.zone.layout === "grid"
  const [pop, setPop] = createSignal(false, { ownedWrite: true })
  const [itemEl, setItemEl] = createSignal<HTMLElement | undefined>(undefined, { ownedWrite: true })
  let press: HTMLElement | undefined
  // While resizing, the form and height the handle shows, committed when it lets go.
  const [sizing, setSizing] = createSignal<{ form: WidgetForm; height?: number } | null>(null, {
    ownedWrite: true,
  })
  const form = () => sizing()?.form ?? b.formOf(props.placed, props.zone)
  const height = () => {
    if (props.zone.layout !== "column" || form() !== "card") return undefined
    const s = sizing()
    const h = s ? s.height : props.placed.height
    return h !== undefined && type.heights?.includes(h) ? h : undefined
  }
  const forms = () => formsIn(type as WidgetType<never>, props.zone).filter((f) => f !== "row")
  /**
   * The sizes a widget steps through, smallest first: in a column a line, its card, then its type's taller `heights`;
   * in a bar a chip, then a line. Only what the zone allows and the type supports.
   */
  type Size = { form: WidgetForm; height?: number }
  const steps = (): Size[] => {
    const f = forms() as WidgetForm[]
    if (props.zone.layout === "row")
      return (["chip", "line"] as WidgetForm[]).filter((x) => f.includes(x)).map((form) => ({ form }))
    const out: Size[] = (["line", "card"] as WidgetForm[])
      .filter((x) => f.includes(x))
      .map((form) => ({ form }))
    if (f.includes("card")) for (const h of type.heights ?? []) out.push({ form: "card", height: h })
    return out
  }
  const stepOf = (s: Size) => {
    const i = steps().findIndex((x) => x.form === s.form && x.height === s.height)
    return i < 0
      ? Math.max(
          0,
          steps().findIndex((x) => x.form === s.form),
        )
      : i
  }
  const resizable = () => !grid() && form() !== "row" && steps().length > 1
  /** Dragging moves one step per 40px, down in a column and across in a bar; it never sets a size of its own. */
  const startResize = (e: PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const sx = e.clientX
    const sy = e.clientY
    const column = props.zone.layout !== "row"
    const from = stepOf({ form: form(), height: height() })
    const move = (m: PointerEvent) => {
      const by = Math.round((column ? m.clientY - sy : m.clientX - sx) / 40)
      const all = steps()
      setSizing(all[Math.max(0, Math.min(all.length - 1, from + by))]!)
    }
    const end = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", end)
      window.removeEventListener("pointercancel", end)
      const s = sizing()
      if (s) b.setSize(props.placed.id, s.form, s.height)
      setSizing(null)
      // The press ends in a click on the item; a resize isn't one.
      const swallow = (c: MouseEvent) => {
        c.stopPropagation()
        c.preventDefault()
      }
      window.addEventListener("click", swallow, { capture: true, once: true })
      setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", end)
    window.addEventListener("pointercancel", end)
  }
  const collapsed = () => !!b.options.collapsible && !grid() && form() === "line" && !props.placed.form
  // A chip or tile opens its card; so does a line in a bar, where there is no room for the card.
  const opens = () =>
    !type.interactive &&
    (form() === "chip" || form() === "tile" || (form() === "line" && props.zone.layout === "row"))
  const where = () => props.placement ?? placementFor(props.zone)
  const setting = () => b.settingsOf() === props.placed.id
  const title = () => type.label
  const menu = () => [
    ...b.options.zones
      .filter(
        (z) => z.id !== props.placed.zone && b.visible(z) && formsIn(type as WidgetType<never>, z).length,
      )
      .map((z) => ({ id: `to:${z.id}`, label: `Move to ${z.label}`, icon: "move" as const })),
    { type: "separator" as const },
    { id: "earlier", label: "Move earlier", icon: "chevron-up" as const },
    { id: "later", label: "Move later", icon: "chevron-down" as const },
    { type: "separator" as const },
    { id: "settings", label: "Settings", icon: "settings" as const },
    { id: "remove", label: "Remove", icon: "trash" as const, danger: true },
  ]
  const select = (id: string) => {
    if (id.startsWith("to:")) b.moveTo(props.placed.id, id.slice(3))
    else if (id === "earlier") b.step(props.placed.id, -1)
    else if (id === "later") b.step(props.placed.id, 1)
    else if (id === "remove") b.remove(props.placed.id)
    else if (id === "settings") {
      b.setEditing(true)
      // After the menu that chose it has closed and given focus back, or its closing would close the settings too.
      setTimeout(() => b.openSettings(props.placed.id), 0)
    } else if (id === "edit") b.setEditing(!b.editing())
  }
  // The context menu, editing or not: the widget's own actions, then its settings, order and removal, and Edit
  // widgets (or Done editing).
  const [menuAt, setMenuAt] = createSignal<{ x: number; y: number } | null>(null, { ownedWrite: true })
  const contextItems = (): RowMenuEntry[] => {
    const mine = type.menu?.(x(), cfg()) ?? []
    return [
      ...mine,
      ...(mine.length ? [{ type: "separator" as const }] : []),
      // Its place is picked in Settings: a "Move to" for every zone would make the menu as long as the board.
      { id: "settings", label: "Settings", icon: "settings" as const },
      { id: "earlier", label: "Move earlier", icon: "chevron-up" as const },
      { id: "later", label: "Move later", icon: "chevron-down" as const },
      { id: "remove", label: "Remove", icon: "trash" as const, danger: true },
      { type: "separator" as const },
      b.editing()
        ? { id: "edit", label: "Done editing", icon: "check" as const }
        : { id: "edit", label: "Edit widgets", icon: "layout-dashboard" as const },
    ]
  }
  const openMenu = (e: MouseEvent | KeyboardEvent, at: { x: number; y: number }) => {
    e.preventDefault()
    e.stopPropagation()
    setMenuAt(at)
  }
  const mark = () => type.mark?.(x(), cfg())
  /** Events from the item's portaled menu and popovers bubble here through Solid; only its own element counts. */
  const own = (e: Event) => {
    const t = e.target as HTMLElement
    return (
      (e.currentTarget as Node).contains(t) &&
      !t.closest(
        '[data-part="popover"], [role="menu"], [role="listbox"], [role="dialog"], .nc-popover, .nc-wboard__more',
      )
    )
  }
  return (
    <div
      data-part="widget-item"
      class="nc-witem"
      ref={setItemEl}
      data-widget-id={props.placed.id}
      data-form={form()}
      data-sized={height() ? "" : undefined}
      data-resizing={sizing() ? "" : undefined}
      style={height() ? { height: `${height()}px` } : undefined}
      data-lifted={b.drag()?.id === props.placed.id ? "" : undefined}
      data-selected={setting() ? "" : undefined}
      onPointerDown={(e) => {
        // While editing the whole widget drags, past 4px. A grid zone drags its own cells.
        if (!b.editing() || grid() || !own(e)) return
        b.startDrag(e, props.placed.id, e.currentTarget as HTMLElement, form())
      }}
      onClick={(e) => {
        if (!b.editing() || grid() || !own(e)) return
        e.preventDefault()
        b.openSettings(setting() ? null : props.placed.id)
      }}
      onContextMenu={(e) => {
        if (own(e)) openMenu(e, { x: e.clientX, y: e.clientY })
      }}
      onKeyDown={(e) => {
        if (own(e) && isMenuKey(e)) openMenu(e, keyboardMenuPoint(e.target as Element))
      }}
    >
      <Show when={menuAt()}>
        {(at) => (
          <RowMenu
            at={at()}
            label={`${title()} widget`}
            items={contextItems()}
            origin={untrack(itemEl)}
            returnFocus={() => itemEl()}
            onClose={() => setMenuAt(null)}
            onSelect={(id) => {
              const entry = contextItems().find((m) => "id" in m && m.id === id) as
                | { onSelect?: () => void }
                | undefined
              setMenuAt(null)
              if (entry?.onSelect) entry.onSelect()
              else select(id)
            }}
          />
        )}
      </Show>
      <Show
        when={opens() || collapsed()}
        fallback={<div class="nc-witem__body">{type.render(x(), form(), cfg())}</div>}
      >
        <button
          type="button"
          class="nc-witem__body nc-witem__press"
          ref={(el) => {
            press = el
          }}
          tabindex={b.editing() ? -1 : undefined}
          aria-expanded={pop() ? "true" : "false"}
          aria-label={title()}
          onClick={() => {
            if (b.editing()) return
            if (collapsed()) b.toggleOpen(props.placed.id)
            else setPop(!pop())
          }}
        >
          {type.render(x(), form(), cfg())}
          <Show when={opens() && mark()}>{(m) => <StatusDot status={m()} class="nc-witem__mark" />}</Show>
        </button>
        <Show when={opens()}>
          <Popover
            open={pop() && !b.editing()}
            anchor={press}
            onClose={() => setPop(false)}
            surface
            placement={where()}
          >
            <div class="nc-witem__pop">{type.render(x(), "card", cfg())}</div>
          </Popover>
        </Show>
      </Show>
      <Show when={b.editing() && resizable()}>
        <span
          class="nc-witem__resize"
          data-part="widget-item-resize"
          aria-hidden="true"
          onPointerDown={startResize}
          onClick={(e) => e.stopPropagation()}
        />
      </Show>
      <Show when={!b.editing() && b.options.collapsible && !grid() && props.placed.open && form() === "card"}>
        <IconButton
          size="sm"
          class="nc-witem__fold"
          icon="chevron-up"
          label={`Collapse ${title()}`}
          onClick={() => b.toggleOpen(props.placed.id)}
        />
      </Show>
      <Show when={b.editing()}>
        <DropdownMenu
          label={`${title()} widget`}
          placement="bottom-end"
          items={menu()}
          onSelect={select}
          trigger={(t) => (
            <IconButton {...t} size="sm" class="nc-wboard__more" icon="more" label={`${title()} widget`} />
          )}
        />
        <Popover
          open={setting()}
          anchor={itemEl()}
          onClose={() => {
            if (b.moving() !== props.placed.id) b.openSettings(null)
          }}
          surface
          placement={where()}
        >
          <WidgetSettings board={b} placed={props.placed} zone={props.zone} />
        </Popover>
      </Show>
    </div>
  )
}

/** A widget's settings, while editing: where it sits, its form, the settings its type declares, and Remove. */
function WidgetSettings<X>(props: {
  board: WidgetBoardState<X>
  placed: WidgetPlacement
  zone: WidgetZoneDef
}) {
  const b = props.board
  const type = untrack(() => b.typeOf(props.placed))!
  const forms = () => formsIn(type as WidgetType<never>, props.zone).filter((f) => f !== "row")
  const places = () =>
    b.options.zones.filter((z) => b.visible(z) && formsIn(type as WidgetType<never>, z).length)
  return (
    <div class="nc-wsettings nc" data-part="widget-settings">
      <div class="nc-wsettings__head">
        <Icon name={type.icon} class="nc-wsettings__icon" />
        <span class="nc-wsettings__title">{type.label}</span>
        <IconButton
          size="sm"
          icon="trash"
          label={`Remove ${type.label}`}
          onClick={() => b.remove(props.placed.id)}
        />
      </div>
      <Show when={places().length > 1}>
        <SettingRow label="Place">
          <Select
            aria-label="Place"
            options={places().map((z) => ({ value: z.id, label: z.label }))}
            value={props.zone.id}
            onChange={(z) => b.moveTo(props.placed.id, z)}
          />
        </SettingRow>
      </Show>
      <Show when={forms().length > 1}>
        <SettingRow label="Size">
          <Select
            aria-label="Size"
            options={forms().map((f, i) => ({
              value: i === 0 ? "auto" : f,
              label: i === 0 ? `${WIDGET_FORM_LABEL[f]} (default)` : WIDGET_FORM_LABEL[f],
            }))}
            value={
              props.placed.form && (forms() as WidgetForm[]).indexOf(props.placed.form) > 0
                ? props.placed.form
                : "auto"
            }
            onChange={(f) => b.setForm(props.placed.id, f === "auto" ? undefined : (f as WidgetForm))}
          />
        </SettingRow>
      </Show>
      <For each={type.settings ?? []}>
        {(s) => (
          <SettingControl
            setting={s}
            value={b.configOf(props.placed)[s.key]}
            onChange={(v) => b.setConfig(props.placed.id, s.key, v)}
          />
        )}
      </For>
    </div>
  )
}

function SettingRow(props: { label: string; children: JSX.Element }) {
  // A div, not a label: a Select's list draws inside the row, and a click in a label clicks its control again.
  return (
    <div class="nc-wsettings__row">
      <span class="nc-wsettings__label">{props.label}</span>
      {props.children}
    </div>
  )
}

function SettingControl(props: {
  setting: WidgetSetting
  value: string | boolean | undefined
  onChange: (v: string | boolean) => void
}) {
  const s = props.setting
  return (
    <SettingRow label={s.label}>
      {s.kind === "toggle" ? (
        <Switch aria-label={s.label} checked={!!props.value} onChange={props.onChange} />
      ) : (
        <Select
          aria-label={s.label}
          options={s.options()}
          value={String(props.value)}
          onChange={props.onChange}
        />
      )}
    </SettingRow>
  )
}
