// Lists, tables and boards without handles or delete buttons: a row is dragged by itself (past a threshold, so a
// press that does not move is a click), selection is the desktop's (a click opens, Cmd/Ctrl toggles, Shift
// selects a range, Shift and an arrow extends, Cmd/Ctrl+A, Escape), deleting is the Delete key and the context
// menu, and the selection is neutral.
import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { createSignal } from "solid-js"
import {
  clearToasts,
  DataList,
  DataTable,
  DRAG_THRESHOLD,
  ListRow,
  PhoneOverride,
  pastThreshold,
  type RowKey,
  RowList,
  reorderItems,
  startsRowDrag,
  ToastRegion,
} from "../src"
import { all, click, mount, one, press, tick } from "./dom"

let cleanup: Array<() => void> = []
const track = <T extends { dispose: () => void }>(m: T): T => {
  cleanup.push(m.dispose)
  return m
}

// Rows 30px tall, one under the other, by their index: happy-dom lays nothing out.
const ROW = 30
const realRect = HTMLElement.prototype.getBoundingClientRect
beforeEach(() => {
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
    const i = this.dataset?.index
    const isRow =
      this.classList.contains("nc-lrow") ||
      this.tagName === "TR" ||
      this.classList.contains("nc-datalist__row")
    const top = i !== undefined && isRow ? Number(i) * ROW : 0
    const height = i !== undefined && isRow ? ROW : 0
    return { top, bottom: top + height, left: 0, right: 300, width: 300, height, x: 0, y: top } as DOMRect
  }
})
afterEach(() => {
  HTMLElement.prototype.getBoundingClientRect = realRect
  for (const c of cleanup) c()
  cleanup = []
  clearToasts()
  document.body.innerHTML = ""
})

const pointer = (target: EventTarget, type: string, y: number, init: PointerEventInit = {}) =>
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      clientX: 20,
      clientY: y,
      ...init,
    }),
  )
const clickWith = (el: Element, init: MouseEventInit) =>
  el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, ...init }))
const menuItems = () => all("[role=menuitem]").map((e) => e.textContent?.trim())
const rightClick = (el: Element) =>
  el.dispatchEvent(
    new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 40, clientY: 40 }),
  )

describe("dragging without a handle: the decisions", () => {
  test("a press that moves past the threshold is a drag; less is a click", () => {
    expect(DRAG_THRESHOLD).toBe(4)
    expect(pastThreshold(3, 0)).toBe(false)
    expect(pastThreshold(0, 4)).toBe(false)
    expect(pastThreshold(3, 3)).toBe(true)
    expect(pastThreshold(0, 9, 10)).toBe(false)
  })

  test("a row is dragged by its body and its main control, never by a field or a control of its own", () => {
    const row = document.createElement("div")
    row.innerHTML =
      '<button class="main"><span class="t">Title</span></button><input /><button class="act">x</button><span class="meta">2m</span>'
    document.body.appendChild(row)
    const q = (s: string) => row.querySelector(s)
    expect(startsRowDrag(q(".t"), row, ".main")).toBe(true)
    expect(startsRowDrag(q(".meta"), row, ".main")).toBe(true)
    expect(startsRowDrag(q("input"), row, ".main")).toBe(false)
    expect(startsRowDrag(q(".act"), row, ".main")).toBe(false)
    expect(startsRowDrag(q(".t"), row)).toBe(false)
  })
})

describe("RowList: drag the row itself", () => {
  const Steps = (props: { moves: Array<[number, number]>; opened?: string[]; menu?: boolean }) => {
    const [items, setItems] = createSignal(["Lint", "Test", "Build", "Ship"])
    return (
      <RowList
        label="Steps"
        items={items()}
        getKey={(s) => s}
        onReorder={(from, to) => {
          props.moves.push([from, to])
          setItems(reorderItems(items(), from, to))
        }}
      >
        {(s) => (
          <ListRow
            title={s}
            onClick={() => props.opened?.push(s)}
            menu={props.menu ? [{ id: "duplicate", label: "Duplicate" }] : undefined}
          />
        )}
      </RowList>
    )
  }
  const titles = () => all(".nc-lrow__title").map((e) => e.textContent)
  const mains = () => all<HTMLElement>("[data-row-focus]")

  test("no grip; a press that moves less than the threshold is a click that opens the row", async () => {
    const moves: Array<[number, number]> = []
    const opened: string[] = []
    track(mount(() => <Steps moves={moves} opened={opened} />))
    expect(all(".nc-lrow__handle, [data-drag-handle]").length).toBe(0)
    const main = mains()[0] as HTMLElement
    pointer(main, "pointerdown", 15)
    pointer(window, "pointermove", 17)
    expect(document.querySelector("[data-lifted]")).toBeNull()
    pointer(window, "pointerup", 17)
    click(main)
    expect(opened).toEqual(["Lint"])
    expect(moves).toEqual([])
  })

  test("past the threshold the row lifts, follows the pointer and drops where the line is; the click is swallowed", async () => {
    const moves: Array<[number, number]> = []
    const opened: string[] = []
    track(mount(() => <Steps moves={moves} opened={opened} />))
    const main = mains()[0] as HTMLElement
    pointer(main, "pointerdown", 15)
    pointer(window, "pointermove", 25)
    expect(one("[data-part=list-row][data-lifted]").textContent).toContain("Lint")
    pointer(window, "pointermove", 80)
    expect(document.querySelector("[data-part=drop-line]")).not.toBeNull()
    pointer(window, "pointerup", 80)
    click(main)
    expect(moves).toEqual([[0, 2]])
    expect(opened).toEqual([])
    expect(titles()).toEqual(["Test", "Build", "Lint", "Ship"])
    expect(document.querySelector("[data-lifted]")).toBeNull()
    await tick()
    expect(one("[role=status]").textContent).toBe("Lint moved to position 3 of 4.")
  })

  test("Escape during a drag puts the row back", () => {
    const moves: Array<[number, number]> = []
    track(mount(() => <Steps moves={moves} />))
    pointer(mains()[1] as HTMLElement, "pointerdown", 45)
    pointer(window, "pointermove", 100)
    press(document.body, "Escape")
    pointer(window, "pointerup", 100)
    expect(moves).toEqual([])
  })

  test("on a touch screen a long press opens the menu, and moving the finger lifts the row and closes it", async () => {
    const moves: Array<[number, number]> = []
    track(
      mount(() => (
        <PhoneOverride.Provider value={true}>
          <Steps moves={moves} menu />
        </PhoneOverride.Provider>
      )),
    )
    const row = all<HTMLElement>("[data-part=list-row]")[0] as HTMLElement
    pointer(mains()[0] as HTMLElement, "pointerdown", 15, { pointerType: "touch" })
    await new Promise((r) => setTimeout(r, 560))
    await tick()
    expect(menuItems()).toEqual(["Duplicate"])
    // A small wobble of the held finger is not a drag.
    pointer(window, "pointermove", 19, { pointerType: "touch" })
    expect(row.hasAttribute("data-lifted")).toBe(false)
    pointer(window, "pointermove", 80, { pointerType: "touch" })
    expect(row.hasAttribute("data-lifted")).toBe(true)
    await tick()
    expect(all("[role=menuitem]").length).toBe(0)
    pointer(window, "pointerup", 80, { pointerType: "touch" })
    expect(moves).toEqual([[0, 2]])
    // The click that ends a drag is swallowed until the next task.
    await tick()
  })
})

describe("RowList: desktop selection", () => {
  const Pages = (props: { opened?: string[]; removed?: RowKey[][] }) => {
    const [items, setItems] = createSignal(["Alpha", "Beta", "Gamma", "Delta", "Echo"])
    const [selected, setSelected] = createSignal<RowKey[]>([])
    return (
      <>
        <RowList
          label="Pages"
          items={items()}
          getKey={(s) => s}
          selectable
          selected={selected()}
          onSelectedChange={setSelected}
          onRemove={(keys) => {
            props.removed?.push(keys)
            const before = items()
            setItems(before.filter((s) => !keys.includes(s)))
            return () => setItems(before)
          }}
        >
          {(s) => <ListRow title={s} onClick={() => props.opened?.push(s)} />}
        </RowList>
        <ToastRegion />
      </>
    )
  }
  const mains = () => all<HTMLElement>("[data-row-focus]")
  const selectedTitles = () =>
    all("[data-part=list-row][data-selected]").map((r) => r.querySelector(".nc-lrow__title")?.textContent)

  test("a plain click opens the row and leaves the selection; Cmd/Ctrl toggles; Shift selects from the anchor", () => {
    const opened: string[] = []
    track(mount(() => <Pages opened={opened} />))
    click(mains()[1] as HTMLElement)
    expect(opened).toEqual(["Beta"])
    expect(selectedTitles()).toEqual([])
    clickWith(mains()[3] as HTMLElement, { shiftKey: true })
    expect(selectedTitles()).toEqual(["Beta", "Gamma", "Delta"])
    clickWith(mains()[2] as HTMLElement, { ctrlKey: true })
    expect(selectedTitles()).toEqual(["Beta", "Delta"])
    clickWith(mains()[4] as HTMLElement, { metaKey: true })
    expect(selectedTitles()).toEqual(["Beta", "Delta", "Echo"])
    clickWith(mains()[4] as HTMLElement, { metaKey: true })
    expect(selectedTitles()).toEqual(["Beta", "Delta"])
    // Selection gestures do not open.
    expect(opened).toEqual(["Beta"])
  })

  test("a Shift press on a row does not start a text selection", () => {
    track(mount(() => <Pages />))
    const e = new MouseEvent("mousedown", { bubbles: true, cancelable: true, shiftKey: true })
    mains()[2]?.dispatchEvent(e)
    expect(e.defaultPrevented).toBe(true)
  })

  test("Shift and an arrow extends from the focused row; Cmd/Ctrl+A selects all; Escape clears", async () => {
    track(mount(() => <Pages />))
    const m = mains()
    m[1]?.focus()
    press(m[1] as HTMLElement, "ArrowDown", { shiftKey: true })
    await tick()
    expect(selectedTitles()).toEqual(["Beta", "Gamma"])
    press(document.activeElement as HTMLElement, "ArrowDown", { shiftKey: true })
    await tick()
    expect(selectedTitles()).toEqual(["Beta", "Gamma", "Delta"])
    press(document.activeElement as HTMLElement, "ArrowUp", { shiftKey: true })
    await tick()
    expect(selectedTitles()).toEqual(["Beta", "Gamma"])
    press(document.activeElement as HTMLElement, "a", { metaKey: true })
    expect(selectedTitles().length).toBe(5)
    press(document.activeElement as HTMLElement, "Escape")
    expect(selectedTitles()).toEqual([])
    expect(document.querySelector("[data-part=bulk-bar]")).toBeNull()
  })

  test("Delete removes the selection; Delete in the context menu removes the selection it was opened on", async () => {
    const removed: RowKey[][] = []
    track(mount(() => <Pages removed={removed} />))
    clickWith(mains()[0] as HTMLElement, { metaKey: true })
    clickWith(mains()[1] as HTMLElement, { metaKey: true })
    mains()[1]?.focus()
    press(mains()[1] as HTMLElement, "Delete")
    expect(removed).toEqual([["Alpha", "Beta"]])
    clickWith(mains()[0] as HTMLElement, { metaKey: true })
    clickWith(mains()[2] as HTMLElement, { shiftKey: true })
    rightClick(all("[data-part=list-row]")[1] as HTMLElement)
    await tick()
    expect(menuItems()).toEqual(["Delete 3"])
    click(all("[role=menuitem]")[0] as HTMLElement)
    expect(removed.at(-1)).toEqual(["Gamma", "Delta", "Echo"])
    expect(document.body.textContent).toContain("Removed 3 items")
  })
})

describe("DataTable: drag the row, desktop selection, neutral checkboxes", () => {
  interface Row {
    id: string
    name: string
  }
  const ROWS: Row[] = [
    { id: "a", name: "Alpha" },
    { id: "b", name: "Beta" },
    { id: "c", name: "Gamma" },
    { id: "d", name: "Delta" },
  ]
  const Table = (props: { opened?: string[]; moves?: Array<[number, number]> }) => {
    const [rows, setRows] = createSignal(ROWS)
    return (
      <>
        <DataTable
          label="Things"
          rows={rows()}
          getRowId={(r) => r.id}
          rowLabel={(r) => r.name}
          columns={[{ id: "name", header: "Name", accessor: (r) => r.name }]}
          selectable
          onRowClick={(r) => props.opened?.push(r.id)}
          onReorder={(from, to) => {
            props.moves?.push([from, to])
            setRows(reorderItems(rows(), from, to))
          }}
          onRemove={(ids) => {
            const before = rows()
            setRows(before.filter((r) => !ids.includes(r.id)))
            return () => setRows(before)
          }}
        />
        <ToastRegion />
      </>
    )
  }
  const trs = () => all<HTMLElement>("tbody tr")
  const selectedIds = () =>
    trs()
      .filter((t) => t.getAttribute("aria-selected") === "true")
      .map((t) => t.dataset.rowId)

  test("a row is dragged by itself past the threshold; a still press opens it", () => {
    const moves: Array<[number, number]> = []
    const opened: string[] = []
    track(mount(() => <Table moves={moves} opened={opened} />))
    const cell = trs()[0]?.querySelectorAll("td")[1] as HTMLElement
    pointer(cell, "pointerdown", 15)
    pointer(window, "pointerup", 15)
    click(cell)
    expect(opened).toEqual(["a"])
    pointer(cell, "pointerdown", 15)
    pointer(window, "pointermove", 22)
    expect(trs()[0]?.hasAttribute("data-lifted")).toBe(true)
    pointer(window, "pointermove", 110)
    pointer(window, "pointerup", 110)
    click(cell)
    expect(moves).toEqual([[0, 3]])
    expect(opened).toEqual(["a"])
    expect(trs().map((t) => t.dataset.rowId)).toEqual(["b", "c", "d", "a"])
  })

  test("a press on the checkbox does not drag", () => {
    const moves: Array<[number, number]> = []
    track(mount(() => <Table moves={moves} />))
    const box = trs()[0]?.querySelector("[data-part=checkbox]") as HTMLElement
    pointer(box, "pointerdown", 15)
    pointer(window, "pointermove", 110)
    pointer(window, "pointerup", 110)
    expect(moves).toEqual([])
  })

  test("Cmd/Ctrl toggles, Shift selects a range, Shift and an arrow extends, Ctrl+A, Escape and Delete", async () => {
    const opened: string[] = []
    track(mount(() => <Table opened={opened} />))
    const root = one("[data-part=data-table]")
    expect(root.hasAttribute("data-selecting")).toBe(false)
    clickWith(trs()[1] as HTMLElement, { ctrlKey: true })
    expect(selectedIds()).toEqual(["b"])
    // While something is selected every checkbox shows.
    expect(root.hasAttribute("data-selecting")).toBe(true)
    clickWith(trs()[3] as HTMLElement, { shiftKey: true })
    expect(selectedIds()).toEqual(["b", "c", "d"])
    clickWith(trs()[2] as HTMLElement, { metaKey: true })
    expect(selectedIds()).toEqual(["b", "d"])
    expect(opened).toEqual([])
    press(trs()[0] as HTMLElement, "Escape")
    expect(selectedIds()).toEqual([])
    const first = trs()[0] as HTMLElement
    first.focus()
    press(first, "ArrowDown", { shiftKey: true })
    await tick()
    press(document.activeElement as HTMLElement, "ArrowDown", { shiftKey: true })
    await tick()
    expect(selectedIds()).toEqual(["a", "b", "c"])
    press(document.activeElement as HTMLElement, "a", { ctrlKey: true })
    expect(selectedIds()).toEqual(["a", "b", "c", "d"])
    press(document.activeElement as HTMLElement, "Escape")
    clickWith(trs()[0] as HTMLElement, { metaKey: true })
    clickWith(trs()[1] as HTMLElement, { metaKey: true })
    ;(trs()[1] as HTMLElement).focus()
    press(trs()[1] as HTMLElement, "Delete")
    await tick()
    expect(trs().map((t) => t.dataset.rowId)).toEqual(["c", "d"])
    expect(document.body.textContent).toContain("Removed 2 rows")
  })
})

describe("DataList: no grip, no remove button", () => {
  test("a row is dragged by its edge; Delete in its context menu removes it", async () => {
    const seen: string[][] = []
    track(
      mount(() => {
        const [tags, setTags] = createSignal(["a", "b", "c"])
        return (
          <>
            <DataList
              label="Tags"
              itemName="Tag"
              value={tags()}
              onChange={(n) => {
                seen.push(n)
                setTags(n)
              }}
            />
            <ToastRegion />
          </>
        )
      }),
    )
    const rows = () => all<HTMLElement>(".nc-datalist__row:not(.nc-datalist__row--add)")
    expect(all(".nc-datalist__handle, .nc-datalist__remove, .nc-datalist__minus").length).toBe(0)
    // A press in the field does not drag (it selects the field's text).
    pointer(rows()[0]?.querySelector("input") as HTMLElement, "pointerdown", 15)
    pointer(window, "pointermove", 80)
    pointer(window, "pointerup", 80)
    expect(seen).toEqual([])
    pointer(rows()[0] as HTMLElement, "pointerdown", 15)
    pointer(window, "pointermove", 80)
    pointer(window, "pointerup", 80)
    expect(seen.at(-1)).toEqual(["b", "c", "a"])
    rightClick(rows()[0] as HTMLElement)
    await tick()
    expect(menuItems()).toEqual(["Delete"])
    click(all("[role=menuitem]")[0] as HTMLElement)
    expect(seen.at(-1)).toEqual(["c", "a"])
  })
})

describe("the selection is neutral", () => {
  const css = ["parts.css", "bundle.css", "extra.css", "board.css"]
    .map((f) => readFileSync(join(import.meta.dir, "../src/styles", f), "utf8"))
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    selector: (m[1] ?? "").trim(),
    body: m[2] ?? "",
  }))
  const SELECTION =
    /\[data-selected\]|aria-selected="true"|\.nc-bulkbar(?![_-])|__check\) > \.nc-check\[aria-checked|nc-board-card\[data-selected\]/

  test("selected rows, cards, checked selection boxes and the bulk bar use no accent", () => {
    const hits = rules.filter((r) => SELECTION.test(r.selector))
    expect(hits.length).toBeGreaterThan(5)
    for (const r of hits) expect(`${r.selector} { ${r.body.trim()} }`).not.toMatch(/--accent/)
  })

  test("a selected row, table row and card take the neutral fill; a checked selection box a neutral mark", () => {
    const decl = (selector: string) => rules.find((r) => r.selector === selector)?.body ?? ""
    expect(decl(".nc-lrow[data-selected]")).toContain("var(--bg-4)")
    expect(decl('.nc-table tr[aria-selected="true"] td')).toContain("var(--bg-4)")
    expect(decl(".nc-board-card[data-selected]")).toContain("var(--bg-4)")
    expect(decl(".nc-datalist__row[data-selected]")).toContain("var(--bg-4)")
    expect(
      decl(':is(.nc-table__check, .nc-datalist__check, .nc-lrow__check) > .nc-check[aria-checked="true"]'),
    ).toContain("var(--text-2)")
  })

  test("the checkbox column shows its boxes on hover, focus and while selecting, and hides them otherwise", () => {
    const decl = (selector: string) => rules.find((r) => r.selector === selector)?.body ?? ""
    expect(decl(".nc-table__check > .nc-check")).toContain("opacity: 0")
    expect(css).toContain(".nc-datatable:is([data-selecting], [data-touch]) .nc-table__check > .nc-check")
  })
})

describe("DataList: a click picks the row, a double click edits", () => {
  test("a row at rest is not being edited; a double click edits it, Escape returns to the row", async () => {
    track(
      mount(() => {
        const [tags, setTags] = createSignal(["auth", "billing"])
        return <DataList label="Tags" itemName="Tag" value={tags()} onChange={setTags} />
      }),
    )
    const rows = () => all<HTMLElement>(".nc-datalist__row:not(.nc-datalist__row--add)")
    const row = rows()[1] as HTMLElement
    expect(row.hasAttribute("data-editing")).toBe(false)
    row.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, clientX: 30, clientY: 5 }))
    await tick()
    const input = row.querySelector("input") as HTMLInputElement
    expect(document.activeElement).toBe(input)
    expect(row.hasAttribute("data-editing")).toBe(true)
    press(input, "Escape")
    await tick()
    await tick()
    expect(document.activeElement).toBe(row)
    expect(row.hasAttribute("data-editing")).toBe(false)
    // Enter on the row edits it too.
    press(row, "Enter")
    await tick()
    expect(row.hasAttribute("data-editing")).toBe(true)
  })

  test("with a mouse, fields of a row at rest let the pointer through to the row", () => {
    const css = readFileSync(join(import.meta.dir, "../src/styles/parts.css"), "utf8")
    expect(css).toMatch(
      /\.nc-datalist:not\(\[data-touch\]\) \.nc-datalist__row:not\(\[data-editing\]\) :is\(input[^)]*\) \{ pointer-events: none; \}/,
    )
  })
})
