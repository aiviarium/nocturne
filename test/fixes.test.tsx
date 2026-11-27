// Fixes found while building the demo: each part works in context the way the demo needs it.
import { afterEach, describe, expect, test } from "bun:test"
import { createEffect, createSignal, flush } from "solid-js"
import {
  type Dictation,
  ListRow,
  LogViewer,
  MetaLine,
  NumberField,
  PhoneOverride,
  type RowKey,
  RowList,
  Select,
  SettingRow,
  Slider,
  TextField,
  ToolStep,
  type Transcriber,
  TranscriberProvider,
  useDictation,
  ViewHeader,
  WidgetMeters,
  WidgetStats,
} from "../src"
import { all, click, mount, one, tick } from "./dom"

let cleanup: Array<() => void> = []
afterEach(() => {
  for (const c of cleanup) c()
  cleanup = []
  document.body.innerHTML = ""
})
const track = <T extends { dispose: () => void }>(m: T) => {
  cleanup.push(m.dispose)
  return m
}

describe("lists keep their rows when the data is made afresh", () => {
  test("WidgetMeters and WidgetStats key their rows by label", () => {
    const [n, setN] = createSignal(10, { ownedWrite: true })
    const { root } = track(
      mount(() => (
        <div>
          <WidgetMeters
            label="Load"
            items={[
              { label: "CPU", value: n() },
              { label: "Memory", value: 50 },
            ]}
          />
          <WidgetStats items={[{ label: "p50", value: String(n()) }]} />
        </div>
      )),
    )
    const row = one(".nc-wmeters__row", root)
    const stat = one(".nc-wstats__item", root)
    setN(70)
    flush()
    expect(one(".nc-wmeters__row", root)).toBe(row)
    expect(one(".nc-wstats__item", root)).toBe(stat)
    expect(one("[role=progressbar]", row).getAttribute("aria-valuenow")).toBe("70")
    expect(stat.textContent).toContain("70")
  })

  test("LogViewer keys its lines by id", () => {
    const [entries, setEntries] = createSignal([{ id: 1, text: "boot" }], { ownedWrite: true })
    const { root } = track(mount(() => <LogViewer entries={entries()} />))
    const first = one("[data-part=log-line]", root)
    setEntries([
      { id: 1, text: "boot" },
      { id: 2, text: "ready" },
    ])
    flush()
    const lines = all("[data-part=log-line]")
    expect(lines.length).toBe(2)
    expect(lines[0]).toBe(first)
  })

  test("MetaLine keeps its parts by position", () => {
    const [who, setWho] = createSignal("Mira", { ownedWrite: true })
    const { root } = track(mount(() => <MetaLine items={[who(), "2h ago"]} />))
    const part = one(".nc-metaline__item", root)
    setWho("Jon")
    flush()
    expect(one(".nc-metaline__item", root)).toBe(part)
    expect(one("[data-part=meta-line]", root).textContent).toBe("Jon·2h ago")
  })
})

describe("one-time reads", () => {
  test("ToolStep opens with defaultOpen from data, and later data leaves it as the person set it", () => {
    const [status, setStatus] = createSignal<"error" | "ok">("error", { ownedWrite: true })
    const { root } = track(
      mount(() => (
        <ToolStep
          verb="Ran"
          arg="tests"
          status={status()}
          output="1 failed"
          defaultOpen={status() === "error"}
        />
      )),
    )
    const button = one("[aria-expanded]", root)
    expect(button.getAttribute("aria-expanded")).toBe("true")
    setStatus("ok")
    flush()
    expect(button.getAttribute("aria-expanded")).toBe("true")
    click(button)
    flush()
    expect(button.getAttribute("aria-expanded")).toBe("false")
  })

  test("a dictation started from an effect records", async () => {
    const transcriber: Transcriber = {
      available: () => true,
      start: async () => ({ finish: async () => "hello", cancel: () => {} }),
    }
    let voice!: Dictation
    const [ask, setAsk] = createSignal(0, { ownedWrite: true })
    const Probe = () => {
      voice = useDictation({ insert: () => {} })
      createEffect(ask, (n) => {
        if (n) void voice.start()
      })
      return <span data-test="phase">{voice.state().state}</span>
    }
    const { root } = track(
      mount(() => (
        <TranscriberProvider transcriber={transcriber}>
          <Probe />
        </TranscriberProvider>
      )),
    )
    setAsk(1)
    flush()
    await tick()
    flush()
    expect(one("[data-test=phase]", root).textContent).toBe("recording")
  })
})

describe("controls named by a setting row", () => {
  test("Select, NumberField and Slider take aria-labelledby", () => {
    const { root } = track(
      mount(() => (
        <div>
          <SettingRow
            title="Lens"
            control={(ids) => (
              <Select aria-labelledby={ids.labelId} value="a" options={[{ value: "a", label: "A" }]} />
            )}
          />
          <SettingRow
            title="Keep"
            control={(ids) => <NumberField aria-labelledby={ids.labelId} value={3} onCommit={() => {}} />}
          />
          <SettingRow
            title="Volume"
            control={(ids) => <Slider aria-labelledby={ids.labelId} defaultValue={40} field />}
          />
        </div>
      )),
    )
    const rows = all("[data-part=setting-row]")
    const named = (row: HTMLElement, selector: string) => {
      const el = one(selector, row)
      const id = el.getAttribute("aria-labelledby")
      expect(id).toBeTruthy()
      expect(el.hasAttribute("aria-label")).toBe(false)
      return document.getElementById(id!)?.textContent
    }
    expect(named(rows[0]!, "[data-part=select] button")).toBe("Lens")
    expect(named(rows[1]!, "[data-part=number-field] input:not([aria-hidden])")).toBe("Keep")
    expect(named(rows[2]!, "[data-part=slider] [role=slider], [data-part=slider] input[type=range]")).toBe(
      "Volume",
    )
    expect(root).toBeTruthy()
  })

  test("an inline Select keeps its label beside the control, and the label names it", () => {
    const { root } = track(
      mount(() => <Select label="Range" inline value="7d" options={[{ value: "7d", label: "7 days" }]} />),
    )
    const select = one("[data-part=select]", root)
    expect(select.hasAttribute("data-inline")).toBe(true)
    expect(select.classList.contains("nc-field--inline")).toBe(true)
    const trigger = one("button", select)
    const label = one(".nc-field__label", select)
    const names = `${trigger.getAttribute("aria-labelledby") ?? ""} ${label.id}`
    expect(label.id && names.includes(label.id)).toBeTruthy()
  })

  test("TextField's mono puts the input in the mono face", () => {
    const { root } = track(mount(() => <TextField label="Prefix" mono value="ak_live" />))
    expect(one("input", root).classList.contains("nc-mono")).toBe(true)
  })
})

describe("view header", () => {
  test("a ViewAction with a menu opens it from its button and reports the item", async () => {
    const picked: string[] = []
    const { root } = track(
      mount(() => (
        <ViewHeader
          title="Overview"
          actions={[
            {
              id: "add",
              label: "Add widget",
              icon: "plus",
              menu: [
                { id: "cpu", label: "CPU" },
                { id: "disk", label: "Disk" },
              ],
              onSelect: (id) => picked.push(id),
            },
          ]}
        />
      )),
    )
    const trigger = one("[data-action=add]", root)
    expect(trigger.getAttribute("aria-label")).toBe("Add widget")
    click(trigger)
    flush()
    await tick()
    const item = all("[role=menuitem]").find((m) => m.textContent?.includes("Disk"))
    expect(item).toBeTruthy()
    click(item!)
    flush()
    await tick()
    expect(picked).toEqual(["disk"])
  })

  test("an overflow action's menu items are in the More menu under its label", async () => {
    const picked: string[] = []
    const { root } = track(
      mount(() => (
        <ViewHeader
          title="Overview"
          actions={[
            {
              id: "sort",
              label: "Sort by",
              overflow: true,
              menu: [{ id: "name", label: "Name" }],
              onSelect: (id) => picked.push(id),
            },
          ]}
        />
      )),
    )
    click(one("[data-part=view-overflow]", root))
    flush()
    await tick()
    click(all("[role=menuitem]").find((m) => m.textContent?.includes("Name"))!)
    flush()
    await tick()
    expect(picked).toEqual(["name"])
  })

  test("in a phone-sized window the trail's parent is the back control and the stepper goes", () => {
    const up: string[] = []
    const { root } = track(
      mount(() => (
        <PhoneOverride value={true}>
          <ViewHeader
            trail={[
              { id: "issues", label: "Issues", onClick: () => up.push("issues") },
              { id: "rec", label: "WEB-142" },
            ]}
            stepper={{ index: 0, total: 3, prev: () => {}, next: () => {} }}
          />
        </PhoneOverride>
      )),
    )
    expect(root.querySelector("[data-part=trail]")).toBeNull()
    expect(root.querySelector("[data-part=view-stepper]")).toBeNull()
    const back = one("[data-part=view-back]", root)
    expect(back.getAttribute("aria-label")).toBe("Back to Issues")
    expect(one("[data-part=view-title]", root).textContent).toBe("WEB-142")
    click(back)
    expect(up).toEqual(["issues"])
  })
})

describe("grouped RowList", () => {
  test("rows under group headings are the list's own: selection works across the groups", () => {
    const seen: RowKey[][] = []
    const issues = [
      { id: "W-1", state: "Todo" },
      { id: "W-2", state: "Todo" },
      { id: "W-3", state: "Done" },
    ]
    const { root } = track(
      mount(() => (
        <RowList
          label="Issues"
          items={issues}
          getKey={(i) => i.id}
          group={(i) => i.state}
          section={(g, rows) => ({ label: g, count: rows.length, icon: "list" })}
          selectable
          onSelectedChange={(k) => seen.push(k)}
        >
          {(i) => <ListRow title={i.id} />}
        </RowList>
      )),
    )
    const sections = all("[data-part=row-section]")
    expect(sections.length).toBe(2)
    expect(sections[0]!.textContent).toContain("Todo")
    expect(sections[0]!.querySelectorAll("[data-part=list-row]").length).toBe(2)
    const mains = all(".nc-lrow__main")
    click(mains[0]!)
    mains[2]!.dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true }))
    flush()
    expect(seen.at(-1)).toEqual(["W-1", "W-2", "W-3"])
    expect(all("[data-part=list-row][data-selected]").length).toBe(3)
    expect(root.querySelector("[data-part=bulk-bar]")).toBeTruthy()
  })
})
