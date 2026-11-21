import { afterEach, describe, expect, test } from "bun:test"
import { render } from "@solidjs/web"
import { createSignal, flush } from "solid-js"
import {
  AppShell,
  Button,
  Checkbox,
  type DataColumn,
  DataTable,
  Dialog,
  DropdownMenu,
  Frame,
  ICON_PATHS,
  Icon,
  LinkProvider,
  Menu,
  NavItem,
  RadioGroup,
  Select,
  Split,
  SplitGroup,
  Switch,
  TabStrip,
  Tabs,
  WidgetTimer,
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
  document.body.innerHTML = ""
})

describe("Menu", () => {
  const items = [
    { id: "assign", label: "Assign to…", shortcut: "A" },
    { id: "label", label: "Add label", disabled: true },
    { id: "copy", label: "Copy link" },
    { type: "separator" as const },
    { id: "delete", label: "Delete", danger: true },
  ]
  const anchored = (onSelect?: (id: string) => void) => {
    const [open, setOpen] = createSignal(true)
    const at = document.createElement("button")
    document.body.append(at)
    const view = track(
      mount(() => (
        <Menu
          open={open()}
          anchor={at}
          label="Actions"
          items={items}
          onClose={() => setOpen(false)}
          onSelect={onSelect}
        />
      )),
    )
    return { ...view, open, at }
  }
  test("draws its entries as menu items, with a separator, a disabled item and a danger item", async () => {
    anchored()
    await tick()
    const rows = all("[role=menuitem]") as HTMLElement[]
    expect(rows.map((r) => r.textContent)).toEqual(["Assign to…A", "Add label", "Copy link", "Delete"])
    expect(rows[1]?.getAttribute("aria-disabled")).toBe("true")
    expect(rows[3]?.classList.contains("nc-menu__item--danger")).toBe(true)
    expect(one("[data-part=menu]").getAttribute("aria-label")).toBe("Actions")
    expect(document.querySelector("[role=separator]")).not.toBeNull()
  })
  test("clicking selects the item and closes; a disabled item does nothing", async () => {
    const picked: string[] = []
    const view = anchored((id) => picked.push(id))
    await tick()
    const rows = all("[role=menuitem]") as HTMLElement[]
    click(rows[1] as HTMLElement)
    expect(picked).toEqual([])
    click(rows[2] as HTMLElement)
    await tick()
    expect(picked).toEqual(["copy"])
    expect(view.open()).toBe(false)
  })
  test("dropdown opens from the keyboard, selects, closes and returns focus to the trigger", async () => {
    const picked: string[] = []
    const { root } = track(
      mount(() => (
        <DropdownMenu
          label="Actions"
          items={items}
          onSelect={(id) => picked.push(id)}
          trigger={(tp) => (
            <Button {...tp} id="trigger">
              Actions
            </Button>
          )}
        />
      )),
    )
    const trigger = one<HTMLButtonElement>("#trigger", root)
    trigger.focus()
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    press(trigger, "ArrowDown")
    await tick()
    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    const menu = one("[role=menu]")
    expect(menu.closest("[data-theme]")).not.toBeNull()
    click(menu.querySelectorAll<HTMLElement>("[role=menuitem]")[2] as HTMLElement)
    await tick()
    expect(picked).toEqual(["copy"])
    expect(document.querySelector("[role=menu]")).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })
  test("Escape closes a dropdown", async () => {
    const { root } = track(
      mount(() => (
        <DropdownMenu
          label="Actions"
          items={items}
          trigger={(tp) => (
            <Button {...tp} id="t">
              Actions
            </Button>
          )}
        />
      )),
    )
    click(one("#t", root))
    await tick()
    expect(document.querySelector("[role=menu]")).not.toBeNull()
    press(document.body, "Escape")
    await tick()
    expect(document.querySelector("[role=menu]")).toBeNull()
    expect(document.activeElement).toBe(one("#t", root))
  })
})

describe("Tabs", () => {
  const items = [
    { id: "active", label: "Active" },
    { id: "backlog", label: "Backlog", disabled: true },
    { id: "all", label: "All issues", count: 4 },
  ]
  test("segmented tabs are one choice of a few: a click picks one and only it is tabbable", () => {
    const seen: string[] = []
    const { root } = track(
      mount(() => (
        <Tabs label="Filter" items={items} defaultValue="active" onChange={(id) => seen.push(id)} />
      )),
    )
    const tabs = all<HTMLButtonElement>("[role=radio]")
    expect(tabs.map((t) => t.getAttribute("aria-checked"))).toEqual(["true", "false", "false"])
    click(tabs[2] as HTMLElement)
    expect(seen).toEqual(["all"])
    expect(tabs.map((t) => t.getAttribute("aria-checked"))).toEqual(["false", "false", "true"])
    expect(tabs[0]?.getAttribute("tabindex")).toBe("-1")
    expect(tabs[2]?.getAttribute("tabindex")).toBe("0")
    expect(root.querySelector("[data-part=tabs]")?.getAttribute("aria-label")).toBe("Filter")
  })
  test("underline tabs: arrow keys move and select; a disabled tab takes focus but not the selection", async () => {
    track(mount(() => <Tabs label="Filter" items={items} variant="underline" />))
    const tabs = all<HTMLButtonElement>("[role=tab]")
    tabs[0]?.focus()
    press(tabs[0] as HTMLElement, "ArrowRight")
    expect(document.activeElement).toBe(tabs[1])
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true")
    press(tabs[1] as HTMLElement, "ArrowRight")
    expect(document.activeElement).toBe(tabs[2])
    expect(tabs[2]?.getAttribute("aria-selected")).toBe("true")
    press(tabs[2] as HTMLElement, "Home")
    expect(document.activeElement).toBe(tabs[0])
    press(tabs[0] as HTMLElement, "End")
    expect(document.activeElement).toBe(tabs[2])
  })
  test("is controlled when value is set", () => {
    const [value, setValue] = createSignal("all")
    track(mount(() => <Tabs label="Filter" items={items} value={value()} onChange={setValue} />))
    const tabs = all<HTMLButtonElement>("[role=radio]")
    expect(tabs[2]?.getAttribute("aria-checked")).toBe("true")
    click(tabs[0] as HTMLElement)
    expect(value()).toBe("active")
    expect(tabs[0]?.getAttribute("aria-checked")).toBe("true")
  })
})

interface Row {
  id: string
  name: string
  mb: number
  ago: number | null
}
const rows: Row[] = [
  { id: "s_7f2a", name: "coder", mb: 3.4, ago: 900 },
  { id: "s_7c44", name: "build", mb: 2.1, ago: 5400 },
  { id: "s_7d10", name: "update", mb: 0.6, ago: null },
]
const columns: DataColumn<Row>[] = [
  { id: "id", header: "ID", accessor: (r) => r.id, type: "mono" },
  { id: "name", header: "Session", accessor: (r) => r.name, sortable: true },
  {
    id: "mb",
    header: "Output",
    accessor: (r) => `${r.mb} MB`,
    sortValue: (r) => r.mb,
    type: "num",
    sortable: true,
  },
  { id: "ago", header: "Started", accessor: (r) => r.ago, type: "time", sortable: true },
]
const names = () => all("tbody tr").map((tr) => tr.querySelector("td:nth-child(3)")?.textContent)

describe("DataTable", () => {
  test("renders rows with typed cells and an em dash for null", () => {
    track(mount(() => <DataTable label="Sessions" rows={rows} columns={columns} getRowId={(r) => r.id} />))
    expect(all("tbody tr")).toHaveLength(3)
    expect(all("tbody tr")[2]?.textContent).toContain("—")
    expect(all("th")[2]?.className).toContain("is-num")
  })
  test("sorting: first click ascending for text, then descending, then off; aria-sort follows", () => {
    track(
      mount(() => (
        <DataTable label="Sessions" rows={rows} columns={columns} getRowId={(r) => r.id} selectable />
      )),
    )
    const header = (n: string) =>
      all<HTMLButtonElement>("th button.nc-th-sort").find((b) =>
        b.textContent?.startsWith(n),
      ) as HTMLButtonElement
    expect(names()).toEqual(["coder", "build", "update"])
    click(header("Session"))
    expect(names()).toEqual(["build", "coder", "update"])
    expect(one("th[data-column=name]").getAttribute("aria-sort")).toBe("ascending")
    click(header("Session"))
    expect(names()).toEqual(["update", "coder", "build"])
    expect(one("th[data-column=name]").getAttribute("aria-sort")).toBe("descending")
    click(header("Session"))
    expect(names()).toEqual(["coder", "build", "update"])
    expect(one("th[data-column=name]").hasAttribute("aria-sort")).toBe(false)
  })
  test("numeric columns sort by sortValue, largest first; empty values stay last", () => {
    track(mount(() => <DataTable label="Sessions" rows={rows} columns={columns} getRowId={(r) => r.id} />))
    const header = (n: string) =>
      all<HTMLButtonElement>("th button.nc-th-sort").find((b) =>
        b.textContent?.startsWith(n),
      ) as HTMLButtonElement
    click(header("Output"))
    expect(all("tbody tr").map((tr) => tr.getAttribute("data-row-id"))).toEqual([
      "s_7f2a",
      "s_7c44",
      "s_7d10",
    ])
    click(header("Started"))
    expect(all("tbody tr").map((tr) => tr.getAttribute("data-row-id"))).toEqual([
      "s_7c44",
      "s_7f2a",
      "s_7d10",
    ])
    click(header("Started"))
    expect(all("tbody tr").map((tr) => tr.getAttribute("data-row-id"))).toEqual([
      "s_7f2a",
      "s_7c44",
      "s_7d10",
    ])
  })
  test("selection: row checkboxes, select-all with mixed state, bulk bar and Escape to clear", () => {
    const seen: string[][] = []
    track(
      mount(() => (
        <DataTable
          label="Sessions"
          rows={rows}
          columns={columns}
          getRowId={(r) => r.id}
          selectable
          onSelectionChange={(ids) => seen.push(ids)}
          toolbar={<div id="toolbar">Filters</div>}
          bulkActions={(selected) => <span id="bulk">{selected.map((r) => r.name).join(",")}</span>}
        />
      )),
    )
    const boxes = () => all<HTMLButtonElement>("[role=checkbox]")
    const all_ = () => boxes()[0] as HTMLButtonElement
    expect(document.querySelector("#toolbar")).not.toBeNull()
    expect(document.querySelector("[data-part=bulk-bar]")).toBeNull()
    click(boxes()[2] as HTMLElement)
    expect(seen.at(-1)).toEqual(["s_7c44"])
    expect(one("[data-part=bulk-bar]").textContent).toContain("1 selected")
    expect(one("#bulk").textContent).toBe("build")
    expect(document.querySelector("#toolbar")).toBeNull()
    expect(all_().getAttribute("aria-checked")).toBe("mixed")
    expect(all("tbody tr")[1]?.getAttribute("aria-selected")).toBe("true")
    click(all_())
    expect(seen.at(-1)).toEqual(["s_7f2a", "s_7c44", "s_7d10"])
    expect(all_().getAttribute("aria-checked")).toBe("true")
    press(one("[data-part=data-table]"), "Escape")
    expect(seen.at(-1)).toEqual([])
    expect(document.querySelector("#toolbar")).not.toBeNull()
  })
  test("loading, empty and error states", () => {
    const [state, setState] = createSignal<"loading" | "empty" | "error">("loading")
    let retried = 0
    track(
      mount(() => (
        <DataTable
          label="Sessions"
          rows={state() === "empty" ? [] : rows}
          columns={columns}
          getRowId={(r) => r.id}
          loading={state() === "loading"}
          empty={{ title: "No sessions match", description: "state: running", onClearFilters: () => {} }}
          error={
            state() === "error"
              ? {
                  code: "502",
                  message: "Can't reach host build-01",
                  detail: "Last seen 4 min ago",
                  onRetry: () => retried++,
                }
              : undefined
          }
        />
      )),
    )
    expect(all("tbody[data-state=loading] tr")).toHaveLength(5)
    setState("empty")
    flush()
    expect(document.querySelector("[data-state=empty]")?.textContent).toContain("No sessions match")
    expect(document.body.textContent).toContain("Clear filters")
    setState("error")
    flush()
    const error = one("[data-state=error]")
    expect(error.textContent).toContain("502")
    click(error.querySelector("button") as HTMLElement)
    expect(retried).toBe(1)
    expect(all("tbody tr")).toHaveLength(0)
  })
})

describe("Dialog", () => {
  test("moves focus in, traps Tab in both directions, closes on Escape and restores focus", async () => {
    const [open, setOpen] = createSignal(false)
    const { root } = track(
      mount(() => (
        <>
          <Button id="opener" onClick={() => setOpen(true)}>
            Open
          </Button>
          <Dialog
            open={open()}
            onClose={() => setOpen(false)}
            title="Delete host"
            footer={
              <>
                <Button id="cancel">Cancel</Button>
                <Button id="confirm" variant="danger">
                  Delete build-01
                </Button>
              </>
            }
          >
            <input id="name" aria-label="Name" />
          </Dialog>
        </>
      )),
    )
    const opener = one<HTMLButtonElement>("#opener", root)
    opener.focus()
    click(opener)
    await tick()
    const dialog = one("[role=dialog]")
    expect(dialog.getAttribute("aria-modal")).toBe("true")
    expect(dialog.getAttribute("aria-labelledby")).toBe(dialog.querySelector("h2")?.id ?? "")
    expect(document.activeElement?.id).toBe("name")
    const confirm = one("#confirm")
    confirm.focus()
    const forward = press(confirm, "Tab")
    expect(forward.defaultPrevented).toBe(true)
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Close")
    const backward = press(document.activeElement as Element, "Tab", { shiftKey: true })
    expect(backward.defaultPrevented).toBe(true)
    expect(document.activeElement?.id).toBe("confirm")
    press(document.activeElement as Element, "Escape")
    await tick()
    expect(open()).toBe(false)
    expect(document.querySelector("[role=dialog]")).toBeNull()
    expect(document.activeElement).toBe(opener)
  })
  test("backdrop click closes unless turned off", async () => {
    const closed: number[] = []
    track(
      mount(() => (
        <Dialog open onClose={() => closed.push(1)} title="Reboot" closeOnBackdrop={false}>
          x
        </Dialog>
      )),
    )
    await tick()
    one("[data-part=dialog-backdrop]").dispatchEvent(new Event("pointerdown", { bubbles: true }))
    flush()
    expect(closed).toEqual([])
  })
})

describe("Select inside a Dialog", () => {
  test("its options open over the dialog and a pick leaves the dialog open", async () => {
    const seen: string[] = []
    const closed: number[] = []
    track(
      mount(() => (
        <Dialog open onClose={() => closed.push(1)} title="New connection">
          <Select
            label="Type"
            options={[
              { value: "openai", label: "OpenAI-compatible API" },
              { value: "echo", label: "Echo service" },
            ]}
            defaultValue="openai"
            onChange={(v) => seen.push(v)}
          />
        </Dialog>
      )),
    )
    await tick()
    click(one<HTMLButtonElement>("[role=dialog] button[aria-haspopup=listbox]"))
    await tick()
    const options = all("[role=option]")
    expect(options).toHaveLength(2)
    click(options[1] as HTMLElement)
    await tick()
    expect(seen).toEqual(["echo"])
    expect(closed).toEqual([])
  })
})

describe("Select, Switch, Checkbox, RadioGroup, Split", () => {
  test("Select opens a listbox of radio items and reports the choice", async () => {
    const seen: string[] = []
    track(
      mount(() => (
        <Select
          label="Scope"
          options={[
            { value: "user", label: "User" },
            { value: "ws", label: "Workspace" },
          ]}
          defaultValue="user"
          onChange={(v) => seen.push(v)}
        />
      )),
    )
    const button = one<HTMLButtonElement>("button[aria-haspopup=listbox]")
    expect(button.textContent).toContain("User")
    click(button)
    await tick()
    const items = all("[role=option]")
    expect(items.map((i) => i.getAttribute("aria-selected"))).toEqual(["true", "false"])
    click(items[1] as HTMLElement)
    await tick()
    expect(seen).toEqual(["ws"])
    expect(button.textContent).toContain("Workspace")
  })
  test("Select shows its placeholder for a value no option has", () => {
    track(
      mount(() => (
        <Select
          label="Size"
          placeholder="Default"
          value=""
          options={[
            { value: "small", label: "Small" },
            { value: "large", label: "Large" },
          ]}
        />
      )),
    )
    expect(one<HTMLButtonElement>("button[aria-haspopup=listbox]").textContent).toContain("Default")
  })
  test("Select shows an error as TextField does: the error edge, aria-invalid and the message it points to", () => {
    const [error, setError] = createSignal<string | undefined>("Choose a host.")
    track(
      mount(() => (
        <Select
          label="Host"
          help="Where it runs."
          error={error()}
          options={[{ value: "a", label: "build-01" }]}
        />
      )),
    )
    const button = one<HTMLButtonElement>("button[aria-haspopup=listbox]")
    expect(button.classList.contains("nc-input--error")).toBe(true)
    expect(button.getAttribute("aria-invalid")).toBe("true")
    const help = one(`#${button.getAttribute("aria-describedby")}`)
    expect(help.textContent).toBe("Choose a host.")
    expect(help.classList.contains("nc-field__help--error")).toBe(true)
    setError(undefined)
    flush()
    expect(button.hasAttribute("aria-invalid")).toBe(false)
    expect(help.textContent).toBe("Where it runs.")
  })
  test("Switch and Checkbox toggle, and a mixed checkbox becomes checked", () => {
    const seen: boolean[] = []
    track(
      mount(() => (
        <>
          <Switch aria-label="Unread only" onChange={(v) => seen.push(v)} />
          <Checkbox aria-label="All" checked="mixed" onChange={(v) => seen.push(v)} />
        </>
      )),
    )
    const sw = one("[role=switch]")
    click(sw)
    expect(sw.getAttribute("aria-checked")).toBe("true")
    click(one("[role=checkbox]"))
    expect(seen).toEqual([true, true])
  })
  test("RadioGroup moves with arrow keys and only the chosen radio is tabbable", () => {
    track(
      mount(() => (
        <RadioGroup
          label="View"
          options={[
            { value: "board", label: "Board" },
            { value: "list", label: "List" },
          ]}
          defaultValue="board"
        />
      )),
    )
    const radios = all("[role=radio]")
    expect(radios.map((r) => r.getAttribute("tabindex"))).toEqual(["0", "-1"])
    press(radios[0] as HTMLElement, "ArrowRight")
    expect(radios.map((r) => r.getAttribute("aria-checked"))).toEqual(["false", "true"])
    expect(document.activeElement).toBe(radios[1])
  })
  test("Split divider resizes with the keyboard within its limits", () => {
    const sizes: number[] = []
    track(
      mount(() => (
        <Split first="a" second="b" defaultSize={200} min={150} max={240} onResize={(s) => sizes.push(s)} />
      )),
    )
    const divider = one("[role=separator]")
    press(divider, "ArrowRight")
    press(divider, "ArrowRight")
    press(divider, "ArrowRight")
    expect(divider.getAttribute("aria-valuenow")).toBe("240")
    press(divider, "Home")
    expect(divider.getAttribute("aria-valuenow")).toBe("150")
    expect(sizes).toEqual([216, 232, 240, 150])
    expect(one("[data-part=split-first]").style.getPropertyValue("--nc-split-size")).toBe("150px")
  })
})

describe("Split fixed to the second pane and SplitGroup", () => {
  test("fixed=second sizes the second pane, and the arrow that moves the divider toward it shrinks it", () => {
    const sizes: number[] = []
    track(
      mount(() => (
        <Split
          fixed="second"
          first="a"
          second="b"
          defaultSize={200}
          min={100}
          max={300}
          onResize={(s) => sizes.push(s)}
        />
      )),
    )
    expect(one("[data-part=split-second]").style.getPropertyValue("--nc-split-size")).toBe("200px")
    expect(one("[data-part=split-first]").style.getPropertyValue("--nc-split-size")).toBe("")
    // The second pane is on the right, so Arrow Right moves the divider toward it and makes it smaller.
    press(one("[role=separator]"), "ArrowRight")
    press(one("[role=separator]"), "ArrowLeft")
    press(one("[role=separator]"), "ArrowLeft")
    press(one("[role=separator]"), "End")
    expect(sizes).toEqual([184, 200, 216, 300])
  })

  test("SplitGroup puts a divider between each pair and moves space between the two beside it", () => {
    const seen: number[][] = []
    const original = HTMLElement.prototype.getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = function () {
      const weight = Number(this.style?.getPropertyValue("--nc-weight") ?? 1)
      return {
        width: weight ? weight * 300 : 0,
        height: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect
    }
    try {
      const { root } = track(
        mount(() => (
          <SplitGroup items={["a", "b", "c"]} weights={[1, 1, 1]} onResize={(w) => seen.push(w)} min={100}>
            {(item) => <span>{item}</span>}
          </SplitGroup>
        )),
      )
      const dividers = Array.from(root.querySelectorAll("[role=separator]"))
      expect(dividers).toHaveLength(2)
      expect(root.querySelectorAll("[data-part=split-group-pane]")).toHaveLength(3)
      // 16px right on the first divider: 316 of the first two panes' 600, the third pane untouched.
      press(dividers[0] as HTMLElement, "ArrowRight")
      const [a, b, c] = seen[0] as number[]
      expect(a).toBeCloseTo(316 / 300, 5)
      expect(a + b).toBeCloseTo(2, 5)
      expect(c).toBe(1)
      // Home gives the first pane its minimum, never less.
      press(dividers[1] as HTMLElement, "Home")
      const [, , ,] = seen[1] as number[]
      expect(seen[1]?.[1]).toBeCloseTo(100 / 300, 5)
      expect(seen[1]?.[0]).toBe(1)
    } finally {
      HTMLElement.prototype.getBoundingClientRect = original
    }
  })
})

describe("SplitGroup weights", () => {
  test("grows each pane by its weight against the mean, so a lone pane with weight 0.5 fills the group", () => {
    const { root } = track(
      mount(() => (
        <SplitGroup items={["a"]} weights={[0.5]}>
          {(item) => <span>{item}</span>}
        </SplitGroup>
      )),
    )
    const pane = one("[data-part=split-group-pane]", root)
    expect(Number(pane.style.getPropertyValue("--nc-weight"))).toBe(1)
    const pair = track(
      mount(() => (
        <SplitGroup items={["a", "b"]} weights={[0.25, 0.75]}>
          {(item) => <span>{item}</span>}
        </SplitGroup>
      )),
    )
    const weights = Array.from(pair.root.querySelectorAll<HTMLElement>("[data-part=split-group-pane]")).map(
      (one) => Number(one.style.getPropertyValue("--nc-weight")),
    )
    expect(weights).toEqual([0.5, 1.5])
  })
})

describe("WidgetTimer", () => {
  test("ticks up to the progress take the hue and the newest one glows; the rest stay a tint", () => {
    const { root } = track(
      mount(() => (
        <WidgetTimer
          hue="warning"
          title="Focus"
          value="18:24"
          progress={0.5}
          ticks={10}
          scale={["0", "30 min"]}
        />
      )),
    )
    const ticks = Array.from(root.querySelectorAll(".nc-wtimer__tick"))
    expect(ticks).toHaveLength(10)
    expect(ticks.filter((t) => t.classList.contains("nc-wtimer__tick--on"))).toHaveLength(5)
    expect(ticks.filter((t) => t.classList.contains("nc-wtimer__tick--live"))).toEqual([ticks[4]])
    // Elapsed ticks are a wave, remaining ones are flat.
    expect(new Set(ticks.slice(5).map((t) => (t as HTMLElement).style.height))).toEqual(new Set(["14px"]))
    expect(new Set(ticks.slice(0, 5).map((t) => (t as HTMLElement).style.height)).size).toBeGreaterThan(1)
    const bar = one("[role=progressbar]", root)
    expect(bar.getAttribute("aria-valuenow")).toBe("50")
    expect(root.textContent).toContain("18:24")
    expect(root.querySelectorAll(".nc-wtimer__scale span")).toHaveLength(2)
  })
  test("progress is clamped, and no progress leaves no glowing tick", () => {
    const { root } = track(mount(() => <WidgetTimer title="Focus" value="0:00" progress={-1} ticks={4} />))
    expect(root.querySelectorAll(".nc-wtimer__tick--on")).toHaveLength(0)
    expect(root.querySelectorAll(".nc-wtimer__tick--live")).toHaveLength(0)
    const full = track(mount(() => <WidgetTimer title="Focus" value="0:00" progress={3} ticks={4} />))
    expect(full.root.querySelectorAll(".nc-wtimer__tick--on")).toHaveLength(4)
  })
})

describe("Icon", () => {
  test("a named icon and a Lucide node draw on the same grid with the same class", () => {
    const { root } = track(
      mount(() => (
        <>
          <Icon name="server" />
          <Icon node={[["circle", { cx: 12, cy: 12, r: 9 }]]} />
        </>
      )),
    )
    const [named, node] = Array.from(root.querySelectorAll("svg"))
    for (const svg of [named, node]) {
      expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24")
      expect(svg?.getAttribute("class")).toBe("nc-icon")
    }
    expect(named?.querySelectorAll("rect, path, circle, line").length).toBeGreaterThan(0)
  })

  test("every name draws something", () => {
    for (const name of Object.keys(ICON_PATHS))
      expect(ICON_PATHS[name as keyof typeof ICON_PATHS].length).toBeGreaterThan(0)
  })
})

describe("TabStrip", () => {
  const items = [
    { id: "a", label: "Alpha", icon: "home" as const },
    { id: "b", label: "Beta" },
    { id: "c", label: "Gamma" },
  ]
  test("selects, closes with the button and the Delete key, and roves with the arrow keys", async () => {
    const chosen: string[] = []
    const closed: string[] = []
    track(
      mount(() => (
        <TabStrip
          label="Tabs"
          items={items}
          value="a"
          onChange={(id) => chosen.push(id)}
          onClose={(id) => closed.push(id)}
        />
      )),
    )
    const tabs = all("[role=tab]")
    expect(tabs.map((t) => t.textContent)).toEqual(["Alpha", "Beta", "Gamma"])
    expect(tabs.map((t) => t.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"])
    click(tabs[1] as HTMLElement)
    click(one("button[aria-label='Close Gamma']"))
    press(tabs[0] as HTMLElement, "ArrowRight")
    expect(document.activeElement).toBe(tabs[1])
    press(tabs[1] as HTMLElement, "End")
    expect(document.activeElement).toBe(tabs[2])
    press(tabs[2] as HTMLElement, "ArrowRight")
    expect(document.activeElement).toBe(tabs[0])
    press(tabs[1] as HTMLElement, "Delete")
    expect(chosen).toEqual(["b"])
    expect(closed).toEqual(["c", "b"])
  })

  test("Alt+Arrow moves the focused tab within the strip when it has a drag group", async () => {
    const drops: Array<{ tabId: string; from: string; index: number }> = []
    track(
      mount(() => (
        <TabStrip
          label="Tabs"
          stripId="s1"
          dragGroup="g"
          items={items}
          value="a"
          onChange={() => {}}
          onDrop={(d) => drops.push(d)}
        />
      )),
    )
    const tabs = all("[role=tab]")
    press(tabs[1] as HTMLElement, "ArrowLeft", { altKey: true })
    press(tabs[1] as HTMLElement, "ArrowRight", { altKey: true })
    press(tabs[0] as HTMLElement, "ArrowLeft", { altKey: true })
    press(tabs[2] as HTMLElement, "ArrowRight", { altKey: true })
    // Left of the first and right of the last do nothing; a tab moves one place either way.
    expect(drops).toEqual([
      { tabId: "b", from: "s1", index: 0 },
      { tabId: "b", from: "s1", index: 3 },
    ])
  })

  test("a tab dragged from one strip drops into another at the place under the pointer", async () => {
    const drops: Array<{ tabId: string; from: string; index: number }> = []
    track(
      mount(() => (
        <>
          <TabStrip label="One" stripId="one" dragGroup="g" items={items} value="a" onChange={() => {}} />
          <TabStrip
            label="Two"
            stripId="two"
            dragGroup="g"
            items={[{ id: "z", label: "Zed" }]}
            value="z"
            onChange={() => {}}
            onDrop={(d) => drops.push(d)}
          />
        </>
      )),
    )
    // happy-dom's DragEvent carries no dataTransfer, so one is attached by hand.
    const drag = (el: Element, type: string, dt: { types: string[]; getData(t: string): string }) => {
      const event = new Event(type, { bubbles: true, cancelable: true })
      Object.defineProperty(event, "dataTransfer", { value: dt })
      el.dispatchEvent(event)
      flush()
      return event
    }
    const store = new Map<string, string>()
    const dt: {
      types: string[]
      dropEffect: string
      effectAllowed: string
      setData(t: string, v: string): void
      getData(t: string): string
    } = {
      types: [],
      dropEffect: "none",
      effectAllowed: "uninitialized",
      setData(type: string, value: string) {
        store.set(type, value)
        this.types = [...store.keys()]
      },
      getData: (type: string) => store.get(type) ?? "",
    }
    drag(all("[data-part=tab-strip-tab]")[1] as HTMLElement, "dragstart", dt)
    expect(dt.types).toContain("application/x-nc-tab-g")
    const target = all("[role=tablist]")[1] as HTMLElement
    expect(drag(target, "dragover", dt).defaultPrevented).toBe(true)
    drag(target, "drop", dt)
    expect(drops).toHaveLength(1)
    expect(drops[0]).toMatchObject({ tabId: "b", from: "one" })
    // A drag of something else is not accepted.
    const other = { types: ["text/plain"], getData: () => "hello" }
    expect(drag(target, "dragover", other).defaultPrevented).toBe(false)
  })
})

describe("Menu choices", () => {
  test("a choice row is one stop; Left and Right choose and keep the focus on the row", async () => {
    const [theme, setTheme] = createSignal("dark")
    const items = [
      { type: "custom" as const, content: <span id="who">Ada</span> },
      {
        type: "choice" as const,
        id: "theme",
        label: "Theme",
        options: [
          { value: "dark", label: "Dark" },
          { value: "light", label: "Light" },
          { value: "system", label: "System" },
        ],
        get value() {
          return theme()
        },
        onChange: setTheme,
      },
      { id: "settings", label: "Settings" },
    ]
    const at = document.createElement("button")
    document.body.append(at)
    track(mount(() => <Menu open anchor={at} label="Account" items={items} onClose={() => {}} />))
    await tick()
    const options = all("[role=menuitemradio]") as HTMLElement[]
    expect(options.map((o) => o.getAttribute("aria-checked"))).toEqual(["true", "false", "false"])
    expect(one("[data-part=menu-choice]").getAttribute("aria-label")).toBe("Theme")
    // Choosing an option changes the value and keeps the menu open.
    click(options[1] as HTMLElement)
    await tick()
    expect(theme()).toBe("light")
    expect(all("[role=menuitemradio]")).toHaveLength(3)
  })
})

describe("TabStrip behaviours", () => {
  const tabs = [
    { id: "a", label: "Alpha", pinned: true },
    { id: "b", label: "Beta", dirty: true },
    { id: "c", label: "Gamma", detail: "Team", loading: true },
  ]
  test("a pinned tab has no close button, an icon-sized button named by its title; dirty and loading are marked", async () => {
    track(
      mount(() => <TabStrip label="Tabs" items={tabs} value="b" onChange={() => {}} onClose={() => {}} />),
    )
    const strip = one("[data-part=tab-strip]")
    expect(all("button[aria-label^='Close']").map((b) => b.getAttribute("aria-label"))).toEqual([
      "Close Beta",
      "Close Gamma",
    ])
    expect(all("[role=tab]")[0]?.getAttribute("aria-label")).toBe("Alpha")
    expect(all("[role=tab]")[0]?.textContent).toBe("")
    expect(strip.querySelector("[data-tab=b]")?.hasAttribute("data-dirty")).toBe(true)
    expect(strip.querySelector("[data-tab=b] .nc-tabstrip__dirty")).not.toBeNull()
    expect(strip.querySelector("[data-tab=c] .nc-spinner")).not.toBeNull()
    expect(strip.querySelector("[data-tab=c] .nc-tabstrip__detail")?.textContent).toBe("Team")
  })

  test("the context menu opens on a right click, the menu key and Shift+F10, and chooses", async () => {
    const chosen: string[] = []
    track(
      mount(() => (
        <TabStrip
          label="Tabs"
          items={tabs}
          value="b"
          onChange={() => {}}
          menu={(id) => [
            { id: "close", label: "Close" },
            { id: "pin", label: id === "a" ? "Unpin tab" : "Pin tab" },
          ]}
          onMenuSelect={(id, entry) => chosen.push(`${id}:${entry}`)}
        />
      )),
    )
    const beta = all("[role=tab]")[1] as HTMLElement
    const fire = (el: Element, init: MouseEventInit) => {
      const e = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, ...init })
      el.dispatchEvent(e)
      flush()
      return e
    }
    expect(fire(beta, { clientX: 10, clientY: 10 }).defaultPrevented).toBe(true)
    await tick()
    expect(one("[role=menu]").getAttribute("aria-label")).toBe("Tab")
    expect((all("[role=menuitem]") as HTMLElement[]).map((m) => m.textContent)).toEqual(["Close", "Pin tab"])
    click(all("[role=menuitem]")[1] as HTMLElement)
    await tick()
    expect(chosen).toEqual(["b:pin"])
    expect(document.querySelector("[role=menu]")).toBeNull()
    // The keyboard, on a focused tab; the menu belongs to that tab.
    beta.focus()
    press(beta, "ContextMenu")
    await tick()
    expect(document.querySelector("[role=menu]")).not.toBeNull()
    press(one("[role=menu]"), "Escape")
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
    flush()
    await tick()
    press(beta, "F10", { shiftKey: true })
    await tick()
    expect(document.querySelector("[role=menu]")).not.toBeNull()
    expect((all("[role=menuitem]") as HTMLElement[]).map((m) => m.textContent)).toEqual(["Close", "Pin tab"])
  })

  test("a middle click closes, and a double click on the empty strip asks for a new tab", async () => {
    const closed: string[] = []
    let opened = 0
    track(
      mount(() => (
        <TabStrip
          label="Tabs"
          items={tabs}
          value="b"
          onChange={() => {}}
          onClose={(id) => closed.push(id)}
          onNewTab={() => opened++}
        />
      )),
    )
    const gamma = one("[data-tab=c]")
    gamma.dispatchEvent(new MouseEvent("auxclick", { button: 1, bubbles: true, cancelable: true }))
    flush()
    expect(closed).toEqual(["c"])
    // On a tab it does nothing; on the strip it does.
    gamma.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }))
    flush()
    expect(opened).toBe(0)
    one("[data-part=tab-strip]").dispatchEvent(new MouseEvent("dblclick", { bubbles: true }))
    flush()
    expect(opened).toBe(1)
  })
})

describe("Dialog placements, AppShell and Frame", () => {
  test("a bare dialog has no header and is named by its label; a sheet sits at the bottom", async () => {
    track(
      mount(() => (
        <Dialog open bare label="Command palette" onClose={() => {}}>
          content
        </Dialog>
      )),
    )
    await tick()
    const dialog = one("[role=dialog]")
    expect(dialog.getAttribute("aria-label")).toBe("Command palette")
    expect(dialog.getAttribute("aria-labelledby")).toBeNull()
    expect(dialog.querySelector("header")).toBeNull()
    // Unmount it, not only clear the page: a dialog left mounted keeps its Escape listener on the document,
    // and every later test in this process lost its Escape to it.
    for (const c of cleanup) c()
    cleanup = []
    document.body.innerHTML = ""
    track(
      mount(() => (
        <Dialog open title="Inspector" placement="bottom" onClose={() => {}}>
          content
        </Dialog>
      )),
    )
    await tick()
    expect(one("[data-part=dialog-backdrop]").classList.contains("nc-scrim--bottom")).toBe(true)
    expect(one("[role=dialog]").classList.contains("nc-dialog--sheet")).toBe(true)
  })

  test("AppShell shows the scrim and drawer state only when asked, and the scrim closes the drawer", () => {
    let closed = 0
    const [open, setOpen] = createSignal(false)
    const { root } = track(
      mount(() => (
        <AppShell
          fill
          sidebar="nav"
          sidebarLabel="Navigation"
          topbar="top"
          statusbar="status"
          drawerOpen={open()}
          onDrawerClose={() => closed++}
        >
          body
        </AppShell>
      )),
    )
    expect(one("[data-part=sidebar]", root).getAttribute("aria-label")).toBe("Navigation")
    expect(root.querySelector("[data-part=topbar]")?.textContent).toBe("top")
    expect(root.querySelector("[data-part=statusbar]")?.textContent).toBe("status")
    expect(one("[data-part=app-shell]", root).hasAttribute("data-drawer")).toBe(false)
    setOpen(true)
    flush()
    expect(one("[data-part=app-shell]", root).getAttribute("data-drawer")).toBe("open")
    click(one("[data-part=scrim]", root))
    expect(closed).toBe(1)
  })

  test("AppShell's sidebar resizes by its edge only when the app keeps the width", () => {
    const plain = track(mount(() => <AppShell sidebar="nav">body</AppShell>))
    expect(plain.root.querySelector("[data-part=sidebar-edge]")).toBeNull()
    const [width, setWidth] = createSignal(232)
    const { root } = track(
      mount(() => (
        <AppShell sidebar="nav" sidebarWidth={width()} onSidebarResize={setWidth}>
          body
        </AppShell>
      )),
    )
    const edge = one("[data-part=sidebar-edge]", root)
    expect(edge.getAttribute("role")).toBe("separator")
    press(edge, "ArrowRight")
    expect(width()).toBe(248)
    expect(one("[data-part=app-shell]", root).style.getPropertyValue("--nc-sidebar-width")).toBe("248px")
    for (let i = 0; i < 30; i++) press(edge, "ArrowRight")
    expect(width()).toBe(420)
  })

  test("Frame with a header puts the content in a scrolling body, and focused is a data attribute", () => {
    const { root } = track(
      mount(() => (
        <Frame header={<span>tabs</span>} focused>
          content
        </Frame>
      )),
    )
    const frame = one("[data-part=frame]", root)
    expect(frame.hasAttribute("data-focused")).toBe(true)
    expect(one("[data-part=frame-header]", frame).textContent).toBe("tabs")
    expect(one("[data-part=frame-body]", frame).textContent).toBe("content")
  })

  test("a link inside a LinkProvider navigates without a page load, unless modified", () => {
    const went: string[] = []
    const { root } = track(
      mount(() => (
        <LinkProvider navigate={(href) => went.push(href)}>
          <NavItem label="Hello" href="/~/hello/main" />
          <Button href="/x">Go</Button>
          <Button href="https://example.com">Out</Button>
        </LinkProvider>
      )),
    )
    const links = Array.from(root.querySelectorAll("a"))
    const plain = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 })
    links[0]?.dispatchEvent(plain)
    flush()
    expect(plain.defaultPrevented).toBe(true)
    const modified = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ctrlKey: true })
    links[1]?.dispatchEvent(modified)
    flush()
    expect(modified.defaultPrevented).toBe(false)
    links[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }))
    flush()
    const outside = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 })
    links[2]?.dispatchEvent(outside)
    flush()
    expect(outside.defaultPrevented).toBe(false)
    expect(went).toEqual(["/~/hello/main", "/x"])
  })
})

import { createOverlayRoot } from "../src/lib/overlay"

describe("Overlay theme", () => {
  test("an overlay in the body follows the page's theme and accent when they change", async () => {
    document.documentElement.setAttribute("data-theme", "dark")
    document.documentElement.style.setProperty("--accent", "#111111") // lint-tokens-ignore
    // A row's menu draws in an overlay root, outside the table it was opened from.
    const OverlayUser = () => {
      createOverlayRoot(undefined)
      return null
    }
    const dispose = render(() => <OverlayUser />, document.body)
    try {
      await tick()
      const root = one("[data-part=overlay-root]")
      expect(root.getAttribute("data-theme")).toBe("dark")
      document.documentElement.setAttribute("data-theme", "light")
      document.documentElement.style.setProperty("--accent", "#222222") // lint-tokens-ignore
      await tick(4)
      expect(root.getAttribute("data-theme")).toBe("light")
      expect(root.style.getPropertyValue("--accent")).toBe("#222222") // lint-tokens-ignore
    } finally {
      dispose()
      document.documentElement.removeAttribute("data-theme")
      document.documentElement.style.removeProperty("--accent")
    }
  })
})
