import { afterEach, describe, expect, test } from "bun:test"
import { createSignal, flush } from "solid-js"
import { type GridItem, WidgetGrid } from "../src"
import { all, mount, one, press, tick } from "./dom"

let cleanup: Array<() => void> = []
afterEach(() => {
  for (const c of cleanup) c()
  cleanup = []
  document.body.innerHTML = ""
})

const start: GridItem[] = [
  { id: "a", x: 0, y: 0, w: 3, h: 2 },
  { id: "b", x: 3, y: 0, w: 3, h: 2, maxW: 4 },
]

function grid(editing: boolean) {
  const [items, setItems] = createSignal<GridItem[]>(start)
  const changes: GridItem[][] = []
  const m = mount(() => (
    <WidgetGrid
      label="Widgets"
      items={items()}
      editing={editing}
      onChange={(next) => {
        changes.push(next)
        setItems(next)
        flush()
      }}
    >
      {(item) => <span data-testid={`content-${item().id}`}>{item().id}</span>}
    </WidgetGrid>
  ))
  cleanup.push(m.dispose)
  return { changes, items }
}

const cell = (id: string) => one(`[data-widget-id=${id}]`).getAttribute("data-grid")

describe("WidgetGrid", () => {
  test("lays items out by cell and is not arrangeable unless editing", async () => {
    grid(false)
    await tick()
    expect(cell("a")).toBe("0,0,3,2")
    expect(cell("b")).toBe("3,0,3,2")
    expect(one("[data-part=widget-grid]").hasAttribute("data-editing")).toBe(false)
    expect(all("[data-part=widget-resize]")).toHaveLength(0)
    expect(one("[data-widget-id=a]").getAttribute("tabindex")).toBeNull()
    expect(one("[data-widget-id=b]").getAttribute("style")).toContain("--wg-x: 3")
  })

  test("arrow keys move an item, Shift resizes it within its limits, and the content stays mounted", async () => {
    const { changes } = grid(true)
    await tick()
    const a = one("[data-widget-id=a]")
    const content = one("[data-testid=content-a]")
    expect(all("[data-part=widget-resize]")).toHaveLength(2)
    // Moving down finds nothing under it, so it closes up again: no gaps.
    press(a, "ArrowDown")
    await tick()
    expect(cell("a")).toBe("0,0,3,2")
    // One column right it lands on b, which is pushed below it.
    press(a, "ArrowRight")
    await tick()
    expect(cell("a")).toBe("1,0,3,2")
    expect(cell("b")).toBe("3,2,3,2")
    expect(one("[data-testid=content-a]")).toBe(content)
    press(one("[data-widget-id=b]"), "ArrowRight", { shiftKey: true })
    press(one("[data-widget-id=b]"), "ArrowRight", { shiftKey: true })
    await tick()
    expect(cell("b")?.split(",").slice(2, 3)[0]).toBe("4")
    expect(changes).toHaveLength(4)
    // Keys that bubble up from inside an item do nothing.
    press(content, "ArrowLeft")
    expect(changes).toHaveLength(4)
  })

  test("an empty item takes no space outside editing, keeps its cell while editing, and the layout is not changed", async () => {
    const [editing, setEditing] = createSignal(false)
    const [empty, setEmpty] = createSignal<string[]>(["a"])
    const changes: GridItem[][] = []
    const items: GridItem[] = [
      { id: "a", x: 0, y: 0, w: 6, h: 2 },
      { id: "b", x: 0, y: 2, w: 6, h: 2 },
    ]
    const m = mount(() => (
      <WidgetGrid
        label="Widgets"
        items={items}
        empty={empty()}
        editing={editing()}
        onChange={(n) => changes.push(n)}
      >
        {(item) => <span>{item().id}</span>}
      </WidgetGrid>
    ))
    cleanup.push(m.dispose)
    await tick()
    const grid = one("[data-part=widget-grid]")
    expect(grid.hasAttribute("data-fit")).toBe(true)
    expect(one("[data-widget-id=a]").hasAttribute("data-hidden")).toBe(true)
    // b is drawn at the top, where a was; its stored cell is unchanged.
    expect(one("[data-widget-id=b]").style.getPropertyValue("--wg-top")).toBe("0px")
    expect(cell("b")).toBe("0,2,6,2")
    // Editing shows the stored cells, a included.
    setEditing(true)
    flush()
    await tick()
    expect(grid.hasAttribute("data-fit")).toBe(false)
    expect(one("[data-widget-id=a]").hasAttribute("data-hidden")).toBe(false)
    // Something to show: a comes back outside editing, and b goes below it.
    setEditing(false)
    flush()
    setEmpty([])
    flush()
    await tick()
    expect(one("[data-widget-id=a]").hasAttribute("data-hidden")).toBe(false)
    expect(one("[data-widget-id=b]").style.getPropertyValue("--wg-top")).toBe(`${2 * 80 + 12 + 12}px`)
    expect(changes).toHaveLength(0)
  })
})
