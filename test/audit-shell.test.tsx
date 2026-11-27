// Shell and layout exports no other test renders directly: LensCustomise, SwitcherList and EntryLead, and the
// contexts ViewLayoutHost, ViewLayoutState, ViewHeaderSlot and ScreenContext.
import { afterEach, describe, expect, test } from "bun:test"
import { createSignal, flush } from "solid-js"
import {
  EntryLead,
  type Lens,
  LensCustomise,
  type LensPrefs,
  ScreenContext,
  ScreenOptions,
  type ScreenPart,
  ScreenRefresh,
  SwitcherList,
  useScreen,
  useViewLayout,
  ViewHeader,
  ViewHeaderSlot,
  ViewLayout,
  type ViewLayoutHandle,
  ViewLayoutHost,
} from "../src"
import { all, click, mount, one, press, tick } from "./dom"

let cleanup: Array<() => void> = []
const show = (view: Parameters<typeof mount>[0]) => {
  const m = mount(view)
  cleanup.push(m.dispose)
  return m
}
afterEach(() => {
  for (const c of cleanup) c()
  cleanup = []
  document.body.innerHTML = ""
  try {
    localStorage.clear()
  } catch {}
})

const LENSES: Lens[] = [
  { id: "build", label: "Build", icon: "wrench", hue: "sky" },
  { id: "operate", label: "Operate", icon: "server", hue: "amber", purpose: "Run it", source: "Crow" },
  { id: "explore", label: "Explore", icon: "search", hue: "mint" },
]

describe("LensCustomise", () => {
  test("lists the lenses in order, hides one, moves one with Alt and an arrow, resets and is done", async () => {
    const [prefs, setPrefs] = createSignal<LensPrefs>({ order: [], hidden: [] })
    let done = 0
    const { root } = show(() => (
      <LensCustomise lenses={LENSES} prefs={prefs()} onPrefsChange={setPrefs} onDone={() => done++} />
    ))
    const panel = one("[data-part=lens-customise]", root)
    const rows = () => all<HTMLElement>("[data-lens]").map((r) => r.dataset.lens)
    expect(rows()).toEqual(["build", "operate", "explore"])
    expect(one("[data-lens=operate] .nc-lens-customise__purpose", panel).textContent).toBe("Run it · Crow")
    expect(one("[data-lens=build] .nc-lens-customise__key", panel).textContent).toBe("⌘1")

    click(one("[data-lens=operate] [role=switch]", panel))
    expect(prefs().hidden).toEqual(["operate"])
    expect(one("[data-lens=explore] .nc-lens-customise__key", panel).textContent).toBe("⌘2")

    press(one("[data-lens=explore]", panel), "ArrowUp", { altKey: true })
    await tick()
    expect(rows()).toEqual(["build", "explore", "operate"])

    click(
      Array.from(panel.querySelectorAll<HTMLButtonElement>("button")).find((b) => b.textContent === "Reset")!,
    )
    expect(prefs()).toEqual({ order: [], hidden: [] })
    click(
      Array.from(panel.querySelectorAll<HTMLButtonElement>("button")).find((b) => b.textContent === "Done")!,
    )
    expect(done).toBe(1)
  })

  test("one lens always stays shown", () => {
    const [prefs, setPrefs] = createSignal<LensPrefs>({ order: [], hidden: ["build", "operate"] })
    const { root } = show(() => <LensCustomise lenses={LENSES} prefs={prefs()} onPrefsChange={setPrefs} />)
    click(one("[data-lens=explore] [role=switch]", root))
    expect(prefs().hidden).toEqual(["build", "operate"])
  })
})

describe("SwitcherList", () => {
  const sections = [
    {
      title: "Projects",
      entries: [
        { id: "web", label: "Web", current: true, mark: { name: "Web", hue: "sky" as const } },
        { id: "api", label: "API", hint: "Backend", count: 3, shortcut: "G A" },
      ],
    },
  ]
  test("is a filter over its sections, standing alone; a click picks", async () => {
    const picked: string[] = []
    const { root } = show(() => (
      <SwitcherList noun="project" sections={sections} wide onPick={(e) => picked.push(e.id)} />
    ))
    const list = one("[data-part=switcher-list]", root)
    expect(list.hasAttribute("data-wide")).toBe(true)
    expect(one<HTMLInputElement>("input", list).getAttribute("aria-label")).toBe("Switch project")
    const items = all('[data-part=switcher-list] [data-slot="command-item"]')
    expect(items[0]!.hasAttribute("data-current")).toBe(true)
    expect(items[0]!.querySelector("[data-part=mark]")).toBeTruthy()
    expect(items[1]!.querySelectorAll("[data-part=kbd], kbd").length).toBeGreaterThan(0)
    expect(one(".nc-switcher__count", items[1]!).textContent).toBe("3")
    click(items[1]!)
    await tick()
    expect(picked).toEqual(["api"])
  })
})

describe("EntryLead", () => {
  test("draws the leading content, else the mark, else the icon", () => {
    const [lead, setLead] = createSignal<"leading" | "mark" | "icon">("leading")
    const { root } = show(() => (
      <span class="lead">
        <EntryLead
          leading={lead() === "leading" ? <i class="glyph" /> : undefined}
          mark={lead() !== "icon" ? { name: "Acme" } : undefined}
          icon="server"
        />
      </span>
    ))
    const host = one(".lead", root)
    expect(host.querySelector(".glyph")).toBeTruthy()
    setLead("mark")
    flush()
    expect(one("[data-part=mark]", host).getAttribute("aria-hidden")).toBe("true")
    setLead("icon")
    flush()
    expect(one("[data-part=icon]", host).getAttribute("data-icon")).toBe("server")
  })
})

describe("ViewLayoutHost", () => {
  test("hears a layout mount, and that it went", () => {
    const events: string[] = []
    let handle: ViewLayoutHandle | undefined
    const { dispose } = mount(() => (
      <ViewLayoutHost
        value={{
          mount: (h) => {
            handle = h
            events.push(`mount:${h.id}`)
            return () => events.push(`unmount:${h.id}`)
          },
          report: (h, shortfall) => events.push(`report:${h.id}:${shortfall}`),
        }}
      >
        <ViewLayout id="audit.host" sidebar={<nav>Side</nav>}>
          <p>Main</p>
        </ViewLayout>
      </ViewLayoutHost>
    ))
    expect(events).toEqual(["mount:audit.host"])
    expect(handle?.element.getAttribute("data-part")).toBe("view-layout")
    dispose()
    expect(events).toEqual(["mount:audit.host", "report:audit.host:null", "unmount:audit.host"])
  })
})

describe("ViewLayoutState", () => {
  test("tells the parts inside a layout about its sidebar, and toggles it", () => {
    let layout: ReturnType<typeof useViewLayout>
    const Probe = () => {
      layout = useViewLayout()
      return <span class="probe">{layout?.sidebarOpen() ? "open" : "closed"}</span>
    }
    const { root } = show(() => (
      <ViewLayout id="audit.state" sidebar={<nav>Side</nav>}>
        <Probe />
      </ViewLayout>
    ))
    expect(layout!.hasSidebar()).toBe(true)
    const view = one("[data-part=view-layout]", root)
    expect(view.getAttribute("data-sidebar")).toBe("open")
    layout!.toggleSidebar()
    flush()
    expect(view.getAttribute("data-sidebar")).toBe("collapsed")
    expect(root.querySelector("[data-part=view-sidebar]")).toBeNull()
    let outside: ReturnType<typeof useViewLayout>
    const Outside = () => {
      outside = useViewLayout()
      return null
    }
    show(() => <Outside />)
    expect(outside).toBeUndefined()
  })
})

describe("ViewHeaderSlot", () => {
  test("an actions-only header draws in the slot; a titled one stays in place", () => {
    const slot = document.createElement("div")
    document.body.append(slot)
    let ran = 0
    const [title, setTitle] = createSignal<string | undefined>(undefined)
    const { root } = show(() => (
      <ViewHeaderSlot value={{ mount: () => slot }}>
        <ViewHeader
          title={title()}
          noPin
          actions={[{ id: "add", label: "Add", icon: "plus", onClick: () => ran++ }]}
        />
      </ViewHeaderSlot>
    ))
    expect(root.querySelector("[data-part=view-header]")).toBeNull()
    const header = one("[data-part=view-header]", slot)
    expect(header.classList.contains("nc-view-header--slot")).toBe(true)
    click(one("button[aria-label=Add]", header))
    expect(ran).toBe(1)
    setTitle("Hosts")
    flush()
    expect(slot.querySelector("[data-part=view-header]")).toBeNull()
    expect(one("[data-part=view-header]", root).textContent).toContain("Hosts")
  })
})

describe("ScreenContext", () => {
  test("parts inside a screen give it their options; useScreen reads it", () => {
    const parts: Array<() => ScreenPart> = []
    let removed = 0
    let seen: ReturnType<typeof useScreen>
    const Probe = () => {
      seen = useScreen()
      return null
    }
    const [on, setOn] = createSignal(true)
    const refresh = () => {}
    show(() => (
      <ScreenContext
        value={{
          level: () => "main",
          provide: (p) => {
            parts.push(p)
            return () => removed++
          },
        }}
      >
        <Probe />
        {on() ? <ScreenOptions mode="full" title="Terminal" /> : null}
        <ScreenRefresh onRefresh={refresh} />
      </ScreenContext>
    ))
    expect(seen!.level()).toBe("main")
    expect(parts.map((p) => p())).toEqual([
      { mode: "full", largeTitle: undefined, title: "Terminal" },
      { onRefresh: refresh },
    ])
    setOn(false)
    flush()
    expect(removed).toBe(1)
    let outside: ReturnType<typeof useScreen> = { level: () => "index", provide: () => () => {} }
    const Outside = () => {
      outside = useScreen()
      return null
    }
    show(() => <Outside />)
    expect(outside).toBeUndefined()
  })
})
