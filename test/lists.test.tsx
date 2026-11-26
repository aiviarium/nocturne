import { afterEach, describe, expect, test } from "bun:test"
import { createSignal, flush } from "solid-js"
import {
  autoScrollSpeed,
  clearToasts,
  DataList,
  DataListInput,
  dropSlot,
  gestureOf,
  Icon,
  ListRow,
  type RowKey,
  RowList,
  RowSection,
  reorderItems,
  selectRows,
  slotToIndex,
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
const titles = () => all(".nc-rows__list > .nc-lrow .nc-lrow__title").map((e) => e.textContent)
const mains = () => all<HTMLElement>("[data-row-focus]")

describe("reorder and selection logic", () => {
  test("reorderItems moves one item to the index it ends at", () => {
    expect(reorderItems(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"])
    expect(reorderItems(["a", "b", "c", "d"], 3, 0)).toEqual(["d", "a", "b", "c"])
    expect(reorderItems(["a", "b"], 1, 1)).toEqual(["a", "b"])
    expect(reorderItems(["a", "b"], 5, 0)).toEqual(["a", "b"])
  })

  test("a pointer points at the gap before the first row whose middle is below it", () => {
    const mids = [15, 45, 75]
    expect(dropSlot(mids, 0)).toBe(0)
    expect(dropSlot(mids, 20)).toBe(1)
    expect(dropSlot(mids, 74)).toBe(2)
    expect(dropSlot(mids, 200)).toBe(3)
    // Dropping into the gap after itself, or before itself, leaves a row where it was.
    expect(slotToIndex(1, 1)).toBe(1)
    expect(slotToIndex(1, 2)).toBe(1)
    expect(slotToIndex(1, 3)).toBe(2)
    expect(slotToIndex(2, 0)).toBe(0)
  })

  test("a drag scrolls only near an edge, faster the closer it is", () => {
    expect(autoScrollSpeed(300, 0, 600)).toBe(0)
    expect(autoScrollSpeed(10, 0, 600)).toBeLessThan(0)
    expect(autoScrollSpeed(590, 0, 600)).toBeGreaterThan(0)
    expect(autoScrollSpeed(599, 0, 600)).toBeGreaterThan(autoScrollSpeed(560, 0, 600))
    expect(autoScrollSpeed(700, 0, 600)).toBe(autoScrollSpeed(600, 0, 600))
    // A short scroller keeps a middle where nothing scrolls.
    expect(autoScrollSpeed(50, 0, 100)).toBe(0)
  })

  test("click, toggle, range and select-all", () => {
    const keys = ["a", "b", "c", "d", "e"]
    let s = selectRows(keys, { selected: [], anchor: null }, "only", "b")
    expect(s).toEqual({ selected: ["b"], anchor: "b" })
    s = selectRows(keys, s, "toggle", "d")
    expect(s.selected).toEqual(["b", "d"])
    s = selectRows(keys, s, "range", "a")
    expect(s.selected).toEqual(["a", "b", "c", "d"])
    expect(s.anchor).toBe("d")
    s = selectRows(keys, s, "toggle", "c")
    expect(s.selected).toEqual(["a", "b", "d"])
    expect(selectRows(keys, s, "all").selected).toEqual(keys)
    expect(selectRows(keys, s, "none")).toEqual({ selected: [], anchor: null })
    // Keys no longer in the list drop out.
    expect(selectRows(["a", "b"], { selected: ["a", "z"], anchor: "z" }, "range", "b").selected).toEqual([
      "b",
    ])
    expect(gestureOf({ shiftKey: true })).toBe("range")
    expect(gestureOf({ metaKey: true })).toBe("toggle")
    expect(gestureOf({ ctrlKey: true })).toBe("toggle")
    expect(gestureOf({})).toBe("only")
  })
})

describe("RowList keyboard", () => {
  test("one tab stop for the list; the arrows, Home and End move focus between rows", async () => {
    track(
      mount(() => (
        <RowList label="Pages">
          <ListRow title="One" onClick={() => {}} />
          <ListRow title="Two" onClick={() => {}} />
          <ListRow title="Three" href="#three" />
        </RowList>
      )),
    )
    await tick()
    expect(mains().map((m) => m.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"])
    mains()[0]?.focus()
    press(mains()[0] as HTMLElement, "ArrowDown")
    expect(focused()?.textContent).toBe("Two")
    press(focused() as HTMLElement, "End")
    expect(focused()?.textContent).toBe("Three")
    press(focused() as HTMLElement, "ArrowDown")
    expect(focused()?.textContent).toBe("Three")
    press(focused() as HTMLElement, "Home")
    expect(focused()?.textContent).toBe("One")
    press(focused() as HTMLElement, "ArrowDown")
    await tick()
    // The row last focused is the list's tab stop.
    expect(mains().map((m) => m.getAttribute("tabindex"))).toEqual(["-1", "0", "-1"])
  })

  test("variant is the list's", () => {
    const { root } = track(
      mount(() => (
        <RowList label="Rows" variant="inset">
          <ListRow title="A" />
          <ListRow title="B" />
        </RowList>
      )),
    )
    expect(one("[data-part=row-list]", root).classList.contains("nc-rows--inset")).toBe(true)
    expect(one("[data-part=row-list]", root).getAttribute("data-variant")).toBe("inset")
  })

  test("flush is the inset variant", () => {
    const { root } = track(mount(() => <RowList label="Rows" flush />))
    expect(one("[data-part=row-list]", root).getAttribute("data-variant")).toBe("inset")
  })
})

describe("RowList reordering", () => {
  const Steps = (props: { onMove?: (from: number, to: number) => void; virtualizeAt?: number }) => {
    const [items, setItems] = createSignal(["Lint", "Test", "Build", "Ship"])
    return (
      <div style={{ height: "300px" }}>
        <RowList
          label="Steps"
          items={items()}
          getKey={(s) => s}
          virtualizeAt={props.virtualizeAt}
          onReorder={(from, to) => {
            props.onMove?.(from, to)
            setItems(reorderItems(items(), from, to))
            flush()
          }}
        >
          {(s) => <ListRow title={s} />}
        </RowList>
      </div>
    )
  }

  test("no row has a grip: the row itself is what moves", () => {
    track(
      mount(() => (
        <RowList label="Steps" items={["a", "b"]} getKey={(s) => s} onReorder={() => {}}>
          {(s) => <ListRow title={s} movable={s !== "b"} />}
        </RowList>
      )),
    )
    expect(all(".nc-lrow__handle, [data-drag-handle]").length).toBe(0)
    expect(all("[data-part=list-row][data-movable]").length).toBe(1)
  })

  test("Alt and an arrow move the focused row at once", async () => {
    const moves: Array<[number, number]> = []
    track(mount(() => <Steps onMove={(f, t) => moves.push([f, t])} />))
    await tick()
    mains()[1]?.focus()
    press(mains()[1] as HTMLElement, "ArrowDown", { altKey: true })
    expect(moves).toEqual([[1, 2]])
    expect(titles()).toEqual(["Lint", "Build", "Test", "Ship"])
    await tick()
    expect(focused()?.textContent).toBe("Test")
  })

  test("indices are the items', so a virtualised list reorders too", async () => {
    const moves: Array<[number, number]> = []
    track(mount(() => <Steps virtualizeAt={2} onMove={(f, t) => moves.push([f, t])} />))
    await tick()
    expect(document.querySelector("[role=listbox]")).not.toBeNull()
    const row = all<HTMLElement>("[data-row-focus]")[0] as HTMLElement
    row.focus()
    press(row, "ArrowDown", { altKey: true })
    expect(moves).toEqual([[0, 1]])
  })
})

describe("RowList selection and removal", () => {
  const Pages = (props: {
    onRemove?: (keys: RowKey[]) => void
    undo?: boolean
    onSelected?: (keys: RowKey[]) => void
  }) => {
    const [items, setItems] = createSignal(["Alpha", "Beta", "Gamma", "Delta"])
    return (
      <RowList
        label="Pages"
        items={items()}
        getKey={(s) => s}
        selectable
        onSelectedChange={props.onSelected}
        bulkActions={(sel) => <button type="button">Archive {sel.length}</button>}
        onRemove={(keys) => {
          props.onRemove?.(keys)
          const before = items()
          setItems(before.filter((s) => !keys.includes(s)))
          flush()
          return props.undo ? () => setItems(before) : undefined
        }}
      >
        {(s) => <ListRow title={s} />}
      </RowList>
    )
  }

  test("click selects one, Ctrl and a click adds, Shift and a click selects a range", () => {
    const seen: RowKey[][] = []
    track(mount(() => <Pages onSelected={(k) => seen.push(k)} />))
    expect(document.querySelector("[data-part=bulk-bar]")).toBeNull()
    const m = mains()
    click(m[0] as HTMLElement)
    ;(m[2] as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true }))
    flush()
    expect(seen.at(-1)).toEqual(["Alpha", "Gamma"])
    ;(m[3] as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true }))
    flush()
    expect(seen.at(-1)).toEqual(["Gamma", "Delta"])
    expect(all("[data-part=list-row][data-selected]").length).toBe(2)
    expect(one(".nc-rows__count").textContent).toBe("2 selected")
    expect(one("[data-part=bulk-bar]").textContent).toContain("Archive 2")
    // The main control says it is pressed.
    expect(m[2]?.getAttribute("aria-pressed")).toBe("true")
  })

  test("Space toggles the focused row, Ctrl+A selects all, Escape clears and the bar goes", () => {
    track(mount(() => <Pages />))
    const m = mains()
    m[1]?.focus()
    press(m[1] as HTMLElement, " ")
    expect(one(".nc-rows__count").textContent).toBe("1 selected")
    press(m[1] as HTMLElement, "a", { ctrlKey: true })
    expect(one(".nc-rows__count").textContent).toBe("4 selected")
    // Every row is selected: no "Select all".
    expect(one("[data-part=bulk-bar]").textContent).not.toContain("Select all")
    press(m[1] as HTMLElement, "Escape")
    expect(document.querySelector("[data-part=bulk-bar]")).toBeNull()
  })

  test("Delete removes the focused row, or the selection it is in, and focus stays in the list", async () => {
    const removed: RowKey[][] = []
    track(mount(() => <Pages onRemove={(k) => removed.push(k)} />))
    let m = mains()
    m[1]?.focus()
    press(m[1] as HTMLElement, "Delete")
    expect(removed).toEqual([["Beta"]])
    expect(titles()).toEqual(["Alpha", "Gamma", "Delta"])
    await tick()
    expect(focused()?.textContent).toBe("Gamma")
    m = mains()
    click(m[0] as HTMLElement)
    ;(m[1] as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true, metaKey: true }))
    flush()
    m[1]?.focus()
    press(m[1] as HTMLElement, "Backspace")
    expect(removed.at(-1)).toEqual(["Alpha", "Gamma"])
    expect(titles()).toEqual(["Delta"])
    expect(document.querySelector("[data-part=bulk-bar]")).toBeNull()
  })

  test("an onRemove that returns an undo shows a toast whose Undo restores the row", async () => {
    track(
      mount(() => (
        <>
          <Pages undo />
          <ToastRegion />
        </>
      )),
    )
    const m = mains()
    m[0]?.focus()
    press(m[0] as HTMLElement, "Delete")
    await tick()
    expect(document.body.textContent).toContain("Removed “Alpha”")
    const undo = all<HTMLButtonElement>("button").find((b) => b.textContent === "Undo")
    expect(undo).toBeTruthy()
    click(undo as HTMLButtonElement)
    expect(titles()).toEqual(["Alpha", "Beta", "Gamma", "Delta"])
  })

  test("a removable row has no delete button of its own", () => {
    track(mount(() => <Pages />))
    expect(all("[aria-label='Delete Alpha'], [data-row-remove]").length).toBe(0)
  })

  test("in editing a click toggles and each row has a checkbox", () => {
    const seen: RowKey[][] = []
    track(
      mount(() => (
        <RowList
          label="Pins"
          items={["a", "b"]}
          getKey={(s) => s}
          selectable
          editing
          onSelectedChange={(k) => seen.push(k)}
        >
          {(s) => <ListRow title={s} href={`#${s}`} />}
        </RowList>
      )),
    )
    expect(all("[data-part=checkbox]").length).toBe(2)
    click(mains()[0] as HTMLElement)
    click(mains()[1] as HTMLElement)
    expect(seen.at(-1)).toEqual(["a", "b"])
  })

  test("an add row at the end", () => {
    let added = 0
    track(
      mount(() => (
        <RowList label="Pages" onAdd={() => added++} addLabel="New page">
          <ListRow title="A" />
        </RowList>
      )),
    )
    const add = one<HTMLButtonElement>("[data-part=row-add]")
    expect(add.textContent).toBe("New page")
    expect(add.closest("[role=listitem]")).not.toBeNull()
    click(add)
    expect(added).toBe(1)
  })
})

describe("ListRow rename and tree", () => {
  test("F2 turns the title into a field; Enter commits the new title", async () => {
    const names: string[] = []
    track(
      mount(() => {
        const [title, setTitle] = createSignal("Launch plan")
        return (
          <RowList label="Pages">
            <ListRow
              title={title()}
              onClick={() => {}}
              onRename={(t) => {
                names.push(t)
                setTitle(t)
                flush()
              }}
            />
          </RowList>
        )
      }),
    )
    const main = mains()[0] as HTMLElement
    main.focus()
    press(main, "F2")
    await tick()
    const input = one<HTMLInputElement>("[data-part=list-row] input")
    expect(input.value).toBe("Launch plan")
    expect(input.getAttribute("aria-label")).toBe("Rename Launch plan")
    input.value = "Launch plan v2"
    input.dispatchEvent(new InputEvent("input", { bubbles: true }))
    flush()
    press(input, "Enter")
    await tick()
    expect(names).toEqual(["Launch plan v2"])
    expect(document.querySelector("[data-part=list-row] input")).toBeNull()
    expect(one(".nc-lrow__title").textContent).toBe("Launch plan v2")
  })

  test("a row with children is a tree: the disclosure and Right and Left show and hide them", async () => {
    track(
      mount(() => (
        <RowList label="Outline">
          <ListRow title="Header" onClick={() => {}}>
            <ListRow title="Logo" onClick={() => {}} />
            <ListRow title="Nav" onClick={() => {}} />
          </ListRow>
          <ListRow title="Footer" onClick={() => {}} />
        </RowList>
      )),
    )
    await tick()
    const rowTitles = () => all(".nc-lrow .nc-lrow__title").map((e) => e.textContent)
    expect(rowTitles()).toEqual(["Header", "Footer"])
    // The leaf keeps the disclosure's place, so the titles line up.
    expect(all(".nc-lrow__toggle").length).toBe(2)
    const toggle = one<HTMLButtonElement>("button.nc-lrow__toggle")
    expect(toggle.getAttribute("aria-expanded")).toBe("false")
    const header = mains()[0] as HTMLElement
    header.focus()
    press(header, "ArrowRight")
    expect(rowTitles()).toEqual(["Header", "Logo", "Nav", "Footer"])
    expect(toggle.getAttribute("aria-expanded")).toBe("true")
    const nested = all("[data-part=list-row]")[1] as HTMLElement
    expect(nested.getAttribute("data-depth")).toBe("1")
    expect(nested.getAttribute("aria-level")).toBe("2")
    // Left on a child goes to its parent; Left on the parent closes it.
    ;(mains()[1] as HTMLElement).focus()
    press(mains()[1] as HTMLElement, "ArrowLeft")
    expect(focused()?.textContent).toBe("Header")
    press(focused() as HTMLElement, "ArrowLeft")
    expect(rowTitles()).toEqual(["Header", "Footer"])
    click(toggle)
    expect(rowTitles()).toEqual(["Header", "Logo", "Nav", "Footer"])
  })
})

describe("DataList", () => {
  const Tags = (props: { initial?: string[]; seen?: string[][] }) => {
    const [tags, setTags] = createSignal(props.initial ?? ["web", "auth"])
    return (
      <DataList
        label="Tags"
        itemName="Tag"
        value={tags()}
        onChange={(next) => {
          props.seen?.push(next)
          setTags(next)
          flush()
        }}
        invalid={(t) => (t.includes(" ") ? "No spaces" : undefined)}
      />
    )
  }
  const inputs = () => all<HTMLInputElement>("[data-part=data-list] input")

  test("each row is a labelled field without a grip or a remove button, and the add row says what it adds", () => {
    track(mount(() => <Tags />))
    expect(inputs().map((i) => i.value)).toEqual(["web", "auth"])
    expect(inputs().map((i) => i.getAttribute("aria-label"))).toEqual(["Tag 1", "Tag 2"])
    expect(all("[aria-label='Remove Tag 2'], .nc-datalist__handle, .nc-datalist__remove").length).toBe(0)
    expect(one(".nc-datalist__add").textContent).toBe("Add tag")
    expect(one("[data-part=data-list]").getAttribute("role")).toBe("group")
  })

  test("typing changes the value; a bad item says why under its row", () => {
    const seen: string[][] = []
    track(mount(() => <Tags seen={seen} />))
    const input = inputs()[0] as HTMLInputElement
    input.value = "web app"
    input.dispatchEvent(new InputEvent("input", { bubbles: true }))
    flush()
    expect(seen.at(-1)).toEqual(["web app", "auth"])
    expect(one(".nc-datalist__error").textContent).toBe("No spaces")
    expect(inputs()[0]?.getAttribute("aria-invalid")).toBe("true")
  })

  test("Enter on the last row adds one and focuses it; Backspace in an empty field removes it", async () => {
    track(mount(() => <Tags />))
    const last = inputs()[1] as HTMLInputElement
    last.focus()
    press(last, "Enter")
    await tick()
    expect(inputs().length).toBe(3)
    expect(focused()).toBe(inputs()[2] as HTMLInputElement)
    const empty = inputs()[2] as HTMLInputElement
    empty.setSelectionRange(0, 0)
    press(empty, "Backspace")
    await tick()
    expect(inputs().map((i) => i.value)).toEqual(["web", "auth"])
    expect(focused()).toBe(inputs()[1] as HTMLInputElement)
  })

  test("Enter elsewhere moves down; the arrows move between rows; Alt and an arrow moves the row", async () => {
    track(mount(() => <Tags initial={["a", "b", "c"]} />))
    const first = inputs()[0] as HTMLInputElement
    first.focus()
    press(first, "Enter")
    await tick()
    expect(focused()).toBe(inputs()[1] as HTMLInputElement)
    press(focused() as HTMLElement, "ArrowUp")
    await tick()
    expect(focused()).toBe(inputs()[0] as HTMLInputElement)
    press(focused() as HTMLElement, "ArrowDown", { altKey: true })
    await tick()
    expect(inputs().map((i) => i.value)).toEqual(["b", "a", "c"])
    expect(focused()).toBe(inputs()[1] as HTMLInputElement)
  })

  test("Delete on a row removes it, and the add row adds one", async () => {
    track(mount(() => <Tags />))
    const row = one<HTMLElement>(".nc-datalist__row[data-index='0']")
    row.focus()
    press(row, "Delete")
    expect(inputs().map((i) => i.value)).toEqual(["auth"])
    click(one(".nc-datalist__add"))
    await tick()
    expect(inputs().map((i) => i.value)).toEqual(["auth", ""])
  })

  test("max hides the add row; custom fields edit items that are not strings", () => {
    const seen: Array<Array<{ k: string; v: string }>> = []
    track(
      mount(() => {
        const [env, setEnv] = createSignal([{ k: "A", v: "1" }])
        return (
          <DataList
            label="Environment"
            value={env()}
            max={1}
            create={() => ({ k: "", v: "" })}
            onChange={(n) => {
              seen.push(n)
              setEnv(n)
              flush()
            }}
          >
            {(item, set) => (
              <>
                <DataListInput label="Name" value={item().k} onInput={(k) => set({ ...item(), k })} />
                <DataListInput label="Value" value={item().v} onInput={(v) => set({ ...item(), v })} />
              </>
            )}
          </DataList>
        )
      }),
    )
    expect(document.querySelector(".nc-datalist__add")).toBeNull()
    const value = one<HTMLInputElement>("[aria-label=Value]")
    value.value = "2"
    value.dispatchEvent(new InputEvent("input", { bubbles: true }))
    flush()
    expect(seen.at(-1)).toEqual([{ k: "A", v: "2" }])
  })

  test("Alt and an arrow on a row moves it", async () => {
    const seen: string[][] = []
    track(mount(() => <Tags initial={["a", "b", "c"]} seen={seen} />))
    const row = one<HTMLElement>(".nc-datalist__row[data-index='0']")
    row.focus()
    press(row, "ArrowDown", { altKey: true })
    expect(seen.at(-1)).toEqual(["b", "a", "c"])
  })
})

describe("RowSection and a row's prefix", () => {
  test("groups rows under a heading that folds them; the arrow keys cross groups", async () => {
    const folds: boolean[] = []
    track(
      mount(() => (
        <RowList label="Issues">
          <RowSection label="In progress" count={2} onExpandedChange={(v) => folds.push(v)}>
            <ListRow title="One" prefix={<span>WEB-1</span>} onClick={() => {}} />
            <ListRow title="Two" onClick={() => {}} />
          </RowSection>
          <RowSection label="Done" count={1} icon="check">
            <ListRow title="Three" onClick={() => {}} />
          </RowSection>
        </RowList>
      )),
    )
    await tick()
    const sections = all("[data-part=row-section]")
    expect(sections.length).toBe(2)
    expect(one(".nc-row-section__label", sections[0]).textContent).toBe("In progress")
    expect(one(".nc-row-section__count", sections[0]).textContent).toBe("2")
    // The prefix sits on the title's line, inside the row's link, before the title.
    const prefix = one(".nc-lrow__main .nc-lrow__prefix")
    expect(prefix.textContent).toBe("WEB-1")
    expect(prefix.nextElementSibling?.classList.contains("nc-lrow__title")).toBe(true)

    mains()[1]?.focus()
    press(mains()[1] as HTMLElement, "ArrowDown")
    expect(focused()?.textContent).toBe("Three")

    const toggle = one<HTMLButtonElement>(".nc-row-section__name", sections[0])
    expect(toggle.getAttribute("aria-expanded")).toBe("true")
    click(toggle)
    await tick()
    expect(folds).toEqual([false])
    expect(sections[0]!.hasAttribute("data-collapsed")).toBe(true)
    expect(toggle.getAttribute("aria-expanded")).toBe("false")
    expect(titles().length + all(".nc-row-section .nc-lrow").length).toBe(1)
  })

  test("an icon takes a status tone", () => {
    track(mount(() => <Icon name="check" tone="danger" />))
    expect(one("[data-part=icon]").getAttribute("data-tone")).toBe("danger")
  })
})
