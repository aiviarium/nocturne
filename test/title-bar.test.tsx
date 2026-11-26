import { afterEach, describe, expect, test } from "bun:test"
import { createSignal, flush } from "solid-js"
import {
  CommandPalette,
  createAppearance,
  type Lens,
  type LensPrefs,
  LensSwitch,
  type PaletteSection,
  placeScopeBox,
  ScopeBox,
  ScopePath,
  type ScopeSegment,
  TitleBar,
  TitleBarItem,
  type TitleBarMetrics,
} from "../src"
import { all, click, mount as mountView, one, press, tick } from "./dom"

// Every mount is disposed after its test, even one that failed half way, so no listener or popup leaks into the next.
const live: Array<() => void> = []
const mount: typeof mountView = (view) => {
  const m = mountView(view)
  let done = false
  const dispose = () => {
    if (done) return
    done = true
    m.dispose()
  }
  live.push(dispose)
  return { root: m.root, dispose }
}

const LENSES: Lens[] = [
  { id: "explore", label: "Explore", icon: "sparkle", hue: "orchid", purpose: "Map and notes" },
  { id: "product", label: "Product", icon: "book-open", hue: "amber", purpose: "Roadmap and specs" },
  { id: "build", label: "Build", icon: "code", hue: "mint", purpose: "Issues and agents" },
  { id: "operate", label: "Operate", icon: "server", hue: "sky", purpose: "Hosts and logs" },
]

const PATH: ScopeSegment[] = [
  { id: "ws", label: "Acme", switcher: { noun: "workspace", sections: [], onPick: () => {} } },
  { id: "projects", label: "Projects", onClick: () => {} },
  { id: "atlas", label: "Atlas web", mark: { name: "Atlas web", hue: "sky" } },
]

const typeInto = (input: HTMLInputElement, text: string) => {
  input.focus()
  input.value = text
  input.dispatchEvent(new InputEvent("input", { inputType: "insertText", data: text, bubbles: true }))
  flush()
}

/** A bar 1440px wide with the path from 90px, the right-hand items from 1280px and a 300px box. */
const metrics = (over: Partial<TitleBarMetrics> = {}): TitleBarMetrics => ({
  width: 1440,
  pathStart: 90,
  segments: [60, 80, 110],
  end: 1280,
  box: 300,
  labels: 160,
  lens: 34,
  lenses: 4,
  plus: 16,
  ...over,
})

afterEach(() => {
  for (const d of live.splice(0)) d()
  document.documentElement.removeAttribute("data-nc-accent")
})

describe("placeScopeBox", () => {
  test("centres the box on the bar while it clears the path and the right side", () => {
    expect(placeScopeBox(metrics())).toEqual({ fold: 0, compact: false, squeeze: 0, left: 570 })
  })

  test("pushes the box right just enough to clear a long path by 16px", () => {
    const p = placeScopeBox(metrics({ segments: [200, 200, 220] }))
    expect(p.fold).toBe(0)
    expect(p.left).toBe(90 + 620 + 16)
  })

  test("pushes the box left to clear the right-hand items", () => {
    const p = placeScopeBox(metrics({ width: 1200, end: 640, segments: [40], box: 300 }))
    expect(p.left).toBe(640 - 16 - 300)
  })

  test("folds the path from the start, then drops the labels, then folds lenses into +N", () => {
    // 90 + path + 16 + box must stay within 1280 - 16 = 1264.
    expect(placeScopeBox(metrics({ segments: [300, 300, 300], box: 400 })).fold).toBe(1)
    expect(placeScopeBox(metrics({ segments: [300, 300, 450], box: 400 })).fold).toBe(2)
    const labels = placeScopeBox(metrics({ segments: [300, 300, 600], box: 600 }))
    expect(labels).toMatchObject({ fold: 2, compact: true, squeeze: 0 })
    const plus = placeScopeBox(metrics({ segments: [300, 300, 600], box: 720, labels: 160 }))
    expect(plus).toMatchObject({ fold: 2, compact: true })
    expect(plus.squeeze).toBeGreaterThan(0)
  })
})

describe("TitleBar", () => {
  const bar = (over: Partial<TitleBarMetrics> = {}, extra: Record<string, unknown> = {}) => {
    const [lens, setLens] = createSignal("build")
    const m = mount(() => (
      <TitleBar
        path={PATH}
        lenses={LENSES}
        lens={lens()}
        onLensChange={setLens}
        measure={() => metrics(over)}
        windowControls={{ style: "mac" }}
        keys={false}
        {...extra}
      />
    ))
    return { ...m, lens }
  }

  test("renders the icon, path, box and window controls with the drag region", async () => {
    const { root, dispose } = bar()
    await tick()
    const el = one("[data-part=title-bar]", root)
    expect(el.getAttribute("data-runs-in")).toBe("desktop")
    expect(el.hasAttribute("data-drag-region")).toBe(true)
    expect(one("[data-part=scope-path]", el).textContent).toContain("Atlas web")
    expect(one("[data-part=scope-box]", el).getAttribute("data-mode")).toBe("lenses")
    expect(one("[data-part=window-controls]", el)).toBeTruthy()
    dispose()
  })

  test("places the box centred, pushed, folded, and with labels dropped", async () => {
    const left = (root: HTMLElement) => one<HTMLElement>("[data-part=scope-box]", root).style.left
    let m = bar()
    await tick()
    expect(left(m.root)).toBe("570px")
    expect(one("[data-part=title-bar]", m.root).hasAttribute("data-placed")).toBe(true)
    m.dispose()

    m = bar({ segments: [200, 200, 220] })
    await tick()
    expect(left(m.root)).toBe("726px")
    m.dispose()

    m = bar({ segments: [300, 300, 450], box: 400 })
    await tick()
    expect(one("[data-part=scope-path]", m.root).getAttribute("data-folded")).toBe("2")
    expect(all("[data-part=scope-path] [data-seg]").map((s) => s.dataset.seg)).toEqual(["atlas"])
    expect(m.root.querySelector(".nc-scope-path__fold")).toBeTruthy()
    m.dispose()

    m = bar({ segments: [300, 300, 600], box: 600 })
    await tick()
    expect(one("[data-part=lens-switch]", m.root).hasAttribute("data-compact")).toBe(true)
    m.dispose()

    m = bar({ segments: [300, 300, 600], box: 720 })
    await tick()
    expect(one(".nc-lens-switch__count", m.root).textContent).toMatch(/^\+\d$/)
    // The lens that is on never folds.
    expect(one("[data-lens=build]", m.root)).toBeTruthy()
    m.dispose()
  })

  test("browser mode drops the arrows, the controls and the drag region", async () => {
    const { root, dispose } = bar({}, { runsIn: "browser" })
    await tick()
    const el = one("[data-part=title-bar]", root)
    expect(el.getAttribute("data-runs-in")).toBe("browser")
    expect(el.hasAttribute("data-drag-region")).toBe(false)
    expect(root.querySelector("[data-part=window-controls]")).toBeNull()
    dispose()
  })

  test("the tint line takes the lens's hue, and is neutral without a lens or with the line off", async () => {
    let m = bar()
    await tick()
    let el = one("[data-part=title-bar]", m.root)
    expect(el.getAttribute("data-tint")).toBe("lens")
    expect(el.getAttribute("data-hue")).toBe("mint")
    click(one("[data-lens=operate]", m.root))
    await tick()
    expect(m.lens()).toBe("operate")
    expect(el.getAttribute("data-hue")).toBe("sky")
    m.dispose()

    m = bar({}, { tintLine: false })
    await tick()
    el = one("[data-part=title-bar]", m.root)
    expect(el.getAttribute("data-tint")).toBe("neutral")
    expect(el.hasAttribute("data-hue")).toBe(false)
    m.dispose()

    const appearance = createAppearance()
    appearance.setTintLine(false)
    m = bar({}, { appearance })
    await tick()
    expect(one("[data-part=title-bar]", m.root).getAttribute("data-tint")).toBe("neutral")
    appearance.setTintLine(true)
    flush()
    expect(one("[data-part=title-bar]", m.root).getAttribute("data-tint")).toBe("lens")
    // The accent follows the lens that is on.
    expect(document.documentElement.getAttribute("data-nc-accent")).toBe("mint")
    m.dispose()
    appearance.dispose()

    const { root, dispose } = mount(() => (
      <TitleBar path={PATH} measure={() => metrics({ lenses: 0, labels: 40 })} keys={false} />
    ))
    await tick()
    expect(one("[data-part=title-bar]", root).getAttribute("data-tint")).toBe("neutral")
    expect(one("[data-part=scope-box]", root).getAttribute("data-mode")).toBe("find")
    expect(one("[data-part=scope-box]", root).textContent).toContain("Search Atlas web…")
    dispose()
  })

  test("⌘K opens the palette over the box", async () => {
    const { root, dispose } = mount(() => (
      <TitleBar
        path={PATH}
        lenses={LENSES}
        lens="build"
        measure={() => metrics()}
        palette={{
          search: () => [
            { title: "Atlas web", commands: [{ id: "issues", label: "Issues", run: () => {} }] },
          ],
        }}
      />
    ))
    await tick()
    press(window.document.body, "k", { metaKey: true })
    await tick()
    expect(one("[data-part=title-bar]", root).hasAttribute("data-palette")).toBe(true)
    const chips = all(".nc-palette__chip").map((c) => c.textContent)
    expect(chips).toEqual([expect.stringContaining("Atlas web"), "Build"])
    dispose()
  })
})

describe("TitleBarItem", () => {
  test("a status item at the drill size, in its tone, that runs its action", () => {
    let opened = 0
    const { root } = mount(() => (
      <TitleBarItem icon="webhook" label="1 failing" tone="warning" onClick={() => opened++} />
    ))
    const item = one("[data-part=title-bar-item]", root)
    expect(item.getAttribute("data-tone")).toBe("warning")
    expect(item.textContent).toBe("1 failing")
    click(item)
    expect(opened).toBe(1)
  })
})

describe("ScopePath", () => {
  test("goes up from a parent, opens a segment's switcher, and folds leading segments", async () => {
    const went: string[] = []
    const picked: string[] = []
    const segments: ScopeSegment[] = [
      { id: "ws", label: "Acme", onClick: () => went.push("ws") },
      { id: "projects", label: "Projects", onClick: () => went.push("projects") },
      {
        id: "atlas",
        label: "Atlas web",
        switcher: {
          noun: "project",
          sections: [
            {
              title: "Projects",
              entries: [
                { id: "atlas", label: "Atlas web", current: true },
                { id: "docs", label: "Docs site" },
              ],
            },
          ],
          onPick: (e) => picked.push(e.id),
        },
      },
    ]
    const [fold, setFold] = createSignal(0)
    const { root, dispose } = mount(() => <ScopePath segments={segments} fold={fold()} />)
    const nav = one("[data-part=scope-path]", root)
    expect(all(".nc-scope-path__sep").length).toBe(2)
    click(one("[data-seg=projects] .nc-scope-path__label", nav))
    expect(went).toEqual(["projects"])
    const last = one("[data-seg=atlas]", nav)
    expect(last.hasAttribute("data-strong")).toBe(true)
    expect(one(".nc-scope-path__label", last).getAttribute("aria-current")).toBe("page")
    // The label of a segment without its own place opens the switcher, like its caret.
    click(one(".nc-scope-path__label", last))
    await tick()
    expect(one(".nc-scope-path__caret", last).getAttribute("aria-expanded")).toBe("true")
    const input = one<HTMLInputElement>("[data-part=switcher-list] input")
    typeInto(input, "docs")
    press(input, "Enter")
    await tick()
    expect(picked).toEqual(["docs"])

    setFold(2)
    flush()
    expect(nav.getAttribute("data-folded")).toBe("2")
    expect(all("[data-part=scope-path] [data-seg]").map((s) => s.dataset.seg)).toEqual(["atlas"])
    expect(one(".nc-scope-path__fold", nav).getAttribute("aria-label")).toBe("Show the folded path")
    dispose()
  })
})

describe("LensSwitch", () => {
  test("switches lenses by click and by ⌘ digits, in the person's order", async () => {
    const [value, setValue] = createSignal("build")
    const [prefs, setPrefs] = createSignal<LensPrefs>({ order: ["operate"], hidden: [] })
    const { root, dispose } = mount(() => (
      <LensSwitch
        lenses={LENSES}
        value={value()}
        onChange={setValue}
        prefs={prefs()}
        onPrefsChange={setPrefs}
      />
    ))
    const sw = one("[data-part=lens-switch]", root)
    expect(all(".nc-lens-switch__group [data-lens]").map((b) => b.dataset.lens)).toEqual([
      "operate",
      "explore",
      "product",
      "build",
    ])
    expect(one("[data-lens=build]", sw).hasAttribute("data-checked")).toBe(true)
    click(one("[data-lens=product]", sw))
    expect(value()).toBe("product")
    press(document.body, "1", { metaKey: true })
    expect(value()).toBe("operate")
    press(document.body, "2", { ctrlKey: true })
    expect(value()).toBe("explore")
    // A hidden lens drops out of the numbering and into the +N menu.
    setPrefs({ order: ["operate"], hidden: ["product"] })
    flush()
    expect(one(".nc-lens-switch__count", sw).textContent).toBe("+1")
    press(document.body, "3", { metaKey: true })
    expect(value()).toBe("build")
    dispose()
  })

  test("Customise reorders with Alt and an arrow, and hides a lens", async () => {
    const [prefs, setPrefs] = createSignal<LensPrefs>({ order: [], hidden: [] })
    const { root, dispose } = mount(() => (
      <LensSwitch
        lenses={LENSES}
        value="build"
        onChange={() => {}}
        prefs={prefs()}
        onPrefsChange={setPrefs}
        keys={false}
      />
    ))
    click(one(".nc-lens-switch__more", root))
    await tick()
    const customise = all<HTMLElement>("[data-part=menu] [role=menuitem]").find((el) =>
      el.textContent?.includes("Customise lenses"),
    )
    expect(customise).toBeTruthy()
    click(customise!)
    await tick(4)
    const panel = one("[data-part=lens-customise]")
    const rows = () => all<HTMLElement>("[data-part=lens-customise] [data-lens]").map((r) => r.dataset.lens)
    expect(rows()).toEqual(["explore", "product", "build", "operate"])
    press(one("[data-part=lens-customise] [data-lens=operate]"), "ArrowUp", { altKey: true })
    expect(prefs().order).toEqual(["explore", "product", "operate", "build"])
    expect(rows()).toEqual(["explore", "product", "operate", "build"])
    expect(all(".nc-lens-switch__group [data-lens]").map((b) => b.dataset.lens)).toEqual([
      "explore",
      "product",
      "operate",
      "build",
    ])
    const toggle = one<HTMLElement>("[data-lens=explore] [role=switch]", panel)
    click(toggle)
    flush()
    expect(prefs().hidden).toEqual(["explore"])
    expect(root.querySelector(".nc-lens-switch__group [data-lens=explore]")).toBeNull()
    dispose()
  })
})

describe("ScopeBox", () => {
  test("the magnifier opens search; without lenses the box is a search field", () => {
    let searched = 0
    const [lenses, setLenses] = createSignal<Lens[]>(LENSES)
    const { root, dispose } = mount(() => (
      <ScopeBox scope="Atlas web" lenses={lenses()} lens="build" onSearch={() => searched++} keys={false} />
    ))
    const box = one("[data-part=scope-box]", root)
    expect(box.getAttribute("data-mode")).toBe("lenses")
    click(one(".nc-scope-box__search", box))
    expect(searched).toBe(1)
    setLenses([])
    flush()
    expect(box.getAttribute("data-mode")).toBe("find")
    const find = one(".nc-scope-box__find", box)
    expect(find.textContent).toContain("Search Atlas web…")
    click(find)
    expect(searched).toBe(2)
    dispose()
  })
})

describe("CommandPalette", () => {
  const SECTIONS: PaletteSection[] = [
    {
      title: "Atlas web · Build",
      commands: [
        { id: "issues", label: "Issues", icon: "list", run: () => ran.push("issues") },
        { id: "cycles", label: "Cycles", icon: "refresh-cw", run: () => ran.push("cycles") },
        { id: "prs", label: "Pull requests", icon: "git-pull-request", run: () => ran.push("prs") },
      ],
    },
  ]
  let ran: string[] = []
  const open = () => {
    ran = []
    const [isOpen, setOpen] = createSignal(true)
    const queries: string[] = []
    const m = mount(() => (
      <CommandPalette
        open={isOpen()}
        onClose={() => setOpen(false)}
        chips={[
          { id: "atlas", label: "Atlas web" },
          { id: "lens:build", label: "Build", icon: "code", hue: "mint" },
        ]}
        search={(q) => {
          queries.push(q.text)
          return SECTIONS
        }}
        lenses={[
          { id: "explore", label: "Explore", hue: "orchid", run: () => ran.push("lens:explore") },
          { id: "build", label: "Build", hue: "mint", run: () => ran.push("lens:build") },
        ]}
        actions={[
          {
            title: "Atlas web",
            commands: [{ id: "new", label: "New issue", shortcut: "C", run: () => ran.push("new") }],
          },
        ]}
        workspace="Acme"
      />
    ))
    return { ...m, isOpen, queries }
  }
  const items = () => all("[data-part=command-palette] [data-slot=command-item]").filter((el) => !el.hidden)
  const input = () => one<HTMLInputElement>("[data-part=command-palette] input")

  test("renders its chips and sections; typing narrows and Enter runs", async () => {
    const { isOpen, dispose } = open()
    await tick()
    expect(one("[data-part=command-palette]")).toBeTruthy()
    expect(all(".nc-palette__chip").map((c) => c.textContent)).toEqual(["Atlas web", "Build"])
    expect(items()).toHaveLength(3)
    typeInto(input(), "pull")
    await tick()
    expect(items().map((el) => el.textContent)).toEqual([expect.stringContaining("Pull requests")])
    press(input(), "Enter")
    await tick()
    expect(ran).toEqual(["prs"])
    expect(isOpen()).toBe(false)
    dispose()
  })

  test("`:` lists the lenses and `>` the actions; Backspace in an empty field widens", async () => {
    const { queries, dispose } = open()
    await tick()
    typeInto(input(), ":ex")
    await tick()
    expect(items().map((el) => el.textContent)).toEqual([expect.stringContaining("Explore")])
    typeInto(input(), ">")
    await tick()
    expect(items().map((el) => el.textContent)).toEqual([expect.stringContaining("New issue")])
    press(input(), "ArrowDown")
    press(input(), "Enter")
    await tick()
    expect(ran).toEqual(["new"])
    dispose()

    const again = open()
    await tick()
    typeInto(input(), "")
    press(input(), "Backspace")
    await tick()
    expect(all(".nc-palette__chip").map((c) => c.textContent)).toEqual(["Atlas web"])
    expect(queries.length).toBeGreaterThan(0)
    again.dispose()
  })
})
