import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { createSignal, flush, Show } from "solid-js"
import {
  AppShell,
  ContextWidget,
  compactCount,
  NavigationScreen,
  RateWidget,
  ScreenRefresh,
  ScreenSearch,
  Sheet,
  SidebarHeader,
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
  Widget,
  WidgetControls,
  WidgetGauge,
  WidgetMeters,
  WidgetProgress,
  WidgetRing,
  WidgetSegments,
  WidgetSparkline,
  WidgetStats,
  WidgetSteps,
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
  flush()
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
    flush()
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
    flush()
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
            flush()
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
    flush()
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
    flush()
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
    flush()
    expect(meta()).toBe("since 120")
    setState("paused")
    flush()
    expect(meta()).toBe("4 buffered")
    setState("ended")
    flush()
    expect(meta()).toBe("exit 0")
    setState("error")
    flush()
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
      flush()
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
    flush()
    const frame = one("[data-part=drop-frame]", root)
    expect(frame.querySelector("[data-part=drop-zones]")).not.toBeNull()
    setShown(false)
    flush()
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
    flush()
    expect(root.querySelector("[data-part=drop-zones]")).toBeNull()
    tab.dispatchEvent(new Event("dragend", { bubbles: true }))
    flush()
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
    flush()
    expect(typed).toEqual(["Ada"])
    setError("Enter a name")
    flush()
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
    flush()
    await tick()
    const tip = one("[data-part=tooltip]")
    expect(tip.getAttribute("role")).toBe("tooltip")
    expect(tip.textContent).toContain("Save")
    expect(anchor.getAttribute("aria-describedby")).toBe(tip.id)
    expect(root.contains(tip)).toBe(true)
    anchor.dispatchEvent(new PointerEvent("pointerleave", { bubbles: false }))
    flush()
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
    flush()
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

  test("folds the start of the path into a menu, and every crumb shows its full text", async () => {
    const went: string[] = []
    const { root } = track(
      mount(() => (
        <ViewHeader
          fold={2}
          crumbs={[
            { label: "Workspace", onClick: () => went.push("workspace") },
            { label: "Projects", onClick: () => went.push("projects") },
            { label: "Atlas web", onClick: () => went.push("atlas") },
            { label: "WEB-142" },
          ]}
        />
      )),
    )
    const crumbs = one("[data-part=breadcrumbs]", root)
    const fold = one("[data-part=crumbs-fold]", crumbs)
    expect(fold.getAttribute("title")).toBe("Workspace / Projects")
    expect(crumbs.querySelectorAll("a").length).toBe(1)
    expect(one("a", crumbs).textContent).toBe("Atlas web")
    expect(one("[aria-current=page]", crumbs).textContent).toBe("WEB-142")
    expect(one("[aria-current=page] [title]", crumbs).getAttribute("title")).toBe("WEB-142")
    click(fold)
    await tick()
    const items = Array.from(document.querySelectorAll("[role=menuitem]"))
    expect(items.map((e) => e.textContent?.trim())).toEqual(["Workspace", "Projects"])
    click(items[1]!)
    expect(went).toEqual(["projects"])
  })

  test("a back control takes the place of the crumbs", () => {
    let back = 0
    const { root } = track(
      mount(() => (
        <ViewHeader
          back={{ label: "Sessions", onClick: () => back++ }}
          crumbs={[{ label: "Agents" }, { label: "Fix the redirect" }]}
        />
      )),
    )
    expect(root.querySelector("[data-part=breadcrumbs]")).toBeNull()
    const control = one("[data-part=view-back]", root)
    expect(control.textContent).toBe("Sessions")
    expect(control.getAttribute("title")).toBe("Back to Sessions")
    click(control)
    expect(back).toBe(1)
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

  test("goes up one level from its arrow, named after the level above", () => {
    const went: string[] = []
    const { root } = track(
      mount(() => (
        <ViewHeader
          up
          crumbs={[
            { label: "Projects", onClick: () => went.push("projects") },
            { label: "Atlas web", onClick: () => went.push("atlas") },
            { label: "WEB-142" },
          ]}
        />
      )),
    )
    const up = one("[data-part=view-up]", root)
    expect(up.getAttribute("aria-label")).toBe("Back to Atlas web")
    click(up)
    expect(went).toEqual(["atlas"])
  })

  test("the shell variant shows in the AppShell's header and keeps the bar hidden without it", () => {
    const [deep, setDeep] = createSignal(true)
    const { root } = track(
      mount(() => (
        <AppShell sidebar={<span>nav</span>}>
          <Show when={deep()}>
            <ViewHeader variant="shell" crumbs={[{ label: "Projects" }]} />
          </Show>
        </AppShell>
      )),
    )
    const bar = one("[data-part=shell-header]", root)
    expect(bar.hidden).toBe(false)
    const header = one("[data-part=view-header]", bar)
    expect(header.getAttribute("data-variant")).toBe("shell")
    expect(one("[data-part=shell-content]", root).querySelector("[data-part=view-header]")).toBeNull()
    setDeep(false)
    flush()
    expect(bar.hidden).toBe(true)
    expect(bar.querySelector("[data-part=view-header]")).toBeNull()
  })

  test("the shell variant shows in place outside an AppShell", () => {
    const { root } = track(mount(() => <ViewHeader variant="shell" crumbs={[{ label: "Projects" }]} />))
    expect(one("[data-part=view-header]", root).getAttribute("data-variant")).toBe("shell")
  })

  test("a crumb with a switcher opens the other places of its kind", async () => {
    const chosen: string[] = []
    const { root } = track(
      mount(() => (
        <ViewHeader
          crumbs={[
            {
              label: "Acme",
              switcher: {
                label: "Switch workspace",
                items: [
                  { id: "acme", label: "Acme" },
                  { id: "personal", label: "Personal" },
                ],
                onSelect: (id) => chosen.push(id),
              },
            },
            { label: "Projects" },
          ]}
        />
      )),
    )
    const button = one("[data-part=crumb-switcher]", root)
    expect(button.textContent).toBe("Acme")
    click(button)
    await tick()
    const personal = all("[role=menuitem]").find((m) => m.textContent?.includes("Personal"))!
    click(personal)
    expect(chosen).toEqual(["personal"])
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
    flush()
    layout.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 240, pointerId: 1 }))
    flush()
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
    flush()
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
    flush()
    expect(bar.getAttribute("aria-valuenow")).toBe("0")
    setValue(250)
    flush()
    expect(bar.getAttribute("aria-valuenow")).toBe("100")
  })
})

describe("WidgetSparkline", () => {
  test("draws a bar per value scaled to the largest, none marked apart", () => {
    const { root } = track(mount(() => <WidgetSparkline values={[1, 2, 3, 4, 5]} label="Requests" />))
    const spark = one("[data-part=widget-sparkline]", root)
    expect(spark.getAttribute("aria-label")).toBe("Requests")
    const bars = Array.from(spark.querySelectorAll<HTMLElement>(".nc-wspark__bar"))
    expect(bars).toHaveLength(5)
    expect(bars.every((b) => b.className === "nc-wspark__bar")).toBe(true)
    expect(bars[4]!.style.height).toBe("100%")
    expect(bars[0]!.style.height).toBe("20%")
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

describe("Widget", () => {
  test("leads with a figure and its unit, and names itself by its label", () => {
    const { root } = track(
      mount(() => <Widget figure="48" unit="tok/s" value="p50 41" label="Output rate" />),
    )
    const widget = one("[data-part=widget]", root)
    expect(widget.getAttribute("role")).toBe("group")
    expect(widget.getAttribute("aria-label")).toBe("Output rate")
    expect(one(".nc-widget__figure", widget).textContent).toBe("48tok/s")
    expect(one(".nc-widget__value", widget).textContent).toBe("p50 41")
    expect(widget.querySelector(".nc-widget__title")).toBeNull()
  })

  test("puts the unit on the value when there is no figure, and spreads the axis under the live part", () => {
    const { root } = track(
      mount(() => (
        <Widget title="Requests" value="1,284" unit="/ min" axis={["-60m", "Now"]}>
          <span class="live">bars</span>
        </Widget>
      )),
    )
    const widget = one("[data-part=widget]", root)
    expect(one(".nc-widget__value", widget).textContent).toBe("1,284/ min")
    expect(Array.from(widget.children).map((c) => c.className)).toEqual([
      "nc-widget__head",
      "live",
      "nc-widget__axis nc-num",
    ])
    expect(widget.querySelectorAll(".nc-widget__axis span")).toHaveLength(2)
  })

  test("a row widget draws the live part, the title and the value on one line", () => {
    const { root } = track(
      mount(() => (
        <Widget size="row" title="Context" value="124k / 200k">
          <WidgetRing value={62} label="Context used" />
        </Widget>
      )),
    )
    const widget = one("[data-part=widget]", root)
    expect(widget.getAttribute("data-size")).toBe("row")
    expect(widget.querySelector(".nc-widget__head")).toBeNull()
    expect(Array.from(widget.children).map((c) => c.getAttribute("data-part") ?? c.className)).toEqual([
      "widget-ring",
      "nc-widget__title",
      "nc-widget__value nc-num",
    ])
  })
})

describe("WidgetProgress ends", () => {
  test("names where the bar starts and ends on its line", () => {
    const { root } = track(
      mount(() => <WidgetProgress value={40} label="Sync" start="local" end="atlas-02" />),
    )
    const ends = Array.from(root.querySelectorAll(".nc-wprogress-route__end")).map((e) => e.textContent)
    expect(ends).toEqual(["local", "atlas-02"])
    expect(one("[data-part=widget-progress]", root).getAttribute("aria-valuenow")).toBe("40")
  })
})

describe("WidgetSparkline wave", () => {
  test("marks the wave variant", () => {
    const { root } = track(mount(() => <WidgetSparkline values={[1, 2]} label="Rate" variant="wave" />))
    expect(one("[data-part=widget-sparkline]", root).getAttribute("data-variant")).toBe("wave")
  })
})

describe("WidgetRing", () => {
  test("is a progress bar whose value is clamped, with the number inside at md", () => {
    const [value, setValue] = createSignal(62.4)
    const { root } = track(mount(() => <WidgetRing value={value()} label="Context used" size="md" />))
    const ring = one("[data-part=widget-ring]", root)
    expect(ring.getAttribute("role")).toBe("progressbar")
    expect(ring.getAttribute("aria-valuenow")).toBe("62")
    expect(one(".nc-wring__value", ring).textContent).toBe("62")
    setValue(140)
    flush()
    expect(ring.getAttribute("aria-valuenow")).toBe("100")
    const small = track(mount(() => <WidgetRing value={10} label="Quota" />))
    expect(small.root.querySelector(".nc-wring__value")).toBeNull()
  })
})

describe("WidgetSegments", () => {
  const segments = [
    { label: "System", value: 9, display: "9k" },
    { label: "Tools", value: 21, display: "21k" },
  ]
  test("draws a part per segment in steps, the rest as the free part, and names them all", () => {
    const { root } = track(
      mount(() => (
        <WidgetSegments segments={segments} total={100} free="Free" freeDisplay="70k" label="Context" />
      )),
    )
    const bar = one("[data-part=widget-segments]", root)
    expect(bar.getAttribute("aria-label")).toBe("Context: System 9k, Tools 21k, Free 70k")
    const parts = Array.from(bar.querySelectorAll<HTMLElement>(".nc-wsegments__part"))
    expect(parts.map((p) => p.style.getPropertyValue("--nc-part") || "free")).toEqual([
      "var(--accent-strong)",
      "var(--label-sky)",
      "free",
    ])
    expect(parts[2]!.hasAttribute("data-free")).toBe(true)
    expect(parts.map((p) => p.style.flexGrow)).toEqual(["9", "21", "70"])
    expect(bar.querySelectorAll(".nc-wsegments__label")).toHaveLength(3)
    expect(bar.querySelector(".nc-wsegments__legend")).toBeNull()
  })

  test("moves the names into a legend, takes a part's own hue, and has no free part when they fill the whole", () => {
    const parts = [segments[0]!, { ...segments[1]!, hue: "amber" as const }]
    const { root } = track(
      mount(() => <WidgetSegments labels="legend" segments={parts} total={30} label="Context" />),
    )
    const bar = one("[data-part=widget-segments]", root)
    expect(bar.querySelectorAll(".nc-wsegments__part")).toHaveLength(2)
    expect(bar.querySelectorAll(".nc-wsegments__label")).toHaveLength(0)
    expect(Array.from(bar.querySelectorAll(".nc-wsegments__key")).map((k) => k.textContent)).toEqual([
      "System 9k",
      "Tools 21k",
    ])
    const swatches = Array.from(bar.querySelectorAll<HTMLElement>(".nc-wsegments__key"))
    expect(swatches.map((k) => k.style.getPropertyValue("--nc-part"))).toEqual([
      "var(--accent-strong)",
      "var(--label-amber)",
    ])
  })
})

describe("WidgetSteps", () => {
  test("marks the stops before the current one done and the current one as the step", () => {
    const [current, setCurrent] = createSignal(1)
    const { root } = track(
      mount(() => <WidgetSteps steps={["Read", "Edit", "Test"]} current={current()} label="Plan" />),
    )
    const steps = one("[data-part=widget-steps]", root)
    expect(one("ol", steps).getAttribute("aria-label")).toBe("Plan")
    const states = () => Array.from(steps.querySelectorAll("li")).map((li) => li.getAttribute("data-state"))
    expect(states()).toEqual(["done", "current", null])
    expect(one("[aria-current=step]", steps).textContent).toBe("Edit")
    expect(steps.style.getPropertyValue("--nc-steps-fill")).toBe("0.5")
    setCurrent(9)
    flush()
    expect(states()).toEqual(["done", "done", "done"])
    expect(steps.querySelector("[aria-current]")).toBeNull()
  })
})

describe("WidgetMeters", () => {
  test("draws a row per meter with a clamped bar and its reading", () => {
    const { root } = track(
      mount(() => (
        <WidgetMeters
          label="atlas-02"
          items={[
            { label: "CPU", value: 64.2 },
            { label: "Memory", value: 120, display: "16 GB", hue: "info" },
          ]}
        />
      )),
    )
    const meters = one("[data-part=widget-meters]", root)
    expect(meters.getAttribute("aria-label")).toBe("atlas-02")
    const bars = Array.from(meters.querySelectorAll("[role=progressbar]"))
    expect(bars.map((b) => [b.getAttribute("aria-label"), b.getAttribute("aria-valuenow")])).toEqual([
      ["CPU", "64"],
      ["Memory", "100"],
    ])
    expect(Array.from(meters.querySelectorAll(".nc-wmeters__value")).map((v) => v.textContent)).toEqual([
      "64%",
      "16 GB",
    ])
    const rows = Array.from(meters.querySelectorAll<HTMLElement>(".nc-wmeters__row"))
    expect(rows.map((r) => r.style.getPropertyValue("--nc-part"))).toEqual([
      "var(--accent-strong)",
      "var(--info)",
    ])
  })
})

describe("Widget sizes", () => {
  test("marks its size, md by default, and puts the title above a figure at lg", () => {
    const { root } = track(mount(() => <Widget title="Context" figure="62" unit="%" size="lg" />))
    const widget = one("[data-part=widget]", root)
    expect(widget.getAttribute("data-size")).toBe("lg")
    expect(one(".nc-widget__eyebrow", widget).textContent).toBe("Context")
    expect(one(".nc-widget__figure", widget).textContent).toBe("62%")
    const plain = track(mount(() => <Widget title="Upload" />))
    expect(one("[data-part=widget]", plain.root).getAttribute("data-size")).toBe("md")
    expect(plain.root.querySelector(".nc-widget__eyebrow")).toBeNull()
  })

  test("draws its foot after the axis", () => {
    const { root } = track(
      mount(() => (
        <Widget title="Rate" axis={["-5m", "Now"]} foot={<span class="foot">stats</span>}>
          <span class="live">bars</span>
        </Widget>
      )),
    )
    expect(Array.from(one("[data-part=widget]", root).children).map((c) => c.className)).toEqual([
      "nc-widget__head",
      "live",
      "nc-widget__axis nc-num",
      "foot",
    ])
  })
})

describe("WidgetSegments label modes", () => {
  const segments = [
    { label: "System", value: 10, display: "10k" },
    { label: "Chat", value: 30, display: "30k" },
  ]
  test("a list gives each part a row with its value and share; none draws the bar alone", () => {
    const { root } = track(
      mount(() => (
        <WidgetSegments labels="list" segments={segments} total={100} free="Free" label="Context" />
      )),
    )
    const rows = Array.from(root.querySelectorAll(".nc-wsegments__item")).map((r) =>
      Array.from(r.querySelectorAll("span:not(.nc-wsegments__swatch)")).map((c) => c.textContent),
    )
    expect(rows).toEqual([
      ["System", "10k", "10%"],
      ["Chat", "30k", "30%"],
      ["Free", "60", "60%"],
    ])
    const bare = track(
      mount(() => <WidgetSegments labels="none" segments={segments} total={100} label="Context" />),
    )
    expect(
      bare.root.querySelectorAll(".nc-wsegments__label, .nc-wsegments__key, .nc-wsegments__item"),
    ).toHaveLength(0)
    expect(one("[data-part=widget-segments]", bare.root).getAttribute("aria-label")).toBe(
      "Context: System 10k, Chat 30k",
    )
  })
})

describe("WidgetStats", () => {
  test("lists each reading as a name over its value", () => {
    const { root } = track(
      mount(() => (
        <WidgetStats
          items={[
            { label: "p50", value: "48" },
            { label: "Peak", value: "82" },
          ]}
        />
      )),
    )
    const stats = one("[data-part=widget-stats]", root)
    expect(Array.from(stats.querySelectorAll("dt")).map((d) => d.textContent)).toEqual(["p50", "Peak"])
    expect(Array.from(stats.querySelectorAll("dd")).map((d) => d.textContent)).toEqual(["48", "82"])
  })
})

describe("compactCount", () => {
  test("shortens counts of tokens", () => {
    expect([999, 1234, 9_950, 124_000, 1_500_000].map(compactCount)).toEqual([
      "999",
      "1.2k",
      "10k",
      "124k",
      "1.5M",
    ])
  })
})

describe("ContextWidget", () => {
  const parts = [
    { label: "System", value: 9_000 },
    { label: "Chat", value: 115_000 },
  ]
  test("is a ring and the share at row, one bar at sm, a legend at md, and the full account at lg", () => {
    const [size, setSize] = createSignal<"row" | "sm" | "md" | "lg">("row")
    const { root } = track(
      mount(() => <ContextWidget size={size()} used={124_000} total={200_000} parts={parts} />),
    )
    const widget = () => one("[data-part=widget]", root)
    expect(widget().getAttribute("data-size")).toBe("row")
    expect(one("[data-part=widget-ring]", root).getAttribute("aria-valuenow")).toBe("62")
    expect(one(".nc-widget__value", root).textContent).toBe("62%")
    setSize("sm")
    flush()
    expect(widget().getAttribute("data-size")).toBe("sm")
    expect(one("[data-part=widget-segments]", root).getAttribute("data-labels")).toBe("none")
    setSize("md")
    flush()
    expect(widget().getAttribute("data-size")).toBe("md")
    expect(one(".nc-widget__value", root).textContent).toBe("124k / 200k")
    expect(one("[data-part=widget-segments]", root).getAttribute("data-labels")).toBe("legend")
    expect(Array.from(root.querySelectorAll(".nc-wsegments__key")).map((n) => n.textContent)).toEqual([
      "System 9000",
      "Chat 115000",
      "Free 76k",
    ])
    setSize("lg")
    flush()
    expect(widget().getAttribute("data-size")).toBe("lg")
    expect(one(".nc-widget__figure", root).textContent).toBe("62%")
    expect(one(".nc-widget__value", root).textContent).toBe("124k / 200k")
    expect(Array.from(root.querySelectorAll(".nc-wsegments__name")).map((n) => n.textContent)).toEqual([
      "System",
      "Chat",
      "Free",
    ])
  })

  test("shows a plain bar without parts", () => {
    const { root } = track(mount(() => <ContextWidget used={50} total={200} />))
    expect(one("[data-part=widget]", root).getAttribute("data-size")).toBe("md")
    expect(one("[data-part=widget-progress]", root).getAttribute("aria-valuenow")).toBe("25")
  })
})

describe("RateWidget", () => {
  const values = Array.from({ length: 30 }, (_, i) => i + 1)
  const stats = [
    { label: "p50", value: "41" },
    { label: "Peak", value: "82" },
  ]
  test("is one line at row, the rate over the wave at md, and adds the readings at lg", () => {
    const [size, setSize] = createSignal<"row" | "md" | "lg" | undefined>("row")
    const { root } = track(
      mount(() => (
        <RateWidget size={size()} title="Output" value="48" unit="tok/s" values={values} stats={stats} />
      )),
    )
    expect(one("[data-part=widget]", root).getAttribute("aria-label")).toBe("Output")
    expect(root.querySelectorAll(".nc-wspark__bar")).toHaveLength(12)
    expect(one(".nc-widget__value", root).textContent).toBe("48tok/s")
    setSize(undefined)
    flush()
    expect(one("[data-part=widget]", root).getAttribute("data-size")).toBe("md")
    expect(root.querySelectorAll(".nc-wspark__bar")).toHaveLength(30)
    expect(one(".nc-widget__value", root).textContent).toBe("p50 41")
    expect(root.querySelector("[data-part=widget-stats]")).toBeNull()
    setSize("lg")
    flush()
    expect(one(".nc-widget__eyebrow", root).textContent).toBe("Output")
    expect(root.querySelectorAll("[data-part=widget-stats] dt")).toHaveLength(2)
  })
})

describe("SidebarHeader", () => {
  test("holds back, the place, the command palette and the toggle in one row, and search under it", () => {
    const calls: string[] = []
    const { root } = track(
      mount(() => (
        <SidebarHeader
          title="Atlas web"
          back={{ to: "Projects", onClick: () => calls.push("back") }}
          onCommand={() => calls.push("command")}
          onHideSidebar={() => calls.push("hide")}
        >
          <input aria-label="Search" />
        </SidebarHeader>
      )),
    )
    const header = one("[data-part=sidebar-header]", root)
    const row = one(".nc-sidebar-header__row", header)
    const part = (c: Element) =>
      (c.matches("[data-part^=sidebar]") ? c : c.querySelector("[data-part^=sidebar]"))?.getAttribute(
        "data-part",
      ) ?? c.textContent
    expect(Array.from(row.children).map(part)).toEqual([
      "sidebar-back",
      "Atlas web",
      "sidebar-command",
      "sidebar-toggle",
    ])
    expect(one("[data-part=sidebar-back]", header).getAttribute("aria-label")).toBe("Back to Projects")
    click(one("[data-part=sidebar-back]", header))
    click(one("[data-part=sidebar-command]", header))
    click(one("[data-part=sidebar-toggle]", header))
    expect(calls).toEqual(["back", "command", "hide"])
    expect(header.querySelector("input[aria-label=Search]")).not.toBeNull()
  })

  test("AppShell hides the sidebar and puts the header across the window when asked", () => {
    const [hidden, setHidden] = createSignal(false)
    const { root } = track(
      mount(() => (
        <AppShell headerPlacement="across" sidebarHidden={hidden()} sidebar={<SidebarHeader title="Acme" />}>
          <ViewHeader variant="shell" crumbs={[{ label: "Projects" }]} />
        </AppShell>
      )),
    )
    const shell = one("[data-part=app-shell]", root)
    expect(shell.getAttribute("data-header")).toBe("across")
    expect(shell.hasAttribute("data-sidebar")).toBe(false)
    setHidden(true)
    flush()
    expect(shell.getAttribute("data-sidebar")).toBe("hidden")
  })
})
