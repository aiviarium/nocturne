import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { createSignal, Show } from "solid-js"
import {
  NavigationScreen,
  ScreenRefresh,
  ScreenSearch,
  Sheet,
  Skeleton,
  State,
  StatusDot,
  StopGlyph,
  StreamState,
  type StreamStatus,
  SwipeButton,
  TabDropFrame,
  TabPanel,
  TabStrip,
  Tabs,
  TextField,
  Token,
  ToolStep,
  ToolSteps,
  Tooltip,
  ViewHeader,
  ViewLayout,
  WidgetControls,
  WidgetGauge,
  WidgetProgress,
  WidgetSparkline,
  WidgetUptime,
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

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** A touch event with the one touch point at `y`. */
const touch = (el: Element, type: string, y?: number) => {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, "touches", { value: y === undefined ? [] : [{ clientX: 0, clientY: y }] })
  el.dispatchEvent(event)
}

describe("ScreenSearch", () => {
  test("outside a phone screen it is an inline search field that reports what is typed", () => {
    const typed: string[] = []
    const { root } = track(
      mount(() => <ScreenSearch value="" placeholder="Find" onInput={(v) => typed.push(v)} />),
    )
    const input = one<HTMLInputElement>("label.nc-search input[type=search]", root)
    expect(input.getAttribute("aria-label")).toBe("Find")
    input.value = "abc"
    input.dispatchEvent(new Event("input", { bubbles: true }))
    expect(typed).toEqual(["abc"])
  })

  test("inside a phone screen the field moves under the screen's title", () => {
    const typed: string[] = []
    const { root } = track(
      mount(() => (
        <NavigationScreen title="Inbox">
          <ScreenSearch value="" label="Search inbox" onInput={(v) => typed.push(v)} />
        </NavigationScreen>
      )),
    )
    const field = one("[data-part=screen-search]", root)
    expect(one("[data-part=screen-content]", root).querySelector("input")).toBeNull()
    const input = one<HTMLInputElement>("input", field)
    expect(input.getAttribute("aria-label")).toBe("Search inbox")
    input.value = "x"
    input.dispatchEvent(new Event("input", { bubbles: true }))
    expect(typed).toEqual(["x"])
  })
})

describe("ScreenRefresh", () => {
  test("pulling the screen down far enough calls onRefresh and shows a spinner until it settles", async () => {
    let calls = 0
    let done = () => {}
    const { root } = track(
      mount(() => (
        <NavigationScreen title="Feed">
          <ScreenRefresh
            onRefresh={() => {
              calls++
              return new Promise<void>((resolve) => {
                done = resolve
              })
            }}
          />
        </NavigationScreen>
      )),
    )
    const scroller = one("[data-part=screen-scroll]", root)
    expect(root.querySelector("[data-part=refresh]")).toBeNull()
    touch(scroller, "touchstart", 0)
    touch(scroller, "touchmove", 300)
    expect(one("[data-part=refresh]", root)).toBeTruthy()
    touch(scroller, "touchend")
    await tick()
    expect(calls).toBe(1)
    expect(one("[data-part=refresh] [role=status]", root).getAttribute("aria-label")).toBe("Refreshing")
    done()
    await tick()
    expect(root.querySelector("[data-part=refresh]")).toBeNull()
  })

  test("a short pull does not refresh", async () => {
    let calls = 0
    const { root } = track(
      mount(() => (
        <NavigationScreen title="Feed">
          <ScreenRefresh onRefresh={() => calls++} />
        </NavigationScreen>
      )),
    )
    const scroller = one("[data-part=screen-scroll]", root)
    touch(scroller, "touchstart", 0)
    touch(scroller, "touchmove", 20)
    touch(scroller, "touchend")
    await tick()
    expect(calls).toBe(0)
  })
})

describe("Sheet", () => {
  test("opens as a labelled dialog and closes from its close button and from Escape", async () => {
    const [open, setOpen] = createSignal(true)
    let closed = 0
    track(
      mount(() => (
        <Sheet
          open={open()}
          title="Filters"
          onClose={() => {
            closed++
            setOpen(false)
          }}
        >
          <button type="button">Apply</button>
        </Sheet>
      )),
    )
    const sheet = one("[data-part=sheet]")
    expect(sheet.getAttribute("role")).toBe("dialog")
    expect(document.getElementById(sheet.getAttribute("aria-labelledby") as string)?.textContent).toBe(
      "Filters",
    )
    click(one("[data-part=sheet-close]"))
    await wait(300)
    expect(closed).toBe(1)
    expect(all("[data-part=sheet]")).toHaveLength(0)

    setOpen(true)
    await tick()
    press(document.body, "Escape")
    await wait(300)
    expect(closed).toBe(2)
    expect(all("[data-part=sheet]")).toHaveLength(0)
  })

  test("a sheet that is not dismissible ignores Escape", async () => {
    let closed = 0
    track(
      mount(() => (
        <Sheet open label="Unsaved" dismissible={false} onClose={() => closed++}>
          <p>Draft</p>
        </Sheet>
      )),
    )
    expect(one("[data-part=sheet]").getAttribute("aria-label")).toBe("Unsaved")
    press(document.body, "Escape")
    await wait(300)
    expect(closed).toBe(0)
  })
})

describe("Skeleton", () => {
  test("is a hidden placeholder that takes the given size and the circle shape", () => {
    const { root } = track(mount(() => <Skeleton width="60%" height="12px" circle />))
    const el = one("[data-part=skeleton]", root)
    expect(el.getAttribute("aria-hidden")).toBe("true")
    expect(el.style.width).toBe("60%")
    expect(el.style.height).toBe("12px")
    expect(el.classList.contains("nc-skeleton--circle")).toBe(true)
  })
})

describe("StatusDot and State", () => {
  test("the dot carries its status and follows a change", async () => {
    const [status, setStatus] = createSignal<"live" | "error">("live")
    const { root } = track(mount(() => <StatusDot status={status()} />))
    const dot = one("[data-part=status-dot]", root)
    expect(dot.getAttribute("data-status")).toBe("live")
    expect(dot.classList.contains("nc-dot--live")).toBe(true)
    setStatus("error")
    expect(dot.getAttribute("data-status")).toBe("error")
    expect(dot.classList.contains("nc-dot--error")).toBe(true)
  })

  test("a state is a dot and a word, and only warn and error colour the word", () => {
    const { root } = track(
      mount(() => (
        <>
          <State status="warn">Needs you</State>
          <State status="ok">Done</State>
        </>
      )),
    )
    const [warn, ok] = all("[data-part=state]").filter((el) => root.contains(el))
    expect(warn!.getAttribute("data-status")).toBe("warn")
    expect(warn!.textContent).toBe("Needs you")
    expect(one("[data-part=status-dot]", warn!).getAttribute("data-status")).toBe("warn")
    expect(warn!.classList.contains("nc-state--warn")).toBe(true)
    expect(ok!.className).not.toContain("nc-state--")
  })
})

describe("StopGlyph", () => {
  test("is a hidden icon that takes extra classes", () => {
    const { root } = track(mount(() => <StopGlyph class="extra" />))
    const svg = one("[data-part=icon]", root)
    expect(svg.getAttribute("aria-hidden")).toBe("true")
    expect(svg.classList.contains("extra")).toBe(true)
    expect(svg.querySelector("rect")).toBeTruthy()
  })
})

describe("StreamState", () => {
  test("names the state and shows the detail that goes with it", () => {
    const [state, setState] = createSignal<StreamStatus>("live")
    const { root } = track(
      mount(() => <StreamState state={state()} offset={120} buffered={4} exitCode={0} code="504 timeout" />),
    )
    const el = one("[data-part=stream-state]", root)
    const meta = () => el.querySelector(".nc-stream__meta")?.textContent ?? null
    expect(el.getAttribute("role")).toBe("status")
    expect(el.getAttribute("data-state")).toBe("live")
    expect(el.textContent).toBe("Live")
    expect(meta()).toBeNull()
    setState("resuming")
    expect(meta()).toBe("since 120")
    setState("paused")
    expect(meta()).toBe("4 buffered")
    setState("ended")
    expect(meta()).toBe("exit 0")
    setState("error")
    expect(el.getAttribute("data-state")).toBe("error")
    expect(el.classList.contains("nc-stream--error")).toBe(true)
    expect(meta()).toBe("504 timeout")
    expect(one("[data-part=status-dot]", el).getAttribute("data-status")).toBe("error")
  })
})

describe("SwipeButton", () => {
  test("closes the row and runs its action when pressed", () => {
    const calls: string[] = []
    const { root } = track(
      mount(() => (
        <SwipeButton
          action={{
            id: "delete",
            label: "Delete",
            tone: "danger",
            icon: "trash",
            onAction: () => calls.push("run"),
          }}
          close={() => calls.push("close")}
        />
      )),
    )
    const button = one("[data-swipe-action=delete]", root)
    expect(button.getAttribute("data-tone")).toBe("danger")
    expect(button.textContent).toBe("Delete")
    click(button)
    expect(calls).toEqual(["close", "run"])
  })

  test("is neutral without a tone", () => {
    const { root } = track(
      mount(() => <SwipeButton action={{ id: "pin", label: "Pin", onAction: () => {} }} close={() => {}} />),
    )
    expect(one("[data-swipe-action=pin]", root).getAttribute("data-tone")).toBe("neutral")
  })
})

describe("TabDropFrame", () => {
  test("shows drop zones only while a tab of its group is dragged, and reports where it was dropped", () => {
    const drops: unknown[] = []
    const { root } = track(
      mount(() => (
        <>
          <TabStrip
            label="Tabs"
            stripId="left"
            dragGroup="frame-test"
            items={[{ id: "a", label: "A" }]}
            value="a"
            onChange={() => {}}
          />
          <TabDropFrame dragGroup="frame-test" stripId="right" onDrop={(d) => drops.push(d)}>
            <p>Body</p>
          </TabDropFrame>
        </>
      )),
    )
    const frame = one("[data-part=drop-frame]", root)
    expect(frame.textContent).toBe("Body")
    expect(frame.querySelector("[data-part=drop-zones]")).toBeNull()

    const store = new Map<string, string>()
    const dt = {
      types: [] as string[],
      dropEffect: "none",
      effectAllowed: "uninitialized",
      setData(type: string, value: string) {
        store.set(type, value)
        this.types = [...store.keys()]
      },
      getData: (type: string) => store.get(type) ?? "",
    }
    const fire = (el: Element, type: string, x = 0, y = 0) => {
      const event = new Event(type, { bubbles: true, cancelable: true })
      Object.defineProperty(event, "dataTransfer", { value: dt })
      Object.defineProperty(event, "clientX", { value: x })
      Object.defineProperty(event, "clientY", { value: y })
      el.dispatchEvent(event)
      return event
    }
    fire(one("[data-part=tab-strip-tab]", root), "dragstart")
    const zones = one("[data-part=drop-zones]", frame)
    zones.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect
    expect(fire(zones, "dragover", 5, 50).defaultPrevented).toBe(true)
    expect(one(".nc-dropframe__target", zones).getAttribute("data-edge")).toBe("left")
    fire(zones, "drop", 50, 50)
    expect(drops).toEqual([{ tabId: "a", from: "left", edge: "center" }])
    expect(frame.querySelector("[data-part=drop-zones]")).toBeNull()
  })

  test("the zones go away when the strip a tab was dragged from is removed mid-drag", async () => {
    const [shown, setShown] = createSignal(true)
    const { root } = track(
      mount(() => (
        <>
          <Show when={shown()}>
            <TabStrip
              label="Tabs"
              stripId="gone"
              dragGroup="frame-cleanup"
              items={[{ id: "a", label: "A" }]}
              value="a"
              onChange={() => {}}
            />
          </Show>
          <TabDropFrame dragGroup="frame-cleanup" stripId="right" onDrop={() => {}}>
            <p>Body</p>
          </TabDropFrame>
        </>
      )),
    )
    const event = new Event("dragstart", { bubbles: true, cancelable: true })
    Object.defineProperty(event, "dataTransfer", {
      value: { types: [], setData() {}, getData: () => "", effectAllowed: "" },
    })
    one("[data-part=tab-strip-tab]", root).dispatchEvent(event)
    const frame = one("[data-part=drop-frame]", root)
    expect(frame.querySelector("[data-part=drop-zones]")).not.toBeNull()
    setShown(false)
    await tick()
    expect(frame.querySelector("[data-part=drop-zones]")).toBeNull()
  })

  test("a drag from another group shows no zones", () => {
    const { root } = track(
      mount(() => (
        <>
          <TabStrip
            label="Tabs"
            dragGroup="other"
            items={[{ id: "a", label: "A" }]}
            value="a"
            onChange={() => {}}
          />
          <TabDropFrame dragGroup="frame-test" stripId="right" onDrop={() => {}}>
            <p>Body</p>
          </TabDropFrame>
        </>
      )),
    )
    const event = new Event("dragstart", { bubbles: true, cancelable: true })
    Object.defineProperty(event, "dataTransfer", {
      value: { types: [], setData() {}, getData: () => "", effectAllowed: "" },
    })
    const tab = one("[data-part=tab-strip-tab]", root)
    tab.dispatchEvent(event)
    expect(root.querySelector("[data-part=drop-zones]")).toBeNull()
    tab.dispatchEvent(new Event("dragend", { bubbles: true }))
  })
})

describe("TabPanel", () => {
  test("shows its content only while its tab is selected, labelled by that tab", () => {
    const [value, setValue] = createSignal("one")
    const { root } = track(
      mount(() => (
        <>
          <Tabs
            label="Sections"
            idPrefix="t"
            value={value()}
            onChange={setValue}
            items={[
              { id: "one", label: "One" },
              { id: "two", label: "Two" },
            ]}
          />
          <TabPanel idPrefix="t" id="one" value={value()}>
            First
          </TabPanel>
          <TabPanel idPrefix="t" id="two" value={value()}>
            Second
          </TabPanel>
        </>
      )),
    )
    const [first, second] = all("[data-part=tab-panel]").filter((el) => root.contains(el))
    expect(first!.getAttribute("role")).toBe("tabpanel")
    expect(document.getElementById(first!.getAttribute("aria-labelledby") as string)?.textContent).toBe("One")
    expect(first!.hidden).toBe(false)
    expect(first!.textContent).toBe("First")
    expect(second!.hidden).toBe(true)
    expect(second!.textContent).toBe("")
    click(all("[role=tab]")[1]!)
    expect(first!.hidden).toBe(true)
    expect(first!.textContent).toBe("")
    expect(second!.hidden).toBe(false)
    expect(second!.textContent).toBe("Second")
  })
})

describe("TextField", () => {
  test("labels its input, reports input and shows an error in place of the help", () => {
    const [error, setError] = createSignal<string | undefined>()
    const typed: string[] = []
    const { root } = track(
      mount(() => (
        <TextField
          label="Name"
          help="As shown to others"
          error={error()}
          onInput={(e) => typed.push(e.currentTarget.value)}
        />
      )),
    )
    const field = one("[data-part=text-field]", root)
    const input = one<HTMLInputElement>("input", field)
    expect(one("label", field).getAttribute("for")).toBe(input.id)
    expect(document.getElementById(input.getAttribute("aria-describedby") as string)?.textContent).toBe(
      "As shown to others",
    )
    expect(input.hasAttribute("aria-invalid")).toBe(false)
    input.value = "Ada"
    input.dispatchEvent(new Event("input", { bubbles: true }))
    expect(typed).toEqual(["Ada"])
    setError("Enter a name")
    expect(input.getAttribute("aria-invalid")).toBe("true")
    expect(input.classList.contains("nc-input--error")).toBe(true)
    expect(one(".nc-field__help--error", field).textContent).toBe("Enter a name")
  })

  test("the search variant names its input and shows the shortcut", () => {
    const { root } = track(mount(() => <TextField variant="search" label="Search files" kbd="Ctrl K" />))
    const field = one("[data-part=text-field]", root)
    expect(field.getAttribute("data-variant")).toBe("search")
    const input = one<HTMLInputElement>("input", field)
    expect(input.type).toBe("search")
    expect(input.getAttribute("aria-label")).toBe("Search files")
    expect(field.querySelector("kbd, [data-part=kbd], .nc-kbd")).toBeTruthy()
  })
})

describe("Token", () => {
  test("carries its kind, and a person token shows an avatar", () => {
    const { root } = track(
      mount(() => (
        <>
          <Token kind="cmd">/review</Token>
          <Token kind="person" name="Ada Lovelace">
            Ada
          </Token>
        </>
      )),
    )
    const [cmd, person] = all("[data-part=token]").filter((el) => root.contains(el))
    expect(cmd!.getAttribute("data-kind")).toBe("cmd")
    expect(cmd!.classList.contains("nc-token--cmd")).toBe(true)
    expect(cmd!.textContent).toBe("/review")
    expect(cmd!.querySelector(".nc-avatar")).toBeNull()
    expect(person!.getAttribute("data-kind")).toBe("person")
    expect(person!.querySelector(".nc-avatar")).toBeTruthy()
  })
})

describe("ToolStep and ToolSteps", () => {
  test("a step with output expands and collapses it on click", () => {
    const { root } = track(
      mount(() => <ToolStep verb="Running" arg="bun test" status="running" output="12 pass" />),
    )
    const step = one("[data-part=tool-step]", root)
    expect(step.getAttribute("data-status")).toBe("running")
    const button = one("button", step)
    const output = one<HTMLPreElement>("pre", step)
    expect(button.getAttribute("aria-controls")).toBe(output.id)
    expect(button.getAttribute("aria-expanded")).toBe("false")
    expect(output.hidden).toBe(true)
    click(button)
    expect(button.getAttribute("aria-expanded")).toBe("true")
    expect(output.hidden).toBe(false)
    expect(output.textContent).toBe("12 pass")
    click(button)
    expect(output.hidden).toBe(true)
  })

  test("a finished step without output is a plain row with no dot", () => {
    const { root } = track(mount(() => <ToolStep verb="Read" arg="src/index.ts" />))
    const step = one("[data-part=tool-step]", root)
    expect(step.getAttribute("data-status")).toBe("ok")
    expect(step.querySelector("button")).toBeNull()
    expect(step.querySelector("[data-part=status-dot]")).toBeNull()
    expect(step.textContent).toContain("done")
  })

  test("the list renders one row per step under its label", () => {
    const { root } = track(
      mount(() => (
        <ToolSteps
          label="What it did"
          steps={[
            { verb: "Read", arg: "a.ts" },
            { verb: "Edited", arg: "b.ts", status: "error" },
          ]}
        />
      )),
    )
    const list = one("[data-part=tool-steps]", root)
    expect(list.getAttribute("role")).toBe("group")
    expect(list.getAttribute("aria-label")).toBe("What it did")
    const steps = all("[data-part=tool-step]").filter((el) => list.contains(el))
    expect(steps.map((s) => s.getAttribute("data-status"))).toEqual(["ok", "error"])
  })
})

describe("Tooltip", () => {
  test("appears after hovering for its delay, describes the anchor, and goes on leave", async () => {
    const { root } = track(
      mount(() => (
        <Tooltip content="Save" shortcut="Ctrl S" delay={0}>
          <button type="button">S</button>
        </Tooltip>
      )),
    )
    const anchor = one("[data-part=tooltip-anchor]", root)
    expect(all("[data-part=tooltip]")).toHaveLength(0)
    anchor.dispatchEvent(new PointerEvent("pointerenter", { bubbles: false }))
    await tick()
    const tip = one("[data-part=tooltip]")
    expect(tip.getAttribute("role")).toBe("tooltip")
    expect(tip.textContent).toContain("Save")
    expect(anchor.getAttribute("aria-describedby")).toBe(tip.id)
    expect(root.contains(tip)).toBe(true)
    anchor.dispatchEvent(new PointerEvent("pointerleave", { bubbles: false }))
    await tick()
    expect(all("[data-part=tooltip]")).toHaveLength(0)
    expect(anchor.hasAttribute("aria-describedby")).toBe(false)
  })

  test("Escape hides it", async () => {
    const { root } = track(
      mount(() => (
        <Tooltip content="Copy" delay={0}>
          <button type="button">C</button>
        </Tooltip>
      )),
    )
    const anchor = one("[data-part=tooltip-anchor]", root)
    anchor.dispatchEvent(new PointerEvent("pointerenter", { bubbles: false }))
    await tick()
    expect(all("[data-part=tooltip]")).toHaveLength(1)
    press(one("button", anchor), "Escape")
    await tick()
    expect(all("[data-part=tooltip]")).toHaveLength(0)
  })
})

describe("ViewHeader", () => {
  test("renders nothing when it has nothing to say", () => {
    const { root } = track(mount(() => <ViewHeader />))
    expect(root.querySelector("[data-part=view-header]")).toBeNull()
  })

  test("shows the crumbs and runs actions, with the primary one last", () => {
    const calls: string[] = []
    const { root } = track(
      mount(() => (
        <ViewHeader
          crumbs={[{ label: "Docs", onClick: () => calls.push("crumb") }, { label: "Guide" }]}
          actions={[
            { id: "new", label: "Publish", primary: true, onClick: () => calls.push("publish") },
            { id: "filter", label: "Filter", icon: "filter", onClick: () => calls.push("filter") },
          ]}
        />
      )),
    )
    const header = one("[data-part=view-header]", root)
    const crumbs = one("[data-part=breadcrumbs]", header)
    expect(one("[aria-current=page]", crumbs).textContent).toBe("Guide")
    click(one("a", crumbs))
    const buttons = Array.from(one("[data-part=view-actions]", header).querySelectorAll("[data-action]"))
    expect(buttons.map((b) => b.getAttribute("data-action"))).toEqual(["filter", "new"])
    click(buttons[0]!)
    click(buttons[1]!)
    expect(calls).toEqual(["crumb", "filter", "publish"])
  })

  test("inside a layout with a side panel it shows the panel's toggle", () => {
    const { root } = track(
      mount(() => (
        <ViewLayout id="test.header" header={<ViewHeader />} aside={<p>Outline</p>} asideLabel="Outline">
          <p>Main</p>
        </ViewLayout>
      )),
    )
    const toggle = one("[data-part=view-aside-toggle]", root)
    expect(toggle.getAttribute("aria-label")).toBe("Show outline")
  })
})

describe("ViewLayout", () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  test("lays out the sidebar and the main column, and the edge's click hides the sidebar", () => {
    const { root } = track(
      mount(() => (
        <ViewLayout id="test.basic" sidebar={<nav>Tree</nav>} sidebarLabel="Pages">
          <p>Main</p>
        </ViewLayout>
      )),
    )
    const layout = one("[data-part=view-layout]", root)
    expect(layout.getAttribute("data-layout")).toBe("test.basic")
    expect(layout.getAttribute("data-sidebar")).toBe("open")
    expect(one("[data-part=view-sidebar]", layout).getAttribute("aria-label")).toBe("Pages")
    expect(one("[data-part=view-main]", layout).textContent).toBe("Main")
    const edge = one("[data-part=view-sidebar-edge]", layout)
    edge.setPointerCapture = () => {}
    edge.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 240, pointerId: 1 }))
    layout.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 240, pointerId: 1 }))
    expect(layout.getAttribute("data-sidebar")).toBe("collapsed")
    expect(JSON.parse(localStorage.getItem("nc.viewLayout.v1") as string)["test.basic"]).toEqual({
      collapsed: true,
    })
  })

  test("the sidebar edge resizes with the arrow keys and remembers the width", () => {
    const { root } = track(
      mount(() => (
        <ViewLayout id="test.keys" sidebar={<nav>Tree</nav>}>
          <p>Main</p>
        </ViewLayout>
      )),
    )
    const edge = one("[data-part=view-sidebar-edge]", root)
    expect(edge.getAttribute("aria-valuenow")).toBe("240")
    press(edge, "ArrowRight")
    expect(edge.getAttribute("aria-valuenow")).toBe("256")
    expect(one("[data-part=view-layout]", root).style.getPropertyValue("--nc-view-sidebar")).toBe("256px")
    expect(JSON.parse(localStorage.getItem("nc.viewLayout.v1") as string)["test.keys"].w).toBe(256)
  })

  test("on a phone screen at a view's start the sidebar is the screen", () => {
    const { root } = track(
      mount(() => (
        <NavigationScreen title="Docs" level="index">
          <ViewLayout id="test.phone" sidebar={<nav>Tree</nav>}>
            <p>Main</p>
          </ViewLayout>
        </NavigationScreen>
      )),
    )
    const layout = one("[data-part=view-layout]", root)
    expect(layout.getAttribute("data-sidebar")).toBe("screen")
    expect(layout.textContent).toBe("Tree")
    expect(one("[data-part=screen]", root).hasAttribute("data-large")).toBe(true)
  })
})

describe("WidgetControls", () => {
  test("holds the widget's buttons", () => {
    let paused = 0
    const { root } = track(
      mount(() => (
        <WidgetControls>
          <button type="button" onClick={() => paused++}>
            Pause
          </button>
        </WidgetControls>
      )),
    )
    const controls = one("[data-part=widget-controls]", root)
    click(one("button", controls))
    expect(paused).toBe(1)
  })
})

describe("WidgetGauge", () => {
  test("names its value, clamps it to 0 to 100 and shows a custom display", () => {
    const [value, setValue] = createSignal(42.4)
    const { root } = track(mount(() => <WidgetGauge value={value()} label="CPU" />))
    const gauge = one("[data-part=widget-gauge]", root)
    expect(gauge.getAttribute("aria-label")).toBe("CPU 42%")
    expect(one(".nc-wgauge__value", gauge).textContent).toBe("42%")
    setValue(140)
    expect(gauge.getAttribute("aria-label")).toBe("CPU 100%")
    const custom = track(mount(() => <WidgetGauge value={50} label="Disk" display="512 GB" />))
    expect(one("[data-part=widget-gauge] .nc-wgauge__value", custom.root).textContent).toBe("512 GB")
  })
})

describe("WidgetProgress", () => {
  test("is a progress bar whose value is clamped and follows changes", () => {
    const [value, setValue] = createSignal(30)
    const { root } = track(mount(() => <WidgetProgress value={value()} label="Upload" />))
    const bar = one("[data-part=widget-progress]", root)
    expect(bar.getAttribute("role")).toBe("progressbar")
    expect(bar.getAttribute("aria-label")).toBe("Upload")
    expect(bar.getAttribute("aria-valuenow")).toBe("30")
    expect(one<HTMLElement>(".nc-wprogress__bar", bar).style.width).toBe("30%")
    setValue(-5)
    expect(bar.getAttribute("aria-valuenow")).toBe("0")
    setValue(250)
    expect(bar.getAttribute("aria-valuenow")).toBe("100")
  })
})

describe("WidgetSparkline", () => {
  test("draws a bar per value and marks the newest ones live", () => {
    const { root } = track(
      mount(() => <WidgetSparkline values={[1, 2, 3, 4, 5]} label="Requests" live={2} />),
    )
    const spark = one("[data-part=widget-sparkline]", root)
    expect(spark.getAttribute("aria-label")).toBe("Requests")
    const bars = Array.from(spark.querySelectorAll<HTMLElement>(".nc-wspark__bar"))
    expect(bars).toHaveLength(5)
    expect(bars.map((b) => b.classList.contains("nc-wspark__bar--live"))).toEqual([
      false,
      false,
      false,
      true,
      true,
    ])
    expect(bars[4]!.style.height).toBe("100%")
  })
})

describe("WidgetUptime", () => {
  test("draws a cell per day in its state", () => {
    const { root } = track(mount(() => <WidgetUptime days={["up", "down", "none"]} label="Last 3 days" />))
    const strip = one("[data-part=widget-uptime]", root)
    expect(strip.getAttribute("aria-label")).toBe("Last 3 days")
    const cells = Array.from(strip.querySelectorAll(".nc-wuptime__cell"))
    expect(cells.map((c) => c.className.split("--")[1])).toEqual(["up", "down", "none"])
  })
})
