import { describe, expect, test } from "bun:test"
import {
  cellDelta,
  cellHeight,
  clampItem,
  compact,
  fitLayout,
  type GridItem,
  moveItem,
  normalize,
  overlaps,
  place,
  resizeItem,
  rowCount,
} from "../src/lib/grid"

const item = (id: string, x: number, y: number, w = 3, h = 2, rest: Partial<GridItem> = {}): GridItem => ({
  id,
  x,
  y,
  w,
  h,
  ...rest,
})
const at = (items: GridItem[], id: string) => items.find((i) => i.id === id)!
const noOverlap = (items: GridItem[]) =>
  items.every((a) => items.every((b) => a.id === b.id || !overlaps(a, b)))

describe("clampItem", () => {
  test("keeps a size within its limits and the item inside the grid", () => {
    expect(clampItem(item("a", 11, -2, 5, 0, { minW: 2, minH: 1, maxW: 4, maxH: 3 }))).toMatchObject({
      x: 8,
      y: 0,
      w: 4,
      h: 1,
    })
    expect(clampItem(item("a", 0, 0, 99, 99))).toMatchObject({ w: 12, h: 24 })
    expect(clampItem(item("a", 0.4, 1.6, 2.2, 2.7))).toMatchObject({ x: 0, y: 2, w: 2, h: 3 })
  })
})

describe("moveItem", () => {
  test("pushes what is in the way down and keeps the layout dense", () => {
    const items = [item("a", 0, 0), item("b", 3, 0), item("c", 0, 2)]
    const out = moveItem(items, "b", 0, 0)
    expect(at(out, "b")).toMatchObject({ x: 0, y: 0 })
    expect(at(out, "a").y).toBe(2)
    expect(at(out, "c").y).toBe(4)
    expect(noOverlap(out)).toBe(true)
  })
  test("closes the gap an item leaves", () => {
    const items = [item("a", 0, 0), item("b", 0, 2), item("c", 0, 4)]
    const out = moveItem(items, "a", 6, 0)
    expect(at(out, "a")).toMatchObject({ x: 6, y: 0 })
    expect(at(out, "b").y).toBe(0)
    expect(at(out, "c").y).toBe(2)
  })
  test("keeps the item inside the columns and above row zero", () => {
    const out = moveItem([item("a", 0, 0)], "a", 40, -5)
    expect(at(out, "a")).toMatchObject({ x: 9, y: 0 })
  })
  test("does not change the order or the other fields of what it returns", () => {
    const items = [{ ...item("a", 0, 0), extra: 1 }, item("b", 3, 0)]
    const out = moveItem(items, "a", 3, 0)
    expect(out.map((i) => i.id)).toEqual(["a", "b"])
    expect((out[0] as any).extra).toBe(1)
    expect(items[0]).toMatchObject({ x: 0, y: 0 })
  })
  test("never overlaps, whatever the move", () => {
    let items = [item("a", 0, 0, 4, 3), item("b", 4, 0, 4, 2), item("c", 8, 0, 4, 4), item("d", 0, 3, 6, 2)]
    for (const [id, x, y] of [
      ["d", 2, 0],
      ["a", 6, 1],
      ["c", 0, 0],
      ["b", 3, 2],
      ["d", 9, 5],
    ] as const) {
      items = moveItem(items, id, x, y)
      expect(noOverlap(items)).toBe(true)
    }
  })
})

describe("resizeItem", () => {
  test("grows within its limits and pushes neighbours down", () => {
    const items = [item("a", 0, 0, 3, 2, { maxW: 6 }), item("b", 3, 0), item("c", 0, 2)]
    const out = resizeItem(items, "a", 9, 3)
    expect(at(out, "a")).toMatchObject({ w: 6, h: 3 })
    expect(at(out, "b").y).toBe(3)
    expect(at(out, "c").y).toBe(3)
    expect(noOverlap(out)).toBe(true)
  })
  test("cannot shrink below its minimum, or past the right edge", () => {
    const items = [item("a", 9, 0, 3, 2, { minW: 2, minH: 2 })]
    expect(at(resizeItem(items, "a", 1, 1), "a")).toMatchObject({ w: 2, h: 2 })
    expect(at(resizeItem(items, "a", 6, 2), "a")).toMatchObject({ x: 6, w: 6 })
  })
})

describe("compact, place and normalize", () => {
  test("compact lifts items to the top without reordering columns", () => {
    const out = compact([item("a", 0, 4), item("b", 3, 7), item("c", 0, 9)])
    expect(out.map((i) => i.y)).toEqual([0, 0, 2])
  })
  test("place finds the first free spot, then goes below", () => {
    const items = [item("a", 0, 0, 6, 2), item("b", 6, 0, 3, 2)]
    expect(place(items, { w: 3, h: 2 })).toEqual({ x: 9, y: 0 })
    expect(place(items, { w: 6, h: 2 })).toEqual({ x: 0, y: 2 })
    expect(place([], { w: 4, h: 2 })).toEqual({ x: 0, y: 0 })
  })
  test("normalize repairs a stored layout", () => {
    const out = normalize([item("a", 0, 0, 20, 2), item("b", 0, 0, 3, 2), item("c", 5.5, -1, 0, 0)])
    expect(noOverlap(out)).toBe(true)
    expect(at(out, "a").w).toBe(12)
    expect(out.every((i) => i.x >= 0 && i.x + i.w <= 12 && i.y >= 0)).toBe(true)
    expect(rowCount(out)).toBeGreaterThan(0)
  })
  test("cellDelta rounds a pointer offset to whole cells", () => {
    expect(cellDelta(0, 80, 12)).toBe(0)
    expect(cellDelta(46, 80, 12)).toBe(1)
    expect(cellDelta(45, 80, 12)).toBe(0)
    expect(cellDelta(-100, 80, 12)).toBe(-1)
  })
})

describe("fitLayout", () => {
  const row = 80
  const gap = 12
  // Two figures on top, a list under the left one, a tall list on the right.
  const items: GridItem[] = [
    { id: "jobs", x: 0, y: 0, w: 4, h: 3 },
    { id: "inbox", x: 4, y: 0, w: 4, h: 3 },
    { id: "recent", x: 8, y: 0, w: 4, h: 4 },
    { id: "stat", x: 0, y: 3, w: 4, h: 2 },
    { id: "clock", x: 4, y: 3, w: 4, h: 2 },
    { id: "text", x: 0, y: 5, w: 8, h: 2 },
  ]

  test("without measurements and nothing hidden it draws the stored layout", () => {
    const { boxes, height } = fitLayout(items, { row, gap })
    expect(boxes.get("jobs")).toEqual({ x: 0, w: 4, top: 0, height: cellHeight(3, row, gap) })
    expect(boxes.get("stat")!.top).toBe(3 * (row + gap))
    expect(boxes.get("text")!.top).toBe(5 * (row + gap))
    expect(height).toBe(cellHeight(7, row, gap))
  })

  test("a hidden item takes no space and what was under it moves up; the items keep their columns", () => {
    const { boxes } = fitLayout(items, { row, gap, hidden: new Set(["jobs", "inbox"]) })
    expect(boxes.has("jobs")).toBe(false)
    expect(boxes.get("stat")).toMatchObject({ x: 0, w: 4, top: 0 })
    expect(boxes.get("clock")).toMatchObject({ x: 4, w: 4, top: 0 })
    expect(boxes.get("text")!.top).toBe(cellHeight(2, row, gap) + gap)
    // The stored layout is untouched.
    expect(items[0]).toEqual({ id: "jobs", x: 0, y: 0, w: 4, h: 3 })
  })

  test("an item widens into the columns a hidden neighbour left, where they are free for its whole height", () => {
    // Home: a list and a clock with the jobs widget between them, then two small cards under the clock.
    const home: GridItem[] = [
      { id: "prs", x: 0, y: 0, w: 6, h: 3 },
      { id: "jobs", x: 6, y: 0, w: 2, h: 2 },
      { id: "clock", x: 8, y: 0, w: 4, h: 2 },
      { id: "inbox", x: 6, y: 2, w: 3, h: 2 },
      { id: "timer", x: 9, y: 2, w: 3, h: 2 },
    ]
    const { boxes } = fitLayout(home, { row, gap, hidden: new Set(["jobs"]) })
    expect(boxes.get("prs")).toMatchObject({ x: 0, w: 6, top: 0 })
    // The clock takes the jobs widget's columns; the list cannot, the inbox card sits in them lower down.
    expect(boxes.get("clock")).toMatchObject({ x: 6, w: 6, top: 0 })
    expect(boxes.get("inbox")).toMatchObject({ x: 6, w: 3 })
    expect(boxes.get("timer")).toMatchObject({ x: 9, w: 3 })
  })

  test("columns left empty on purpose stay empty, and widening respects maxW", () => {
    const layout: GridItem[] = [
      { id: "a", x: 0, y: 0, w: 4, h: 2, maxW: 6 },
      { id: "gone", x: 4, y: 0, w: 4, h: 2 },
      { id: "b", x: 8, y: 0, w: 3, h: 2 },
      { id: "page", x: 0, y: 2, w: 6, h: 2 },
    ]
    const { boxes } = fitLayout(layout, { row, gap, hidden: new Set(["gone"]) })
    expect(boxes.get("a")).toMatchObject({ x: 0, w: 6 })
    expect(boxes.get("b")).toMatchObject({ x: 6, w: 5 })
    // Column 11 was empty in the stored layout; nothing grows into it, nor into page's free columns.
    expect(boxes.get("page")).toMatchObject({ x: 0, w: 6 })
  })

  test("the compacted example keeps its shape: the clock stays at the right, the list moves up beside it", () => {
    const layout: GridItem[] = [
      { id: "inbox", x: 0, y: 0, w: 4, h: 3 },
      { id: "checks", x: 4, y: 0, w: 4, h: 3 },
      { id: "clock", x: 8, y: 0, w: 4, h: 2 },
      { id: "pulls", x: 0, y: 3, w: 8, h: 4 },
      { id: "text", x: 8, y: 3, w: 4, h: 2 },
    ]
    const { boxes } = fitLayout(layout, { row, gap, hidden: new Set(["inbox", "checks"]) })
    expect(boxes.get("clock")).toMatchObject({ x: 8, w: 4, top: 0 })
    expect(boxes.get("pulls")).toMatchObject({ x: 0, w: 8, top: 0 })
  })

  test("an item is as tall as its content, never taller than its size, and a row of one height ends on one line", () => {
    const natural: Record<string, number> = {
      jobs: 90,
      inbox: 130,
      recent: 900,
      stat: 100,
      clock: 120,
      text: 40,
    }
    const { boxes } = fitLayout(items, { row, gap, natural: (id) => natural[id] })
    // jobs and inbox share a row and a height: both as tall as inbox.
    expect(boxes.get("jobs")!.height).toBe(130)
    expect(boxes.get("inbox")!.height).toBe(130)
    // recent is capped at its four rows; it is taller than the others, so it keeps its own height.
    expect(boxes.get("recent")!.height).toBe(cellHeight(4, row, gap))
    expect(boxes.get("stat")).toMatchObject({ top: 130 + gap, height: 120 })
    expect(boxes.get("text")).toMatchObject({ top: 130 + gap + 120 + gap, height: 40 })
  })

  test("a short card beside a taller one of another height keeps its own height", () => {
    const pair: GridItem[] = [
      { id: "page", x: 0, y: 0, w: 8, h: 6 },
      { id: "cycle", x: 8, y: 0, w: 4, h: 2 },
      { id: "pages", x: 8, y: 2, w: 4, h: 4 },
    ]
    const natural: Record<string, number> = { page: 2000, cycle: 100, pages: 200 }
    const { boxes } = fitLayout(pair, { row, gap, natural: (id) => natural[id] })
    expect(boxes.get("cycle")!.height).toBe(100)
    expect(boxes.get("pages")!.top).toBe(100 + gap)
  })

  test("stacked, every item is full width in reading order", () => {
    const { boxes } = fitLayout(items, { row, gap, stacked: true, hidden: new Set(["inbox"]) })
    const order = [...boxes.entries()].sort((a, b) => a[1].top - b[1].top).map(([id]) => id)
    expect(order).toEqual(["jobs", "recent", "stat", "clock", "text"])
    for (const b of boxes.values()) expect(b).toMatchObject({ x: 0, w: 12 })
  })

  test("nothing overlaps and nothing leaves the grid whatever is hidden", () => {
    const ids = items.map((i) => i.id)
    for (let mask = 0; mask < 1 << ids.length; mask++) {
      const hidden = new Set(ids.filter((_, k) => mask & (1 << k)))
      const natural = (id: string) => ((id.length * 37 + mask * 53) % 400) + 1
      const { boxes } = fitLayout(items, { row, gap, natural, hidden })
      const list = [...boxes.values()]
      expect(list.length).toBe(ids.length - hidden.size)
      for (const b of list) expect(b.x + b.w).toBeLessThanOrEqual(12 + 1e-9)
      for (const [i, a] of list.entries())
        for (const b of list.slice(i + 1))
          expect(
            a.x < b.x + b.w - 1e-9 &&
              b.x < a.x + a.w - 1e-9 &&
              a.top < b.top + b.height &&
              b.top < a.top + a.height,
          ).toBe(false)
    }
  })

  test("nothing overlaps whatever the measurements", () => {
    for (let n = 0; n < 50; n++) {
      const natural = (id: string) => ((id.length * 37 + n * 53) % 400) + 1
      const { boxes } = fitLayout(items, { row, gap, natural })
      const list = [...boxes.values()]
      for (const [i, a] of list.entries())
        for (const b of list.slice(i + 1))
          expect(
            a.x < b.x + b.w && b.x < a.x + a.w && a.top < b.top + b.height && b.top < a.top + a.height,
          ).toBe(false)
    }
  })
})
