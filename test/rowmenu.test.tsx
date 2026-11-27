import { afterEach, describe, expect, test } from "bun:test"
import { createSignal, flush } from "solid-js"
import {
  clearToasts,
  DataList,
  DataTable,
  defaultRowMenu,
  isMenuKey,
  ListRow,
  menuTarget,
  NavItem,
  type RowKey,
  RowList,
  reorderItems,
  selectionKey,
  ToastRegion,
} from "../src"
import { all, click, mount, one, press, tick } from "./dom"

let cleanup: Array<() => void> = []
const track = <T extends { dispose: () => void }>(m: T): T => {
  cleanup.push(m.dispose)
  return m
}
afterEach(() => {
  for (const c of cleanup) c()
  cleanup = []
  clearToasts()
  document.body.innerHTML = ""
})

const focused = () => document.activeElement as HTMLElement | null
const rightClick = (el: Element, init: MouseEventInit = {}) => {
  const e = new MouseEvent("contextmenu", {
    bubbles: true,
    cancelable: true,
    clientX: 40,
    clientY: 40,
    ...init,
  })
  el.dispatchEvent(e)
  flush()
  return e
}
const menuItems = () => all("[role=menuitem]").map((e) => e.textContent?.trim())
const menuLabels = () =>
  all("[data-part=menu] [role=presentation], .nc-menu__label").map((e) => e.textContent?.trim())

describe("what a row's menu acts on", () => {
  test("a row in a selection of several acts on the selection; any other row alone, selected first", () => {
    const keys = ["a", "b", "c", "d"]
    expect(menuTarget(keys, ["c", "a"], "a", true)).toEqual({ keys: ["a", "c"], at: "a", reselect: false })
    expect(menuTarget(keys, ["a", "c"], "b", true)).toEqual({ keys: ["b"], at: "b", reselect: true })
    expect(menuTarget(keys, ["b"], "b", true)).toEqual({ keys: ["b"], at: "b", reselect: false })
    // A list that does not select keeps no selection to replace.
    expect(menuTarget(keys, [], "b", false)).toEqual({ keys: ["b"], at: "b", reselect: false })
  })

  test("the Menu key and Shift+F10 open it; Space, Cmd+A and Escape are selection keys", () => {
    expect(isMenuKey({ key: "ContextMenu" })).toBe(true)
    expect(isMenuKey({ key: "F10", shiftKey: true })).toBe(true)
    expect(isMenuKey({ key: "F10" })).toBe(false)
    expect(selectionKey({ key: " " })).toBe("toggle")
    expect(selectionKey({ key: " ", shiftKey: true })).toBe("range")
    expect(selectionKey({ key: "a", metaKey: true })).toBe("all")
    expect(selectionKey({ key: "A", ctrlKey: true })).toBe("all")
    expect(selectionKey({ key: "Escape" })).toBe("none")
    expect(selectionKey({ key: "a" })).toBeNull()
  })

  test("the default menu says what it acts on", () => {
    const one = defaultRowMenu({ count: 1, open: true, rename: true, remove: true })
    expect(one.map((e) => ("label" in e ? e.label : "—"))).toEqual(["Open", "Rename", "—", "Delete"])
    const many = defaultRowMenu({
      count: 3,
      open: true,
      rename: true,
      remove: true,
      actions: [{ id: "archive", label: "Archive" }],
    })
    expect(many.map((e) => ("label" in e ? e.label : "—"))).toEqual([
      "3 selected",
      "Archive",
      "—",
      "Delete 3",
    ])
  })
})

describe("RowList's context menu", () => {
  const Sessions = (props: { seen?: string[]; withMenu?: boolean }) => {
    const [items, setItems] = createSignal(["Alpha", "Beta", "Gamma", "Delta"])
    const [selected, setSelected] = createSignal<RowKey[]>([])
    return (
      <>
        <RowList
          label="Sessions"
          items={items()}
          getKey={(t) => t}
          selectable
          selected={selected()}
          onSelectedChange={setSelected}
          onRemove={(keys) => {
            const before = items()
            setItems(before.filter((t) => !keys.includes(t)))
            flush()
            return () => setItems(before)
          }}
          rowMenu={
            props.withMenu
              ? ({ keys }) => [
                  {
                    id: "archive",
                    label: `Archive ${keys.length}`,
                    onSelect: () => props.seen?.push(keys.join()),
                  },
                  { id: "delete", label: `Delete ${keys.length}`, danger: true },
                ]
              : undefined
          }
        >
          {(t) => <ListRow title={t} onClick={() => {}} />}
        </RowList>
        <ToastRegion />
      </>
    )
  }
  const rows = () => all(".nc-rows__list > .nc-lrow")
  const titles = () => all(".nc-rows__list > .nc-lrow .nc-lrow__title").map((e) => e.textContent)

  test("a right click outside the selection selects that row alone; on the selection it acts on all of it", async () => {
    const seen: string[] = []
    track(mount(() => <Sessions withMenu seen={seen} />))
    const mains = all<HTMLElement>("[data-row-focus]")
    click(mains[0] as HTMLElement)
    mains[2]?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, shiftKey: true }))
    flush()
    expect(all("[data-selected]").length).toBe(3)
    const e = rightClick(rows()[1] as HTMLElement)
    await tick()
    expect(e.defaultPrevented).toBe(true)
    expect(menuItems()).toEqual(["Archive 3", "Delete 3"])
    click(all("[role=menuitem]")[0] as HTMLElement)
    expect(seen).toEqual(["Alpha,Beta,Gamma"])
    rightClick(rows()[3] as HTMLElement)
    await tick()
    expect(all("[data-selected]").map((r) => r.querySelector(".nc-lrow__title")?.textContent)).toEqual([
      "Delta",
    ])
    expect(menuItems()).toEqual(["Archive 1", "Delete 1"])
  })

  test("Delete without an onSelect is the list's removal, with Undo", async () => {
    track(mount(() => <Sessions withMenu />))
    rightClick(rows()[1] as HTMLElement)
    await tick()
    click(all("[role=menuitem]")[1] as HTMLElement)
    await tick()
    expect(titles()).toEqual(["Alpha", "Gamma", "Delta"])
    const undo = all("button").find((b) => b.textContent === "Undo") as HTMLElement
    click(undo)
    await tick()
    expect(titles()).toEqual(["Alpha", "Beta", "Gamma", "Delta"])
  })

  test("without rowMenu a selection's menu is the bar's actions and Delete 3; the Menu key opens it", async () => {
    track(mount(() => <Sessions />))
    const mains = all<HTMLElement>("[data-row-focus]")
    // A plain click opens the row; Cmd and a click selects.
    mains[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, metaKey: true }))
    flush()
    mains[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, metaKey: true }))
    flush()
    ;(mains[1] as HTMLElement).focus()
    press(mains[1] as HTMLElement, "ContextMenu")
    await tick()
    expect(menuItems()).toEqual(["Delete 2"])
    expect(document.body.textContent).toContain("2 selected")
    press(focused() as HTMLElement, "Escape")
    await tick()
    // One row alone: Open (it opens something) and Delete.
    press(mains[3] as HTMLElement, "F10", { shiftKey: true })
    await tick()
    expect(menuItems()).toEqual(["Open", "Delete"])
  })

  test("a row that only opens keeps the browser's menu", async () => {
    track(
      mount(() => (
        <RowList label="Links">
          <ListRow title="Docs" href="/docs" />
        </RowList>
      )),
    )
    const e = rightClick(one(".nc-lrow"))
    await tick()
    expect(e.defaultPrevented).toBe(false)
    expect(all("[role=menu]").length).toBe(0)
  })
})

describe("DataTable manages its rows", () => {
  interface Row {
    id: string
    name: string
    n: number
  }
  const ROWS: Row[] = [
    { id: "a", name: "Alpha", n: 3 },
    { id: "b", name: "Beta", n: 1 },
    { id: "c", name: "Gamma", n: 2 },
  ]
  const Table = (props: { opened?: string[] }) => {
    const [rows, setRows] = createSignal(ROWS)
    return (
      <>
        <DataTable
          label="Things"
          rows={rows()}
          getRowId={(r) => r.id}
          rowLabel={(r) => r.name}
          columns={[
            { id: "name", header: "Name", accessor: (r) => r.name, sortable: true },
            { id: "n", header: "N", accessor: (r) => r.n, type: "num", sortable: true },
          ]}
          selectable
          onRowClick={(r) => props.opened?.push(r.id)}
          onReorder={(from, to) => setRows(reorderItems(rows(), from, to))}
          onRemove={(ids) => {
            const before = rows()
            setRows(before.filter((r) => !ids.includes(r.id)))
            flush()
            return () => setRows(before)
          }}
        />
        <ToastRegion />
      </>
    )
  }
  const trs = () => all<HTMLElement>("tbody tr")
  const names = () => trs().map((tr) => tr.querySelectorAll("td")[1]?.textContent)

  test("no grip column; sorting by a column turns reordering off", async () => {
    track(mount(() => <Table />))
    expect(all(".nc-table__grip, .nc-table__handle").length).toBe(0)
    expect(trs()[0]?.querySelector("td")?.classList.contains("nc-table__check")).toBe(true)
    expect(one("[data-part=data-table]").classList.contains("nc-datatable--movable")).toBe(true)
    click(all(".nc-th-sort")[0] as HTMLElement)
    await tick()
    expect(one("[data-part=data-table]").classList.contains("nc-datatable--movable")).toBe(false)
  })

  test("Alt and an arrow on a row moves it, and says so", async () => {
    track(mount(() => <Table />))
    const first = trs()[0] as HTMLElement
    first.focus()
    press(first, "ArrowDown", { altKey: true })
    await tick()
    expect(trs().map((t) => t.dataset.rowId)).toEqual(["b", "a", "c"])
    expect(document.querySelector("[data-part=data-table] [role=status]")?.textContent).toBe(
      "Alpha moved to position 2 of 3.",
    )
  })

  test("click opens without selecting; Shift and Cmd select without opening; rows are one tab stop", async () => {
    const opened: string[] = []
    track(mount(() => <Table opened={opened} />))
    expect(trs().map((t) => t.tabIndex)).toEqual([0, -1, -1])
    click(trs()[0] as HTMLElement)
    expect(opened).toEqual(["a"])
    expect(trs().map((t) => t.getAttribute("aria-selected"))).toEqual(["false", "false", "false"])
    trs()[2]?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, shiftKey: true }))
    flush()
    expect(trs().map((t) => t.getAttribute("aria-selected"))).toEqual(["true", "true", "true"])
    expect(opened).toEqual(["a"])
    trs()[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, metaKey: true }))
    flush()
    expect(trs().map((t) => t.getAttribute("aria-selected"))).toEqual(["true", "false", "true"])
    // The arrows move focus, Enter opens.
    const row = trs()[0] as HTMLElement
    row.focus()
    press(row, "ArrowDown")
    await tick()
    expect(focused()).toBe(trs()[1] as HTMLElement)
    press(focused() as HTMLElement, "Enter")
    expect(opened).toEqual(["a", "b"])
  })

  test("the menu on a selected row acts on the selection; Delete removes with Undo", async () => {
    track(mount(() => <Table />))
    click(trs()[0] as HTMLElement)
    trs()[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, shiftKey: true }))
    flush()
    rightClick(trs()[1] as HTMLElement)
    await tick()
    expect(menuItems()).toEqual(["Delete 2"])
    press(focused() as HTMLElement, "Escape")
    await tick()
    rightClick(trs()[2] as HTMLElement)
    await tick()
    expect(menuItems()).toEqual(["Open", "Delete"])
    expect(trs().map((t) => t.getAttribute("aria-selected"))).toEqual(["false", "false", "true"])
    click(all("[role=menuitem]")[1] as HTMLElement)
    await tick()
    expect(names()).toEqual(["Alpha", "Beta"])
    click(all("button").find((b) => b.textContent === "Undo") as HTMLElement)
    await tick()
    expect(names()).toEqual(["Alpha", "Beta", "Gamma"])
    const row = trs()[0] as HTMLElement
    row.focus()
    press(row, "Delete")
    await tick()
    expect(names()).toEqual(["Beta", "Gamma"])
  })
})

describe("DataList", () => {
  interface Variable {
    name: string
    value: string
  }
  const Env = (props: { seen?: Variable[][] }) => {
    const [env, setEnv] = createSignal<Variable[]>([
      { name: "A", value: "1" },
      { name: "B", value: "2" },
      { name: "C", value: "3" },
    ])
    return (
      <>
        <DataList
          variant="table"
          label="Environment"
          itemName="Variable"
          itemLabel={(v) => v.name}
          value={env()}
          onChange={(next) => {
            props.seen?.push(next)
            setEnv(next)
            flush()
          }}
          create={() => ({ name: "", value: "" })}
          selectable
          fields={[
            { id: "name", label: "Name", value: (v) => v.name, set: (v, name) => ({ ...v, name }) },
            { id: "value", label: "Value", value: (v) => v.value, set: (v, value) => ({ ...v, value }) },
          ]}
        />
        <ToastRegion />
      </>
    )
  }
  const rows = () => all<HTMLElement>(".nc-datalist__row:not(.nc-datalist__row--add)")
  const names = () => all<HTMLInputElement>("input[aria-label^='Name of']").map((i) => i.value)

  test("a field per column, named by its column and row, under a header; no grip", () => {
    track(mount(() => <Env />))
    expect(all(".nc-datalist__th").map((e) => e.textContent)).toEqual(["Name", "Value"])
    expect(all("input:not([aria-hidden])").map((i) => i.getAttribute("aria-label"))).toEqual([
      "Name of A",
      "Value of A",
      "Name of B",
      "Value of B",
      "Name of C",
      "Value of C",
    ])
    expect(rows()[0]?.querySelector(".nc-datalist__handle, .nc-datalist__remove")).toBeNull()
    const value = one<HTMLInputElement>("input[aria-label='Value of B']")
    value.value = "20"
    value.dispatchEvent(new InputEvent("input", { bubbles: true }))
    flush()
    expect(one<HTMLInputElement>("input[aria-label='Value of B']").value).toBe("20")
  })

  test("unchecking the last selected row clears the selection (the click hits the check mark it removes)", () => {
    track(mount(() => <Env />))
    click(one("[aria-label='Select B']"))
    expect(one("[aria-label='Select B']").getAttribute("aria-checked")).toBe("true")
    // A real click lands on the check mark inside the box, which unchecking removes while the click bubbles.
    const mark = one("[aria-label='Select B'] svg")
    mark.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
    flush()
    expect(one("[aria-label='Select B']").getAttribute("aria-checked")).toBe("false")
    expect(all("[data-part=bulk-bar]").length).toBe(0)
  })

  test("checkboxes and Shift select a range; the bar shows only while something is selected", () => {
    track(mount(() => <Env />))
    expect(all("[data-part=bulk-bar]").length).toBe(0)
    click(one("[aria-label='Select A']"))
    one("[aria-label='Select C']").dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, shiftKey: true }),
    )
    flush()
    expect(rows().map((r) => r.hasAttribute("data-selected"))).toEqual([true, true, true])
    expect(one("[data-part=bulk-bar]").textContent).toContain("3 selected")
    click(one("[aria-label='Select all rows']"))
    expect(all("[data-part=bulk-bar]").length).toBe(0)
  })

  test("Escape leaves a field for its row; on the row Space selects, Shift and an arrow extends, Delete removes with Undo", async () => {
    track(mount(() => <Env />))
    const field = one<HTMLInputElement>("input[aria-label='Name of A']")
    field.focus()
    press(field, "Escape")
    expect(focused()).toBe(rows()[0] as HTMLElement)
    press(rows()[0] as HTMLElement, " ")
    press(rows()[0] as HTMLElement, "ArrowDown", { shiftKey: true })
    await tick()
    expect(focused()).toBe(rows()[1] as HTMLElement)
    expect(rows().map((r) => r.hasAttribute("data-selected"))).toEqual([true, true, false])
    press(rows()[1] as HTMLElement, "Delete")
    await tick()
    expect(names()).toEqual(["C"])
    click(all("button").find((b) => b.textContent === "Undo") as HTMLElement)
    await tick()
    expect(names()).toEqual(["A", "B", "C"])
  })

  test("a right click on a selected row acts on the selection; elsewhere it selects that row alone", async () => {
    track(mount(() => <Env />))
    click(one("[aria-label='Select A']"))
    click(one("[aria-label='Select B']"))
    rightClick(rows()[0] as HTMLElement)
    await tick()
    expect(menuItems()).toEqual(["Delete 2"])
    press(focused() as HTMLElement, "Escape")
    await tick()
    rightClick(one("input[aria-label='Value of C']"))
    await tick()
    expect(rows().map((r) => r.hasAttribute("data-selected"))).toEqual([false, false, true])
    click(all("[role=menuitem]")[0] as HTMLElement)
    await tick()
    expect(names()).toEqual(["A", "B"])
  })

  test("Alt and an arrow moves a row; the selection follows it", async () => {
    track(mount(() => <Env />))
    click(one("[aria-label='Select A']"))
    const field = one<HTMLInputElement>("input[aria-label='Name of A']")
    field.focus()
    press(field, "ArrowDown", { altKey: true })
    await tick()
    expect(names()).toEqual(["B", "A", "C"])
    expect(rows().map((r) => r.hasAttribute("data-selected"))).toEqual([false, true, false])
    expect(menuLabels().length).toBe(0)
  })
})

describe("NavItem menu", () => {
  test("a sidebar row with a menu opens it on a right click and the Menu key; an entry runs itself", () => {
    let ran = ""
    const { root } = track(
      mount(() => (
        <NavItem
          label="Atlas web"
          icon="folder"
          menu={() => [
            { id: "open", label: "Open", onSelect: () => (ran = "open") },
            { id: "rename", label: "Rename", onSelect: () => (ran = "rename") },
          ]}
        />
      )),
    )
    const row = one("[data-part=nav-item]", root)
    const e = rightClick(row)
    expect(e.defaultPrevented).toBe(true)
    expect(menuItems()).toEqual(["Open", "Rename"])
    click(all("[role=menuitem]")[1]!)
    flush()
    expect(ran).toBe("rename")
    expect(all("[role=menuitem]")).toHaveLength(0)
    press(row, "F10", { shiftKey: true })
    flush()
    expect(menuItems()).toEqual(["Open", "Rename"])
  })

  test("without a menu a right click is the browser's", () => {
    const { root } = track(mount(() => <NavItem label="Inbox" icon="inbox" />))
    expect(rightClick(one("[data-part=nav-item]", root)).defaultPrevented).toBe(false)
  })
})

describe("RowList keyed by getKey", () => {
  test("an item replaced with the same key keeps its row, which shows the new item", () => {
    const [items, setItems] = createSignal([
      { id: "a", title: "First" },
      { id: "b", title: "Second" },
    ])
    const { root } = track(
      mount(() => (
        <RowList label="Rows" items={items()} getKey={(x) => x.id}>
          {(x) => <ListRow title={x.title} onClick={() => {}} />}
        </RowList>
      )),
    )
    const before = [...root.querySelectorAll<HTMLElement>("[data-part=list-row]")]
    expect(before.map((r) => r.textContent)).toEqual(["First", "Second"])
    setItems([{ id: "a", title: "First, renamed" }, items()[1]!])
    flush()
    const after = [...root.querySelectorAll<HTMLElement>("[data-part=list-row]")]
    expect(after[0]).toBe(before[0])
    expect(after.map((r) => r.textContent)).toEqual(["First, renamed", "Second"])
    setItems([items()[1]!, items()[0]!])
    flush()
    expect([...root.querySelectorAll<HTMLElement>("[data-part=list-row]")][1]).toBe(before[0])
  })
})
