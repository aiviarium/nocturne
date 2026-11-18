// The pure part of the widget grid: items on a grid of columns and rows of cells, moved and resized without
// overlapping. Moving or resizing an item pushes what is in its way down, and rows with nothing in them close
// up, so a layout is always a dense stack like the ones in Notion or Grafana.

export interface GridItem {
  id: string
  x: number
  y: number
  w: number
  h: number
  /** Smallest size in cells. One by one when missing. */
  minW?: number
  minH?: number
  /** Largest size in cells. The grid's width and 24 rows when missing. */
  maxW?: number
  maxH?: number
}

export const GRID_COLUMNS = 12
export const MAX_ROWS = 24

const int = (n: number) => Math.round(Number.isFinite(n) ? n : 0)

/** An item's size within its own limits and the grid, and its position inside the grid. */
export function clampItem<T extends GridItem>(item: T, cols = GRID_COLUMNS): T {
  const minW = Math.max(1, Math.min(item.minW ?? 1, cols))
  const minH = Math.max(1, item.minH ?? 1)
  const maxW = Math.max(minW, Math.min(item.maxW ?? cols, cols))
  const maxH = Math.max(minH, item.maxH ?? MAX_ROWS)
  const w = Math.min(maxW, Math.max(minW, int(item.w)))
  const h = Math.min(maxH, Math.max(minH, int(item.h)))
  return { ...item, w, h, x: Math.min(cols - w, Math.max(0, int(item.x))), y: Math.max(0, int(item.y)) }
}

export function overlaps(a: GridItem, b: GridItem): boolean {
  return a.id !== b.id && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

const byPosition = (a: GridItem, b: GridItem) => a.y - b.y || a.x - b.x || (a.id < b.id ? -1 : 1)

/** Items in reading order, for a stacked (phone) layout and for the tab order. */
export function reading<T extends GridItem>(items: T[]): T[] {
  return [...items].sort(byPosition)
}

/** Moves every item up as far as it goes without touching another, in reading order. */
export function compact<T extends GridItem>(items: T[]): T[] {
  const placed: T[] = []
  for (const item of reading(items)) {
    let y = item.y
    while (y > 0 && !placed.some((p) => overlaps({ ...item, y: y - 1 }, p))) y--
    placed.push({ ...item, y })
  }
  // Back in the order the caller gave.
  const at = new Map(placed.map((p) => [p.id, p]))
  return items.map((i) => at.get(i.id)!)
}

/**
 * Pushes whatever overlaps `fixed` below it, and whatever that overlaps below that, so that nothing
 * overlaps. `fixed` stays where it is.
 */
function resolve<T extends GridItem>(items: T[], fixed: string): T[] {
  const out = items.map((i) => ({ ...i }))
  const anchor = out.find((i) => i.id === fixed)
  const queue: T[] = anchor ? [anchor] : []
  let guard = 0
  while (queue.length && guard++ < 5000) {
    const pusher = queue.shift()!
    for (const other of reading(out)) {
      if (other.id === fixed || !overlaps(pusher, other)) continue
      other.y = pusher.y + pusher.h
      queue.push(other)
    }
  }
  return out
}

/** Moves one item to a cell, keeping it inside the grid, and makes room for it. */
export function moveItem<T extends GridItem>(
  items: T[],
  id: string,
  x: number,
  y: number,
  cols = GRID_COLUMNS,
): T[] {
  const moved = items.map((i) => (i.id === id ? clampItem({ ...i, x, y }, cols) : i))
  return compact(resolve(moved, id))
}

/** Gives one item a size (within its limits and the grid) and makes room for it. */
export function resizeItem<T extends GridItem>(
  items: T[],
  id: string,
  w: number,
  h: number,
  cols = GRID_COLUMNS,
): T[] {
  const resized = items.map((i) => (i.id === id ? clampItem({ ...i, w, h }, cols) : i))
  return compact(resolve(resized, id))
}

/** Where a new item of the given size goes: the first free spot in reading order, else below everything. */
export function place<T extends GridItem>(
  items: T[],
  size: { w: number; h: number },
  cols = GRID_COLUMNS,
): { x: number; y: number } {
  const w = Math.min(Math.max(1, size.w), cols)
  const bottom = items.reduce((m, i) => Math.max(m, i.y + i.h), 0)
  for (let y = 0; y <= bottom; y++) {
    for (let x = 0; x + w <= cols; x++) {
      const probe = { id: "\0new", x, y, w, h: size.h }
      if (!items.some((i) => overlaps(probe, i))) return { x, y }
    }
  }
  return { x: 0, y: bottom }
}

/** The rows the items take up. */
export function rowCount(items: GridItem[]): number {
  return items.reduce((m, i) => Math.max(m, i.y + i.h), 0)
}

/** A layout that came from storage, made valid: sizes in limits, nothing overlapping, no gaps. */
export function normalize<T extends GridItem>(items: T[], cols = GRID_COLUMNS): T[] {
  const clamped = items.map((i) => clampItem(i, cols))
  const out: T[] = []
  for (const item of reading(clamped)) {
    let y = item.y
    while (out.some((p) => overlaps({ ...item, y }, p))) y++
    out.push({ ...item, y })
  }
  const at = new Map(out.map((p) => [p.id, p]))
  return compact(clamped.map((i) => at.get(i.id)!))
}

/** The cell a pointer offset (in px) from an item's start lands on. */
export function cellDelta(px: number, cell: number, gap: number): number {
  return Math.round(px / (cell + gap))
}

/** Where an item sits outside editing: its columns, and its top and height in px. */
export interface FitBox {
  x: number
  w: number
  top: number
  height: number
}

/** An item's height in px at the stored size: `h` rows and the gaps between them. */
export const cellHeight = (h: number, row: number, gap: number) => h * row + Math.max(0, h - 1) * gap

/**
 * The layout outside editing, a rendering of the stored one that never changes it:
 *
 * - an item in `hidden` (a widget with nothing to show) takes no space;
 * - an item is as tall as its content (`natural`, px), never taller than its stored size; an item not measured
 *   yet (`natural` undefined or 0) keeps its stored size;
 * - items of one stored height that start on the same row and land at the same top are as tall as the tallest
 *   of them, so a row of cards the person made alike ends on one line (a short card beside a tall one of another
 *   height keeps its own height);
 * - everything moves up as far as it goes, in reading order, so the vertical order of the stored layout holds;
 * - then an item widens into the columns a hidden item left, right and then left, where those columns are free for
 *   its whole height (and within its `maxW`), so a hidden item leaves no hole beside its neighbours either. Items
 *   never move sideways, and columns the stored layout left empty on purpose stay empty.
 *
 * `stacked` lays every item full width, one under the other in reading order (a phone).
 */
export function fitLayout<T extends GridItem>(
  items: T[],
  opts: {
    row: number
    gap: number
    hidden?: ReadonlySet<string>
    natural?: (id: string) => number | undefined
    stacked?: boolean
    cols?: number
  },
): { boxes: Map<string, FitBox>; height: number } {
  const cols = opts.cols ?? GRID_COLUMNS
  const shown = reading(items).filter((i) => !opts.hidden?.has(i.id))
  const flat = opts.stacked
    ? shown.map((i, n) => ({ ...i, x: 0, w: cols, y: n }))
    : shown.map((i) => clampItem(i, cols))
  const boxes = new Map<string, FitBox>()
  const placed: Array<{ x: number; w: number; bottom: number }> = []
  const want = (i: T) => {
    const cap = cellHeight(i.h, opts.row, opts.gap)
    const n = opts.natural?.(i.id)
    return n && n > 0 ? Math.min(n, cap) : cap
  }
  for (let at = 0; at < flat.length; ) {
    // The items that start on this stored row.
    let end = at
    while (end < flat.length && flat[end]!.y === flat[at]!.y) end++
    const row = flat.slice(at, end).map((i) => {
      const top = placed
        .filter((p) => p.x < i.x + i.w && i.x < p.x + p.w)
        .reduce((m, p) => Math.max(m, p.bottom + opts.gap), 0)
      return { item: i, top, want: want(i) }
    })
    for (const r of row) {
      const tallest = row
        .filter((o) => o.top === r.top && o.item.h === r.item.h)
        .reduce((m, o) => Math.max(m, o.want), 0)
      const height = Math.min(tallest, cellHeight(r.item.h, opts.row, opts.gap))
      boxes.set(r.item.id, { x: r.item.x, w: r.item.w, top: r.top, height })
    }
    for (const r of row) {
      const b = boxes.get(r.item.id)!
      placed.push({ x: b.x, w: b.w, bottom: b.top + b.height })
    }
    at = end
  }
  if (!opts.stacked && opts.hidden?.size) widen(boxes, items, opts.hidden, cols)
  return { boxes, height: placed.reduce((m, p) => Math.max(m, p.bottom), 0) }
}

/**
 * Widens placed boxes into the columns hidden items left: a column a hidden item covered in rows that overlap the
 * box's stored rows, and that is free for the box's whole fitted height.
 */
function widen(boxes: Map<string, FitBox>, items: GridItem[], hidden: ReadonlySet<string>, cols: number) {
  const stored = new Map(items.map((raw) => [raw.id, clampItem(raw, cols)]))
  const gone = [...stored.values()].filter((i) => hidden.has(i.id))
  const order = [...boxes.entries()].sort((a, b) => a[1].top - b[1].top || a[1].x - b[1].x)
  const clear = (id: string, col: number, top: number, bottom: number) => {
    const own = stored.get(id)!
    const left = gone.some((g) => g.x <= col && col < g.x + g.w && g.y < own.y + own.h && own.y < g.y + g.h)
    return (
      left &&
      order.every(
        ([o, b]) => o === id || !(b.x <= col && col < b.x + b.w && b.top < bottom && top < b.top + b.height),
      )
    )
  }
  for (const [id, b] of order) {
    const raw = items.find((i) => i.id === id)
    const cap = Math.min(cols, raw?.maxW ?? cols)
    const bottom = b.top + b.height
    while (b.w < cap && b.x + b.w < cols && clear(id, b.x + b.w, b.top, bottom)) b.w++
    while (b.w < cap && b.x > 0 && clear(id, b.x - 1, b.top, bottom)) {
      b.x--
      b.w++
    }
  }
}
