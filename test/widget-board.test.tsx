import { afterEach, describe, expect, test } from "bun:test"
import { createSignal, flush } from "solid-js"
import {
  createWidgetBoard,
  memoryStorage,
  moveWidget,
  newWidgetId,
  stepWidget,
  WidgetBoard,
  type WidgetBoardState,
  type WidgetPlacement,
  WidgetRows,
  type WidgetType,
  WidgetZone,
  type WidgetZoneDef,
} from "../src"
import { all, mount, one, tick } from "./dom"

let cleanup: Array<() => void> = []
afterEach(() => {
  for (const c of cleanup) c()
  cleanup = []
  document.body.innerHTML = ""
})

const TYPES: Record<string, WidgetType<string>> = {
  context: {
    id: "context",
    label: "Context",
    icon: "gauge",
    heights: [160, 240],
    render: (x, form) => <b data-form={form}>{x}</b>,
  },
  alerts: {
    id: "alerts",
    label: "Alerts",
    icon: "bell",
    live: () => false,
    render: () => <b>alerts</b>,
  },
  screen: { id: "screen", label: "Screen", icon: "monitor", multiple: true, render: () => <b>screen</b> },
}
const ZONES: WidgetZoneDef[] = [
  { id: "side", label: "Side", forms: ["card", "line"], layout: "column" },
  { id: "bar", label: "Bar", forms: ["chip", "line"], layout: "row" },
]
const INITIAL: WidgetPlacement[] = [
  { id: "context", zone: "side" },
  { id: "alerts", zone: "side" },
]

function board(opts: { fit?: (z: string, w: number) => string } = {}) {
  let b!: WidgetBoardState<string>
  const storage = memoryStorage()
  const m = mount(() => {
    b = createWidgetBoard<string>({
      types: TYPES,
      zones: ZONES,
      initial: INITIAL,
      storage,
      key: "widgets",
      context: () => "c-1",
      hideEmpty: true,
      fit: opts.fit,
    })
    return (
      <WidgetBoard board={b}>
        <WidgetZone board={b} zone="side" />
        <WidgetZone board={b} zone="bar" />
      </WidgetBoard>
    )
  })
  cleanup.push(m.dispose)
  return { b, storage }
}

const ids = (zone: string) =>
  all(`[data-part=widget-zone][data-zone=${zone}] > [data-part=widget-item]`).map((e) => e.dataset.widgetId)

describe("the widget model", () => {
  test("moves a placement to the end of a zone or before another, and steps it by one", () => {
    const l: WidgetPlacement[] = [
      { id: "a", zone: "x" },
      { id: "b", zone: "y" },
      { id: "c", zone: "y" },
    ]
    expect(moveWidget(l, "a", "y").map((p) => p.id)).toEqual(["b", "c", "a"])
    expect(moveWidget(l, "a", "y", "c").map((p) => `${p.id}:${p.zone}`)).toEqual(["b:y", "a:y", "c:y"])
    expect(stepWidget(l, [l[1]!, l[2]!], "c", -1).map((p) => p.id)).toEqual(["a", "c", "b"])
  })

  test("names a new instance after its type, numbered when the type is there already", () => {
    expect(newWidgetId([], "screen")).toBe("screen")
    expect(newWidgetId([{ id: "screen", zone: "x" }], "screen", true)).toBe("screen-2")
  })
})

describe("WidgetBoard context menu", () => {
  test("a right click on a widget opens its own entries, then settings, order, removal and Edit widgets", async () => {
    const { b } = board()
    await tick()
    const item = one("[data-widget-id=context]")
    item.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }),
    )
    flush()
    await tick()
    const labels = all("[role=menuitem]").map((m) => m.textContent?.trim())
    expect(labels).toEqual(["Settings", "Move earlier", "Move later", "Remove", "Edit widgets"])
    // Settings starts editing with the widget's settings open.
    ;(all("[role=menuitem]").find((m) => m.textContent?.includes("Settings")) as HTMLElement).click()
    flush()
    await new Promise((r) => setTimeout(r, 20))
    flush()
    await tick()
    expect(b.editing()).toBe(true)
    expect(b.settingsOf()).toBe("context")
  })
})

describe("WidgetBoard", () => {
  test("draws each zone's widgets in their zone's form, and leaves out an empty one outside editing", async () => {
    board()
    await tick()
    expect(one("[data-part=widget-board]")).toBeTruthy()
    expect(ids("side")).toEqual(["context"])
    expect(one("[data-widget-id=context] b").getAttribute("data-form")).toBe("card")
    // An empty bar takes no room until editing.
    expect(one("[data-zone=bar]").hasAttribute("data-empty")).toBe(true)
  })

  test("editing shows the empty widget too, and its actions add, reset and end it", async () => {
    const { b } = board()
    await tick()
    expect(b.actions().map((a) => a.id)).toEqual(["widgets-edit"])
    b.setEditing(true)
    flush()
    await tick()
    expect(ids("side")).toEqual(["context", "alerts"])
    expect(b.actions().map((a) => a.id)).toEqual(["widgets-add", "widgets-reset", "widgets-done"])
    // Add offers the types not placed yet, and those that may be placed more than once.
    expect(b.addable().map((t) => t.id)).toEqual(["screen"])
    b.actions().find((a) => a.id === "widgets-done")!.onClick!()
    flush()
    expect(b.editing()).toBe(false)
  })

  test("a widget moved to another zone takes that zone's form, and the layout is kept", async () => {
    const { b, storage } = board()
    await tick()
    b.moveTo("context", "bar")
    flush()
    await tick()
    expect(ids("bar")).toEqual(["context"])
    expect(one("[data-widget-id=context] b").getAttribute("data-form")).toBe("chip")
    // A chip opens its card: it's a button.
    expect(one("[data-widget-id=context] .nc-witem__press")).toBeTruthy()
    const kept = JSON.parse(storage.get("widgets")!) as WidgetPlacement[]
    expect(kept.find((p) => p.id === "context")?.zone).toBe("bar")
  })

  test("while editing a click on a widget opens its settings", async () => {
    const { b } = board()
    await tick()
    b.setEditing(true)
    flush()
    await tick()
    one("[data-widget-id=context]").dispatchEvent(new MouseEvent("click", { bubbles: true }))
    flush()
    await tick(4)
    expect(b.settingsOf()).toBe("context")
    expect(one("[data-part=widget-settings]").textContent).toContain("Context")
  })

  test("fit shows a zone's widgets in another zone at a width, without changing the layout", async () => {
    const [narrow, setNarrow] = createSignal(false)
    const { b } = board({ fit: (z) => (narrow() && z === "side" ? "bar" : z) })
    await tick()
    setNarrow(true)
    flush()
    await tick()
    expect(all("[data-zone=side]").length).toBe(0)
    expect(ids("bar")).toEqual(["context"])
    expect(b.layout()[0]!.zone).toBe("side")
  })
})

describe("WidgetRows and resizing", () => {
  test("a widget grown to a row draws in WidgetRows, and its zone keeps its place", async () => {
    let b!: WidgetBoardState<string>
    const m = mount(() => {
      b = createWidgetBoard<string>({
        types: {
          approval: {
            id: "approval",
            label: "Approval",
            icon: "bell",
            expands: () => true,
            render: (_, form) => <b data-form={form}>approve</b>,
          },
        },
        zones: [{ id: "above", label: "Above", forms: ["chip"], layout: "row", grow: true }],
        initial: [{ id: "approval", zone: "above" }],
        context: () => "c-1",
      })
      return (
        <WidgetBoard board={b}>
          <WidgetRows board={b} zones={["above"]} />
          <WidgetZone board={b} zone="above" />
        </WidgetBoard>
      )
    })
    cleanup.push(m.dispose)
    await tick()
    expect(one("[data-part=widget-rows] [data-widget-id=approval] b").getAttribute("data-form")).toBe("row")
    expect(ids("above")).toEqual([])
  })

  test("resizing steps through the forms and the heights the type declares, and nothing else", async () => {
    const { b } = board()
    await tick()
    b.setEditing(true)
    flush()
    await tick()
    expect(one("[data-widget-id=context] [data-part=widget-item-resize]")).toBeTruthy()
    b.setSize("context", "card", 160)
    flush()
    await tick()
    const item = one("[data-widget-id=context]")
    expect(item.style.height).toBe("160px")
    // A height the type doesn't declare isn't honoured.
    b.setSize("context", "card", 190)
    flush()
    await tick()
    expect(item.style.height).toBe("")
    b.setSize("context", "line")
    flush()
    await tick()
    expect(item.getAttribute("data-form")).toBe("line")
    expect(item.style.height).toBe("")
  })
})
