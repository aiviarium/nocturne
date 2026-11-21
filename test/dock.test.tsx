import { afterEach, describe, expect, test } from "bun:test"
import { createSignal, flush } from "solid-js"
import {
  Dock,
  type DockLayout,
  dockAdd,
  dockFrameOf,
  dockFrames,
  dockLayout,
  dockRemove,
  dockSplit,
  dockSync,
  dockTabs,
  ViewChrome,
  ViewHeader,
} from "../src"
import { click, mount, one } from "./dom"

let cleanup: Array<() => void> = []
afterEach(() => {
  for (const c of cleanup) c()
  cleanup = []
  document.body.innerHTML = ""
})

describe("the dock's layout", () => {
  test("splits a frame to each side, and a frame left without tabs goes", () => {
    let layout = dockLayout(["a", "b", "c"])
    const first = layout.focused
    layout = dockSplit(layout, "b", first, "right")
    expect(layout.columns.map((column) => column.frames.map((frame) => frame.tabs))).toEqual([
      [["a", "c"]],
      [["b"]],
    ])
    expect(layout.focused).toBe(dockFrameOf(layout, "b")!.id)
    expect(layout.columns.map((column) => column.weight)).toEqual([0.5, 0.5])

    layout = dockSplit(layout, "c", first, "bottom")
    expect(layout.columns[0]!.frames.map((frame) => frame.tabs)).toEqual([["a"], ["c"]])

    layout = dockSplit(layout, "a", dockFrameOf(layout, "b")!.id, "left")
    // The first column's top frame had only a; it goes, and a is in a new column before b's.
    expect(layout.columns.map((column) => column.frames.map((frame) => frame.tabs))).toEqual([
      [["c"]],
      [["a"]],
      [["b"]],
    ])
  })

  test("a frame's only tab can't split that frame", () => {
    const layout = dockLayout(["a"])
    expect(dockSplit(layout, "a", layout.focused, "right")).toBe(layout)
  })

  test("closing the shown tab shows its neighbour, and the last tab leaves one empty frame", () => {
    let layout = dockLayout(["a", "b", "c"])
    layout = dockAdd(layout, "d")
    expect(dockFrames(layout)[0]!.active).toBe("d")
    layout = dockRemove(layout, "d")
    expect(dockFrames(layout)[0]!.active).toBe("c")
    for (const tab of ["a", "b", "c"]) layout = dockRemove(layout, tab)
    expect(dockFrames(layout)).toHaveLength(1)
    expect(dockFrames(layout)[0]!.tabs).toEqual([])
  })

  test("follows a list kept elsewhere: new tabs open in the focused frame, gone ones close", () => {
    let layout = dockLayout(["a", "b"])
    layout = dockSplit(layout, "b", layout.focused, "right")
    layout = dockSync(layout, ["a", "b", "c"])
    expect(dockFrameOf(layout, "c")!.id).toBe(dockFrameOf(layout, "b")!.id)
    layout = dockSync(layout, ["a", "c"])
    expect(dockTabs(layout).sort()).toEqual(["a", "c"])
    expect(layout.columns).toHaveLength(2)
  })
})

describe("Dock", () => {
  test("draws a frame per place with its tabs, shows the active tab, and splits from a frame's buttons", () => {
    const [layout, setLayout] = createSignal<DockLayout>(dockLayout(["one", "two"]))
    let next = 3
    const m = mount(() => (
      <Dock
        label="Shells"
        layout={layout()}
        onLayoutChange={setLayout}
        tab={(id) => ({ label: `Shell ${id}` })}
        onSplit={(frameId, edge) => {
          const id = `n${next++}`
          setLayout(dockSplit(dockAdd(layout(), id, frameId), id, frameId, edge))
        }}
      >
        {(id) => <p class="pane-body">Body {id}</p>}
      </Dock>
    ))
    cleanup.push(m.dispose)
    const dock = one("[data-part=dock]", m.root)
    expect(dock.querySelectorAll("[data-dock-frame]")).toHaveLength(1)
    const visible = () =>
      Array.from(dock.querySelectorAll<HTMLElement>("[data-dock-tab]"))
        .filter((pane) => !pane.hidden)
        .map((pane) => pane.textContent)
    expect(visible()).toEqual(["Body one"])

    const tabs = Array.from(
      dock.querySelectorAll<HTMLElement>("[data-part=tab-strip-tab] [role=tab], [role=tab]"),
    )
    click(tabs.find((tab) => tab.textContent?.includes("Shell two"))!)
    flush()
    expect(visible()).toEqual(["Body two"])

    const kept = one("[data-dock-tab=two] .pane-body", dock)
    click(one("[data-part=dock-split-right]", dock))
    flush()
    // A tab that stays in its frame keeps its content: a terminal stays attached.
    expect(kept.isConnected).toBe(true)
    expect(one("[data-dock-tab=two] .pane-body", dock)).toBe(kept)
    expect(dock.querySelectorAll("[data-dock-frame]")).toHaveLength(2)
    expect(layout().columns).toHaveLength(2)
    expect(visible()).toEqual(["Body two", "Body n3"])
    // The new frame has the focus, and only then is any frame marked.
    expect(dock.querySelectorAll("[data-part=frame][data-focused]")).toHaveLength(1)
    expect(one("[data-part=frame][data-focused]", dock).getAttribute("data-dock-frame")).toBe(
      layout().focused,
    )
  })
})

describe("Dock and a view's header", () => {
  test("puts a header with only actions in its tab's strip, and shows the shown tab's alone", () => {
    const [layout, setLayout] = createSignal<DockLayout>(dockLayout(["one", "two"]))
    const [path, setPath] = createSignal(false)
    const ran: string[] = []
    const m = mount(() => (
      <ViewChrome value={{ pinnable: () => false, pinned: () => false, togglePin: () => {}, path }}>
        <Dock label="Pages" layout={layout()} onLayoutChange={setLayout} tab={(id) => ({ label: id })}>
          {(id) => (
            <ViewHeader
              crumbs={[{ label: "Home", href: "/" }, { label: id }]}
              actions={[{ id: `act-${id}`, label: `Act ${id}`, icon: "plus", onClick: () => ran.push(id) }]}
            />
          )}
        </Dock>
      </ViewChrome>
    ))
    cleanup.push(m.dispose)
    flush()
    const dock = one("[data-part=dock]", m.root)
    const strip = one("[data-part=tab-strip]", dock)
    const slots = Array.from(strip.querySelectorAll<HTMLElement>("[data-part=dock-header]"))
    expect(slots).toHaveLength(2)
    expect(slots.filter((slot) => !slot.hidden)).toHaveLength(1)
    // No header row in the pane: the actions are in the strip.
    expect(dock.querySelector("[data-dock-tab] [data-part=view-header]")).toBeNull()
    click(one("[data-action=act-one]", strip))
    expect(ran).toEqual(["one"])

    // A header that shows its path is the pane's own row again.
    setPath(true)
    flush()
    expect(one("[data-dock-tab=one] [data-part=view-header]", dock).textContent).toContain("one")
    expect(strip.querySelector("[data-action=act-one]")).toBeNull()
  })
})
