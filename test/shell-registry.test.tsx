import { afterEach, describe, expect, test } from "bun:test"
import { createRoot, createSignal, flush, useContext } from "solid-js"
import {
  createShell,
  memoryRouter,
  memoryStorage,
  PhoneOverride,
  Shell,
  type ShellLens,
  type ShellOptions,
  type ShellRegistry,
  type ShellScope,
  ShellViewHeader,
  ViewLayoutHost,
  type ViewLayoutHostValue,
} from "../src"
import { all, click, mount, one, tick } from "./dom"

let cleanup: Array<() => void> = []
afterEach(() => {
  for (const c of cleanup) c()
  cleanup = []
  document.body.innerHTML = ""
})

const ISSUES = [
  { id: "WEB-142", title: "Flaky deploy test", state: "active" },
  { id: "WEB-141", title: "Empty state", state: "active" },
  { id: "WEB-139", title: "Sign-in loop", state: "active" },
  { id: "WEB-120", title: "Old idea", state: "backlog" },
]
const issuesIn = (view?: string) => ISSUES.filter((i) => i.state === (view ?? "active"))

const View = (props: { shell: ShellRegistry }) => (
  <div data-test="view">
    <ShellViewHeader />
    <span data-test="where">{props.shell.address()}</span>
  </div>
)

const agent: ShellScope<{ id: string; name: string }> = {
  id: "agent",
  label: (a) => a.name,
  noun: "agent",
  items: () => [
    { id: "review", name: "Review agent" },
    { id: "triage", name: "Triage agent" },
  ],
  places: [
    { id: "runs", label: "Runs", icon: "play", view: View },
    { id: "prompt", label: "Prompt", icon: "file", view: View },
  ],
}

const projectLenses: ShellLens[] = [
  {
    id: "explore",
    label: "Explore",
    icon: "sparkle",
    hue: "orchid",
    places: [
      { id: "map", label: "Map", icon: "grid", view: View },
      { id: "notes", label: "Notes", icon: "file", view: View },
    ],
  },
  {
    id: "product",
    label: "Product",
    icon: "book-open",
    hue: "amber",
    places: [{ id: "roadmap", label: "Roadmap", icon: "calendar", view: View }],
  },
  {
    id: "build",
    label: "Build",
    icon: "code",
    hue: "mint",
    open: { right: "details" },
    places: [
      {
        id: "issues",
        label: "Issues",
        icon: "list",
        view: View,
        noun: "issue",
        views: [
          { id: "active", label: "Active" },
          { id: "backlog", label: "Backlog" },
        ],
        count: () => issuesIn().length,
        records: (_p, view) => issuesIn(view).map((i) => ({ id: i.id, label: i.id, hint: i.title })),
        inspect: (id) => <p data-test="inspect">{id}</p>,
        // An issue's page shows its terminal output itself; the list does not.
        covers: (record) => (record ? ["terminal"] : []),
      },
      { id: "agents", label: "Agents", icon: "agent", view: View, enters: agent },
    ],
  },
]

const project: ShellScope<{ id: string; name: string }> = {
  id: "project",
  label: (p) => p.name,
  noun: "project",
  mark: (p) => ({ name: p.name, hue: "sky" }),
  items: () => [
    { id: "atlas", name: "Atlas web" },
    { id: "borealis", name: "Borealis" },
  ],
  lenses: projectLenses,
}

const host: ShellScope<{ id: string; name: string }> = {
  id: "host",
  label: (h) => h.name,
  noun: "host",
  items: () => [{ id: "build-01", name: "build-01" }],
  lenses: [
    {
      id: "operate",
      label: "Operate",
      icon: "server",
      hue: "sky",
      places: [
        { id: "sessions", label: "Sessions", icon: "terminal", view: View, covers: ["terminal"] },
        { id: "logs", label: "Logs", icon: "logs", view: View },
      ],
    },
  ],
}

const options = (path: string, extra: Partial<ShellOptions> = {}): ShellOptions => ({
  router: memoryRouter(path),
  storage: memoryStorage(),
  workspace: { id: "acme", name: "Acme" },
  scopes: [
    { id: "projects", label: "Projects", icon: "folder", view: View, child: project },
    { id: "hosts", label: "Hosts", icon: "server", view: View, child: host },
  ],
  panels: [
    {
      id: "details",
      label: "Details",
      icon: "panel-right",
      at: "right",
      key: "d",
      render: (p) => <div data-test="details">{p.shell.inspect()}</div>,
    },
    {
      id: "terminal",
      label: "Terminal",
      icon: "terminal",
      at: "bottom",
      key: "t",
      render: () => <pre data-test="terminal">$</pre>,
    },
  ],
  ...extra,
})

/** A registry outside the DOM, disposed after the test. */
function make(path: string, extra?: Partial<ShellOptions>): ShellRegistry {
  return createRoot((dispose) => {
    const s = createShell(options(path, extra))
    cleanup.push(() => {
      s.dispose()
      dispose()
    })
    return s
  })
}

const key = (k: string, init: KeyboardEventInit = {}) =>
  new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...init })

describe("createShell", () => {
  test("derives the path, the lens box and the sidebar from the registration", () => {
    const s = make("/projects/atlas/build/issues")
    flush()
    expect(s.path().map((x) => x.label)).toEqual(["Acme", "Projects", "Atlas web"])
    // The workspace and the module are plain text; the scope the window shows keeps its mark.
    const [ws, mod] = s.path()
    expect([ws!.mark, ws!.icon, mod!.mark, mod!.icon, mod!.switcher]).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ])
    const last = s.path().at(-1)!
    expect(last.mark?.name).toBe("Atlas web")
    expect(last.switcher?.noun).toBe("project")
    expect(last.switcher?.sections[0]?.entries.map((e) => [e.label, !!e.current])).toEqual([
      ["Atlas web", true],
      ["Borealis", false],
    ])
    expect(s.lensBox().lenses.map((l) => l.id)).toEqual(["explore", "product", "build"])
    expect(s.lensBox().lens).toBe("build")
    const side = s.sidebar()
    expect(side.up.label).toBe("Projects")
    const items = side.groups[0]!.items
    expect(items.map((i) => i.label)).toEqual(["Issues", "Agents"])
    expect(items[0]!.current).toBe(true)
    expect(items[0]!.count).toBe(3)
    expect(items[0]!.items?.map((i) => i.label)).toEqual(["Backlog"])
    expect(s.header().title).toBe("Issues")
    expect(s.title()).toBe("Issues · Build · Atlas web · Projects · Acme")
  })

  test("the workspace's sidebar lists the modules and their items", () => {
    const s = make("/projects")
    flush()
    const groups = s.sidebar().groups
    expect(groups[0]!.items.map((i) => i.label)).toEqual(["Projects", "Hosts"])
    expect(groups[1]!.items.map((i) => i.label)).toEqual(["Atlas web", "Borealis"])
    // Nowhere up: the button stays, disabled.
    expect(s.sidebar().up).toEqual({ label: "Up" })
    expect(s.lensBox().lenses).toEqual([])
  })

  test("from a record, ↑ goes to its list", () => {
    const s = make("/projects/atlas/build/issues/WEB-142")
    flush()
    expect(s.sidebar().up.label).toBe("Issues")
    s.sidebar().up.onClick!()
    flush()
    expect(s.loc().record).toBeUndefined()
    expect(s.sidebar().up.label).toBe("Projects")
  })

  test("every move is a history entry with its address in full", async () => {
    const s = make("/projects")
    flush()
    s.go("/projects/atlas")
    flush()
    s.toPlace(undefined, "issues", "backlog")
    flush()
    s.toPlace(undefined, "issues", undefined, "WEB-141")
    flush()
    expect(s.history.stops().map((x) => x.path)).toEqual([
      "/projects",
      "/projects/atlas/explore/map",
      "/projects/atlas/build/issues/backlog",
      "/projects/atlas/build/issues/WEB-141",
    ])
    expect(s.history.here()?.label).toBe("WEB-141")
    s.history.back()
    await tick()
    expect(s.loc().view?.id).toBe("backlog")
  })

  test("a record has a trail with a switcher and a stepper; J and K step", () => {
    const s = make("/projects/atlas/build/issues/WEB-142")
    flush()
    const h = s.header()
    expect(h.trail?.map((c) => c.label)).toEqual(["Issues", "WEB-142"])
    expect(h.trail?.[1]?.switcher?.sections[0]?.entries.map((e) => e.id)).toEqual([
      "WEB-142",
      "WEB-141",
      "WEB-139",
    ])
    expect(h.stepper).toMatchObject({ index: 0, total: 3, noun: "issue" })
    expect(s.handleKey(key("j"))).toBe(true)
    flush()
    expect(s.loc().record).toBe("WEB-141")
    s.handleKey(key("j"))
    flush()
    expect(s.loc().record).toBe("WEB-139")
    expect(s.handleKey(key("j"))).toBe(false)
    s.handleKey(key("k"))
    flush()
    expect(s.loc().record).toBe("WEB-141")
  })

  test("switching lenses back and forth never leaves the scope; back goes to where the run began", async () => {
    const s = make("/projects/atlas/build/issues/WEB-142")
    flush()
    s.go("/projects/atlas/build/agents")
    flush()
    s.wear("product")
    flush()
    await tick(3)
    s.wear("explore")
    flush()
    await tick(3)
    // Back on the lens the run began on: the run is undone.
    s.wear("build")
    flush()
    await tick(3)
    expect(s.address()).toBe("/projects/atlas/build/agents")
    // The run left one stop ahead (forward goes to it); behind is where the person was before.
    expect(s.history.index()).toBe(1)
    expect(s.history.behind().map((x) => x.path)).toEqual(["/projects/atlas/build/issues/WEB-142"])
    // Fast: four switches before any lands.
    s.wear("product")
    s.wear("build")
    s.wear("explore")
    s.wear("product")
    flush()
    await tick(6)
    flush()
    expect(s.loc().frame.key).toBe("projects:>project:atlas")
    expect(s.loc().lens?.id).toBe("product")
    s.history.back()
    await tick(3)
    expect(s.address()).toBe("/projects/atlas/build/agents")
  })

  test("each lens remembers its last place in each scope", async () => {
    const s = make("/projects/atlas/build/issues/WEB-139")
    flush()
    s.wear("explore")
    flush()
    await tick(3)
    s.toPlace(undefined, "notes")
    flush()
    s.wear("build")
    flush()
    await tick(3)
    expect(s.address()).toBe("/projects/atlas/build/issues/WEB-139")
    s.wear("explore")
    flush()
    await tick(3)
    expect(s.address()).toBe("/projects/atlas/explore/notes")
    // Another scope and back: the scope opens through the lens worn last, where it was.
    s.go("/hosts/build-01")
    flush()
    s.go("/projects/atlas")
    flush()
    expect(s.address()).toBe("/projects/atlas/explore/notes")
    // Borealis has no memory yet: its first lens.
    s.go("/projects/borealis")
    flush()
    expect(s.address()).toBe("/projects/borealis/explore/map")
  })

  test("a place that enters a scope nests it; up returns to the place it was entered from", () => {
    const s = make("/projects/atlas/build/agents/review")
    flush()
    expect(s.path().map((x) => x.label)).toEqual(["Acme", "Projects", "Atlas web", "Review agent"])
    expect(s.loc().place?.id).toBe("runs")
    expect(s.sidebar().up.label).toBe("Atlas web")
    s.sidebar().up.onClick!()
    flush()
    expect(s.address()).toBe("/projects/atlas/build/agents")
  })

  test("⌘1…⌘9 put on the shown lenses in the person's order", async () => {
    const s = make("/projects/atlas/build/issues")
    flush()
    s.lensBox().setPrefs({ order: ["build", "explore", "product"], hidden: ["explore"] })
    flush()
    expect(s.handleKey(key("2", { metaKey: true }))).toBe(true)
    flush()
    await tick(3)
    expect(s.loc().lens?.id).toBe("product")
    expect(s.handleKey(key("3", { metaKey: true }))).toBe(false)
  })

  test("Esc closes the topmost: the palette, a panel's drill, the record, then the filter", () => {
    const s = make("/projects/atlas/build/issues/WEB-142")
    flush()
    s.setFilter("iss")
    s.drill("details", "WEB-139")
    flush()
    expect(s.panelTrail("details").map((c) => c.label)).toEqual(["WEB-142", "WEB-139"])
    s.setPaletteOpen(true)
    flush()
    const esc = () => {
      const handled = s.handleKey(key("Escape"))
      flush()
      return handled
    }
    expect(esc()).toBe(true)
    expect(s.paletteOpen()).toBe(false)
    expect(s.loc().aside).toBeDefined()
    expect(esc()).toBe(true)
    expect(s.loc().aside).toBeUndefined()
    expect(s.loc().record).toBe("WEB-142")
    expect(esc()).toBe(true)
    expect(s.loc().record).toBeUndefined()
    expect(s.filter()).toBe("iss")
    expect(esc()).toBe(true)
    expect(s.filter()).toBe("")
    expect(esc()).toBe(false)
  })

  test("what a view pushes on the Esc stack closes before the rest", () => {
    const s = make("/projects/atlas/build/issues/WEB-142")
    flush()
    let closed = 0
    const remove = s.pushEsc(() => {
      closed++
      remove()
    })
    s.handleKey(key("Escape"))
    flush()
    expect(closed).toBe(1)
    expect(s.loc().record).toBe("WEB-142")
  })

  test("panels: ⌥ letters toggle, ⌘J the bottom one, and `covers` hides one", () => {
    const s = make("/projects/atlas/build/issues")
    flush()
    expect(s.panels().right?.id).toBe("details")
    s.handleKey(key("∂", { altKey: true, code: "KeyD" }))
    flush()
    expect(s.panels().right).toBeUndefined()
    s.handleKey(key("j", { metaKey: true }))
    flush()
    expect(s.panels().bottom?.id).toBe("terminal")
    s.go("/hosts/build-01/operate/sessions")
    flush()
    s.showPanel("terminal")
    flush()
    expect(s.panels().covers).toEqual(["terminal"])
    expect(s.handleKey(key("†", { altKey: true, code: "KeyT" }))).toBe(false)
    expect(
      s
        .actions()
        .find((x) => x.title === "Panels")
        ?.commands.map((c) => c.id),
    ).toEqual(["panel:details"])
  })

  test("the palette searches the scope through the lens, then the workspace", () => {
    const s = make("/projects/atlas/build/issues")
    flush()
    const chips = [
      { id: "projects:>project:atlas", label: "Atlas web" },
      { id: "lens:build", label: "Build" },
    ]
    const empty = s.search({ text: "", chips })
    expect(empty[0]!.title).toBe("Atlas web · Build")
    expect(empty[0]!.commands.map((c) => c.label)).toEqual(["Issues", "Issues: Backlog", "Agents"])
    const typed = s.search({ text: "flaky", chips: chips.slice(0, 1) })
    expect(typed[0]!.commands.some((c) => c.label === "WEB-142")).toBe(true)
    expect(typed.some((x) => x.title === "Lenses")).toBe(true)
    const wide = s.search({ text: "", chips: [] })
    expect(wide.at(-1)!.title).toBe("Acme")
    expect(wide.at(-1)!.commands.map((c) => c.label)).toContain("Borealis")
  })
})

describe("Shell", () => {
  test("renders the wired app shell and navigates from the sidebar", async () => {
    const m = mount(() => {
      const s = createShell(options("/projects/atlas/build/issues"))
      return <Shell shell={s} />
    })
    cleanup.push(m.dispose)
    await tick()
    expect(one("[data-part=shell]")).toBeTruthy()
    expect(one("[data-part=app-shell]")).toBeTruthy()
    expect(one("[data-part=scope-path] [data-last]").textContent).toContain("Atlas web")
    expect(one("[data-part=scope-box]").getAttribute("data-mode")).toBe("lenses")
    expect(one("[data-test=details]")).toBeTruthy()
    const view = one("[data-test=view]")
    const agents = all("[data-part=nav-item]").find((b) => b.textContent?.includes("Agents"))!
    click(agents)
    await tick()
    expect(one("[data-test=where]").textContent).toBe("/projects/atlas/build/agents")
    expect(view.isConnected).toBe(false)
    // A record keeps the place's view mounted and swaps its data.
    click(all("[data-part=nav-item]").find((b) => b.textContent?.includes("Issues"))!)
    await tick()
    const issues = one("[data-test=view]")
    const s = issues.querySelector("[data-test=where]")!
    expect(s.textContent).toBe("/projects/atlas/build/issues")
  })

  test("a `covers` function gets the record: the panel steps aside on the record's page only", () => {
    const s = make("/projects/atlas/build/issues")
    flush()
    expect(s.panels().covers).toEqual([])
    s.go("/projects/atlas/build/issues/WEB-142")
    flush()
    expect(s.panels().covers).toEqual(["terminal"])
    expect(s.handleKey(key("j", { metaKey: true }))).toBe(false)
  })

  test("`covers` hides the panel and its rail button while the view shows it", async () => {
    let shell!: ShellRegistry
    const m = mount(() => {
      shell = createShell(options("/hosts/build-01/operate/logs"))
      return <Shell shell={shell} />
    })
    cleanup.push(m.dispose)
    await tick()
    shell.showPanel("terminal")
    flush()
    expect(one("[data-part=shell-panel][data-panel=terminal]").hidden).toBe(false)
    expect(all("[data-part=panel-rail] [data-panel=terminal]").length).toBe(1)
    shell.toPlace(undefined, "sessions")
    flush()
    await tick()
    expect(one("[data-part=shell-panel][data-panel=terminal]").hidden).toBe(true)
    expect(all("[data-part=panel-rail] [data-panel=terminal]").length).toBe(0)
    shell.toPlace(undefined, "logs")
    flush()
    await tick()
    expect(one("[data-part=shell-panel][data-panel=terminal]").hidden).toBe(false)
  })

  test("the record view's header has the trail and the stepper", async () => {
    const m = mount(() => <Shell shell={createShell(options("/projects/atlas/build/issues/WEB-141"))} />)
    cleanup.push(m.dispose)
    await tick()
    expect(one("[data-part=view-step-count]").textContent).toBe("2 / 3")
    expect(all("[data-part=trail] li").length).toBe(2)
    click(one("[data-part=view-step-next]"))
    await tick()
    expect(one("[data-test=where]").textContent).toBe("/projects/atlas/build/issues/WEB-139")
  })

  test("a key goes to the shell it was pressed in, and from the page to the one used last", async () => {
    let a!: ShellRegistry
    let b!: ShellRegistry
    const m = mount(() => {
      a = createShell(options("/projects/atlas/build/issues", { id: "a" }))
      b = createShell(options("/projects/atlas/build/issues", { id: "b" }))
      return (
        <>
          <div data-test="a">
            <Shell shell={a} main />
          </div>
          <div data-test="b">
            <Shell shell={b} />
          </div>
        </>
      )
    })
    cleanup.push(m.dispose)
    await tick()
    // From the page with neither used: the main one.
    document.body.dispatchEvent(key("1", { metaKey: true }))
    flush()
    await tick(3)
    expect(a.loc().lens?.id).toBe("explore")
    expect(b.loc().lens?.id).toBe("build")
    // Pressed inside B: B alone.
    const inB = one("[data-test=b] [data-part=shell-view]")
    inB.dispatchEvent(key("2", { metaKey: true }))
    flush()
    await tick(3)
    expect(b.loc().lens?.id).toBe("product")
    expect(a.loc().lens?.id).toBe("explore")
    // B was used last: a key from the page goes to it.
    inB.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))
    document.body.dispatchEvent(key("3", { metaKey: true }))
    flush()
    await tick(3)
    expect(b.loc().lens?.id).toBe("build")
    expect(a.loc().lens?.id).toBe("explore")
  })

  test("⌘B folds the sidebar and ⌘K opens the palette, once per press", async () => {
    let s!: ShellRegistry
    const m = mount(() => {
      s = createShell(options("/projects/atlas/build/issues"))
      return <Shell shell={s} foldBelow={0} />
    })
    cleanup.push(m.dispose)
    await tick()
    document.body.dispatchEvent(key("b", { metaKey: true }))
    flush()
    expect(one("[data-part=app-shell]").hasAttribute("data-folded")).toBe(true)
    document.body.dispatchEvent(key("k", { metaKey: true }))
    flush()
    expect(s.paletteOpen()).toBe(true)
  })
})

describe("the shell in an app", () => {
  const files: ShellScope<{ id: string }> = {
    id: "box",
    label: (b) => b.id,
    items: () => [{ id: "b1" }],
    places: [{ id: "files", label: "Files", icon: "folder", view: View, path: true, trail: false }],
  }

  test("a place with `path` takes the rest of the address as its record, written as segments", () => {
    const s = make("/boxes/b1/files/src/lib/x.ts", {
      scopes: [{ id: "boxes", label: "Boxes", icon: "server", view: View, child: files }],
    })
    flush()
    expect(s.loc().record).toBe("src/lib/x.ts")
    expect(s.address()).toBe("/boxes/b1/files/src/lib/x.ts")
    s.toPlace(undefined, "files", undefined, "docs/read me.md")
    flush()
    expect(s.router.path()).toBe("/boxes/b1/files/docs/read%20me.md")
    expect(s.loc().record).toBe("docs/read me.md")
    s.toPlace(undefined, "files")
    flush()
    expect(s.loc().record).toBeUndefined()
  })

  test("an Esc entry runs once, even when it does not remove itself", () => {
    const s = make("/projects/atlas/build/issues/WEB-142")
    flush()
    let closed = 0
    s.pushEsc(() => closed++)
    expect(s.handleKey(key("Escape"))).toBe(true)
    flush()
    expect(closed).toBe(1)
    expect(s.loc().record).toBe("WEB-142")
    s.handleKey(key("Escape"))
    flush()
    expect(closed).toBe(1)
    expect(s.loc().record).toBeUndefined()
  })

  test("items that read a signal: the sidebar and the path follow it, without a warning", () => {
    const warn = console.warn
    const warned: unknown[] = []
    console.warn = (...a: unknown[]) => warned.push(a)
    try {
      const [extra, setExtra] = createSignal<{ id: string; name: string }[]>([], { ownedWrite: true })
      const dyn: ShellScope<{ id: string; name: string }> = {
        ...host,
        items: () => [{ id: "build-01", name: "build-01" }, ...extra()],
      }
      const s = make("/hosts", {
        scopes: [{ id: "hosts", label: "Hosts", icon: "server", view: View, child: dyn }],
      })
      flush()
      const listed = () => s.sidebar().groups[1]?.items.map((i) => i.label)
      expect(listed()).toEqual(["build-01"])
      setExtra([{ id: "new-02", name: "new-02" }])
      flush()
      expect(listed()).toEqual(["build-01", "new-02"])
      s.go("/hosts/new-02/operate/logs")
      flush()
      expect(s.path().map((p) => p.label)).toEqual(["Acme", "Hosts", "new-02"])
      s.handleKey(key("Escape"))
      s.step(1)
      expect(warned).toEqual([])
    } finally {
      console.warn = warn
    }
  })

  test("the place stays current in the sidebar while one of its records is open", () => {
    const s = make("/projects/atlas/build/issues/WEB-142")
    flush()
    const issues = s.sidebar().groups[0]!.items.find((i) => i.id === "issues")
    expect(issues?.current).toBe(true)
  })

  test("a panel's tabs and actions get the shell, as its body does", async () => {
    let got: ShellRegistry | undefined
    let s!: ShellRegistry
    const m = mount(() => {
      s = createShell(
        options("/hosts/build-01/operate/logs", {
          panels: [
            {
              id: "terminal",
              label: "Terminal",
              icon: "terminal",
              at: "bottom",
              render: () => <pre>$</pre>,
              tabs: (p) => {
                got = p.shell
                return {
                  label: "Sessions",
                  items: [{ id: "a", label: "zsh" }],
                  value: "a",
                  onChange: () => {},
                }
              },
              actions: (p) => <span data-test="acts">{p.shell.loc().place?.label}</span>,
            },
          ],
        }),
      )
      return <Shell shell={s} />
    })
    cleanup.push(m.dispose)
    s.showPanel("terminal")
    flush()
    await tick()
    expect(got).toBe(s)
    expect(one("[data-test=acts]").textContent).toBe("Logs")
  })

  test("the root carries the `nc` class, so the app's own root needs none", async () => {
    const m = mount(() => <Shell shell={createShell(options("/projects/atlas/build/issues"))} />)
    cleanup.push(m.dispose)
    await tick()
    expect(one("[data-part=shell]").classList.contains("nc")).toBe(true)
    expect(one("[data-part=app-shell]").classList.contains("nc")).toBe(true)
  })

  test("on a phone a lens's `open` panels stay closed; on a desktop they open", async () => {
    let s!: ShellRegistry
    const m = mount(() => (
      <PhoneOverride value={true}>
        {(() => {
          s = createShell(options("/projects/atlas/build/issues"))
          return <Shell shell={s} />
        })()}
      </PhoneOverride>
    ))
    cleanup.push(m.dispose)
    await tick()
    expect(s.panels().right).toBeUndefined()
    s.showPanel("details")
    flush()
    expect(s.panels().right?.id).toBe("details")
    expect(make("/projects/atlas/build/issues").panels().right?.id).toBe("details")
  })

  test("a view layout short of room folds the shell's sidebar, and it comes back with the room", async () => {
    let host: ViewLayoutHostValue | null = null
    const Probe = () => {
      host = useContext(ViewLayoutHost)
      return <div data-test="probe" />
    }
    let s!: ShellRegistry
    const m = mount(() => {
      s = createShell(
        options("/projects/atlas/build/issues", {
          scopes: [
            {
              id: "projects",
              label: "Projects",
              icon: "folder",
              view: Probe,
              child: {
                ...project,
                lenses: undefined,
                places: [{ id: "issues", label: "Issues", view: Probe }],
              },
            },
          ],
        }),
      )
      return <Shell shell={s} foldBelow={0} />
    })
    cleanup.push(m.dispose)
    await tick()
    const h = host as unknown as ViewLayoutHostValue
    expect(h.storage).toBe(s.storage)
    const handle = { id: "v", element: document.body, toggleSidebar: () => {} }
    const folded = () => one("[data-part=app-shell]").hasAttribute("data-folded")
    h.report(handle, 100)
    flush()
    expect(folded()).toBe(true)
    // Folding gave the layout 192px: it now has 92 to spare, short of what unfolding would take back.
    h.report(handle, -92)
    flush()
    expect(folded()).toBe(true)
    h.report(handle, -200)
    flush()
    expect(folded()).toBe(false)
  })
})
