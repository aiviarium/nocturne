// The model of a widget board: the types an app offers, the zones a view has, and the layout, a list of placements.
// Pure data and functions; `createWidgetBoard` keeps a layout and `WidgetZone` draws one zone of it.
import type { JSX } from "@solidjs/web"
import type { IconName } from "../components/Icon"
import type { GridItem } from "./grid"

/**
 * The forms a widget takes, from the most room to the least. A widget knows nothing of where it sits: the zone picks
 * the form, out of those the zone allows, and the person may pick another of them.
 *
 * - `card`: a block in a column or a grid cell, with a head and its visual.
 * - `line`: one row, icon, name, a small visual and the figure.
 * - `chip`: a pill in a bar. It opens its card in a popover.
 * - `tile`: a square glyph with its figure, in a narrow strip. It opens its card in a popover.
 * - `row`: a full-width row, while the widget has something to act on (an approval), in a zone that lets it grow.
 */
export type WidgetForm = "card" | "line" | "chip" | "tile" | "row"

export const WIDGET_FORM_LABEL: Record<WidgetForm, string> = {
  card: "Card",
  line: "Line",
  chip: "Chip",
  tile: "Tile",
  row: "Row",
}

/** An instance's settings, by key. */
export type WidgetConfig = Record<string, string | boolean>

/** One setting a widget type declares. The settings popover draws its control. */
export type WidgetSetting =
  | {
      key: string
      label: string
      kind: "choice"
      options: () => { value: string; label: string }[]
      default: string
    }
  | { key: string; label: string; kind: "toggle"; default: boolean }

/**
 * A kind of widget. `X` is what every widget of a board reads, such as the conversation a chat's widgets describe:
 * the board passes it from its `context`.
 */
export interface WidgetType<X = undefined> {
  id: string
  label: string
  icon: IconName
  /** What it is for, in the add menu. */
  hint?: string
  /** The forms it can draw. Default all of them but `row`. */
  forms?: WidgetForm[]
  /** Several of it can be placed, each with its own settings. */
  multiple?: boolean
  /** A control (a picker, a button): its own press target, so a chip of it opens no popover. */
  interactive?: boolean
  settings?: WidgetSetting[]
  /**
   * Taller heights its card can take in a column, in px, smallest first, such as a screen's. Resizing steps through
   * the zone's forms and then these. Without them its card is as tall as its content.
   */
  heights?: number[]
  /** Its size in a grid zone, in cells of 12 columns. Default 4 by 2. */
  grid?: { w: number; h: number; minW?: number; minH?: number }
  /** Whether it has anything to say now. Default true. A board with `hideEmpty` leaves an empty widget out. */
  live?: (x: X, cfg: WidgetConfig) => boolean
  /** A state worth a mark on its chip or tile. */
  mark?: (x: X, cfg: WidgetConfig) => "warn" | "error" | "ai" | undefined
  /** In a zone with `grow`, it takes a full-width `row` while this holds. */
  expands?: (x: X, cfg: WidgetConfig) => boolean
  render: (x: X, form: WidgetForm, cfg: WidgetConfig) => JSX.Element
}

/** A place in a view that holds widgets. */
export interface WidgetZoneDef {
  id: string
  /** Its name, in the settings' Place list and on its empty well while editing: "Left column, top". */
  label: string
  /** The forms its widgets may take. The first is its own, used unless the person picks another. */
  forms: WidgetForm[]
  /** `row` runs its widgets across, `column` down, `grid` on a `WidgetGrid`. Default `column`. */
  layout?: "row" | "column" | "grid"
  /** Its widgets grow to a full-width row while they have something to act on (`WidgetType.expands`). */
  grow?: boolean
}

/** One widget in the layout: which type, in which zone, in what form and with which settings. */
export interface WidgetPlacement extends Partial<Omit<GridItem, "id">> {
  /** The instance's key; for a type placed once, its type. */
  id: string
  /** The widget type; `id` when left out. */
  type?: string
  zone: string
  /** The form, out of those its zone allows; left out, the zone's own. */
  form?: WidgetForm
  cfg?: WidgetConfig
  /** A card's height in px in a column zone: one of its type's `heights`, picked by resizing. Left out, as tall as its content. */
  height?: number
  /** A line in a column that opens to its card (a board with `collapsible`). */
  open?: boolean
}

export const placementType = (p: WidgetPlacement): string => p.type ?? p.id

/** An instance's settings: its own over the type's defaults. */
export function widgetConfig(
  type: WidgetType<never> | undefined,
  cfg: WidgetConfig | undefined,
): WidgetConfig {
  return Object.fromEntries((type?.settings ?? []).map((s) => [s.key, cfg?.[s.key] ?? s.default]))
}

/** The forms a type can take in a zone, the zone's own first. Empty when the type can't go there. */
export function formsIn(type: WidgetType<never> | undefined, zone: WidgetZoneDef): WidgetForm[] {
  const can = type?.forms ?? (["card", "line", "chip", "tile"] as WidgetForm[])
  return zone.forms.filter((f) => can.includes(f))
}

/**
 * Moves a placement to a zone, before another placement or after the last one `inZone` says is in that zone. Its
 * grid position is dropped when it changes zone, so the grid places it anew.
 */
export function moveWidget(
  layout: WidgetPlacement[],
  id: string,
  zone: string,
  before?: string,
  inZone: (p: WidgetPlacement) => boolean = (p) => p.zone === zone,
): WidgetPlacement[] {
  const was = layout.find((p) => p.id === id)
  const rest = layout.filter((p) => p.id !== id)
  const item: WidgetPlacement =
    was && was.zone !== zone ? { ...was, zone, x: undefined, y: undefined } : { ...(was ?? { id }), zone }
  let at = before ? rest.findIndex((p) => p.id === before) : -1
  if (at < 0) {
    const last = rest
      .map((p, i) => [p, i] as const)
      .filter(([p]) => inZone(p))
      .at(-1)
    at = last ? last[1] + 1 : rest.length
  }
  return [...rest.slice(0, at), item, ...rest.slice(at)]
}

/** Swaps a placement with its neighbour among `list` (the zone's widgets in order), by one step either way. */
export function stepWidget(
  layout: WidgetPlacement[],
  list: WidgetPlacement[],
  id: string,
  by: -1 | 1,
): WidgetPlacement[] {
  const i = list.findIndex((x) => x.id === id)
  const other = list[i + by]
  if (i < 0 || !other) return layout
  const ids = layout.map((x) => x.id)
  const a = ids.indexOf(id)
  const b = ids.indexOf(other.id)
  const next = [...layout]
  ;[next[a], next[b]] = [next[b]!, next[a]!]
  return next
}

/** A key for a new instance: the type itself the first time, unless the type may be placed more than once. */
export function newWidgetId(layout: WidgetPlacement[], type: string, multiple?: boolean): string {
  const taken = layout.some((p) => p.id === type)
  if (!multiple && !taken) return type
  let n = 2
  while (layout.some((p) => p.id === `${type}-${n}`)) n++
  return `${type}-${n}`
}
