import { afterEach, describe, expect, test } from "bun:test"
import { createRoot, createSignal, flush } from "solid-js"
import {
  AppearanceSettings,
  createAppearance,
  createHistory,
  createStoredWidth,
  HistoryArrows,
  type HistoryRouter,
  memoryRouter,
  memoryStorage,
  ResizeHandle,
  type StopInfo,
  Switcher,
  type SwitcherSection,
  Trail,
  WindowControls,
} from "../src"
import { all, click, mount, one, press, tick } from "./dom"

const SECTIONS: SwitcherSection[] = [
  {
    title: "Issues",
    entries: [
      { id: "WEB-139", label: "WEB-139", hint: "Sign-in loops on Safari", current: true },
      { id: "WEB-140", label: "WEB-140", hint: "Export as CSV" },
      { id: "WEB-142", label: "WEB-142", hint: "Dark mode for the editor" },
    ],
  },
]

function typeInto(input: HTMLInputElement, text: string) {
  input.focus()
  input.value = text
  input.dispatchEvent(new InputEvent("input", { inputType: "insertText", data: text, bubbles: true }))
  flush()
}

const items = () => all('[data-part="switcher-list"] [data-slot="command-item"]').filter((el) => !el.hidden)

afterEach(() => {
  document.documentElement.removeAttribute("data-nc-accent")
  document.documentElement.removeAttribute("data-nc-resizing")
})

describe("Switcher", () => {
  test("opens a filter field over its sections; typing narrows and Enter picks", async () => {
    const picked: string[] = []
    const { root, dispose } = mount(() => (
      <Switcher label="WEB-139" noun="issue" sections={SECTIONS} onPick={(e) => picked.push(e.id)} />
    ))
    const trigger = one<HTMLButtonElement>('[data-part="switcher"]', root)
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    click(trigger)
    await tick()
    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    const input = one<HTMLInputElement>('[data-part="switcher-list"] input')
    expect(input.placeholder).toBe("Switch issue…")
    expect(items()).toHaveLength(3)
    expect(items()[0]!.hasAttribute("data-current")).toBe(true)

    typeInto(input, "csv")
    await tick()
    expect(items().map((el) => el.textContent)).toEqual([expect.stringContaining("WEB-140")])
    press(input, "Enter")
    await tick()
    expect(picked).toEqual(["WEB-140"])
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    dispose()
  })

  test("↓ moves the highlight and a click picks", async () => {
    const picked: string[] = []
    const { root, dispose } = mount(() => (
      <Switcher label="WEB-139" noun="issue" sections={SECTIONS} onPick={(e) => picked.push(e.id)} />
    ))
    click(one('[data-part="switcher"]', root))
    await tick()
    const input = one<HTMLInputElement>('[data-part="switcher-list"] input')
    press(input, "ArrowDown")
    await tick()
    expect(items()[1]!.hasAttribute("data-highlighted")).toBe(true)
    press(input, "Enter")
    await tick()
    expect(picked).toEqual(["WEB-140"])
    click(one('[data-part="switcher"]', root))
    await tick()
    click(items()[2]!)
    await tick()
    expect(picked).toEqual(["WEB-140", "WEB-142"])
    dispose()
  })
})

describe("Trail", () => {
  test("parents go up; the current crumb is text, or a switcher", async () => {
    const went: string[] = []
    const picked: string[] = []
    const { root, dispose } = mount(() => (
      <Trail
        crumbs={[
          { label: "Atlas web", onClick: () => went.push("atlas") },
          { label: "Issues", onClick: () => went.push("issues") },
          {
            label: "WEB-139",
            switcher: { noun: "issue", sections: SECTIONS, onPick: (e) => picked.push(e.id) },
          },
        ]}
      />
    ))
    const trail = one('[data-part="trail"]', root)
    const crumbs = all<HTMLButtonElement>(".nc-trail__crumb")
    expect(crumbs.map((c) => c.textContent)).toEqual(["Atlas web", "Issues"])
    expect(trail.querySelectorAll(".nc-trail__sep")).toHaveLength(2)
    click(crumbs[1]!)
    expect(went).toEqual(["issues"])

    const sw = one<HTMLButtonElement>('[data-part="switcher"]', trail)
    expect(sw.getAttribute("aria-current")).toBe("location")
    expect(sw.textContent).toBe("WEB-139")
    click(sw)
    await tick()
    expect(sw.getAttribute("aria-expanded")).toBe("true")
    click(items()[2]!)
    await tick()
    expect(picked).toEqual(["WEB-142"])
    dispose()
  })

  test("folds leading crumbs into one menu, never the current one", async () => {
    const went: string[] = []
    const { root, dispose } = mount(() => (
      <Trail
        fold={5}
        crumbs={[
          { label: "Projects", onClick: () => went.push("projects") },
          { label: "Atlas web", onClick: () => went.push("atlas") },
          { label: "WEB-139" },
        ]}
      />
    ))
    expect(root.querySelectorAll(".nc-trail__crumb")).toHaveLength(0)
    expect(one(".nc-trail__here", root).textContent).toBe("WEB-139")
    click(one(".nc-trail__fold", root))
    await tick()
    const entries = all('[data-part="menu"] [data-value]')
    expect(entries.map((e) => e.textContent)).toEqual(["Projects", "Atlas web"])
    click(entries[1]!)
    await tick()
    expect(went).toEqual(["atlas"])
    dispose()
  })
})

describe("ResizeHandle", () => {
  const pointer = (el: Element, type: string, clientX: number, clientY = 0) =>
    el.dispatchEvent(new PointerEvent(type, { clientX, clientY, button: 0, pointerId: 1, bubbles: true }))

  test("drags, steps with keys, resets on double-click, and remembers", () => {
    const storage = memoryStorage()
    let width!: ReturnType<typeof createStoredWidth>
    const { root, dispose } = mount(() => {
      width = createStoredWidth("sidebar", { initial: 240, min: 200, max: 360, storage })
      return <ResizeHandle at="right" size={width} label="Resize sidebar" />
    })
    const handle = one('[data-part="resize-handle"]', root)
    expect(handle.getAttribute("role")).toBe("separator")
    expect(handle.getAttribute("aria-valuenow")).toBe("240")

    pointer(handle, "pointerdown", 100)
    flush()
    expect(handle.hasAttribute("data-dragging")).toBe(true)
    expect(document.documentElement.getAttribute("data-nc-resizing")).toBe("x")
    pointer(handle, "pointermove", 150)
    pointer(handle, "pointerup", 150)
    flush()
    expect(width.value()).toBe(290)
    expect(handle.hasAttribute("data-dragging")).toBe(false)
    expect(document.documentElement.hasAttribute("data-nc-resizing")).toBe(false)
    expect(storage.get("width/sidebar")).toBe("290")

    press(handle, "ArrowLeft")
    expect(width.value()).toBe(282)
    press(handle, "ArrowRight", { shiftKey: true })
    expect(width.value()).toBe(322)
    press(handle, "End")
    expect(width.value()).toBe(360)
    press(handle, "Home")
    expect(width.value()).toBe(200)

    handle.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }))
    flush()
    expect(width.value()).toBe(240)
    expect(storage.get("width/sidebar")).toBeNull()
    dispose()

    createRoot((done) => {
      storage.set("width/sidebar", "999")
      expect(createStoredWidth("sidebar", { initial: 240, min: 200, max: 360, storage }).value()).toBe(360)
      done()
    })
  })

  test("a handle on a left edge widens as it is dragged left", () => {
    let width!: ReturnType<typeof createStoredWidth>
    const { root, dispose } = mount(() => {
      width = createStoredWidth("panel", { initial: 340, min: 280, max: 520 })
      return <ResizeHandle at="left" size={width} label="Resize panel" />
    })
    const handle = one('[data-part="resize-handle"]', root)
    pointer(handle, "pointerdown", 500)
    pointer(handle, "pointermove", 460)
    pointer(handle, "pointerup", 460)
    flush()
    expect(width.value()).toBe(380)
    press(handle, "ArrowLeft")
    expect(width.value()).toBe(388)
    dispose()
  })
})

// A small app: a scope address without a lens means "the lens worn last", which `describe` spells out in full.
function workbench(router: HistoryRouter) {
  const worn = { lens: "build" }
  const describe = (path: string): StopInfo | undefined => {
    const [, scope, item, lens, place] = path.split("/")
    if (scope !== "projects") return undefined
    if (!item) return { path, frame: "projects", label: "Projects" }
    const l = lens ?? worn.lens
    worn.lens = l
    const full = `/projects/${item}/${l}${place ? `/${place}` : ""}`
    return { path: full, frame: `projects/${item}`, label: `${l}${place ? ` · ${place}` : ""}`, scope: item }
  }
  return createHistory({ router, describe, keys: false })
}

describe("createHistory", () => {
  test("every step is an entry; back and forward walk the router", async () => {
    const router = memoryRouter("/projects")
    const { history, dispose } = createRoot((d) => ({ history: workbench(router), dispose: d }))
    router.push("/projects/atlas/build/issues")
    router.push("/projects/atlas/build/agents")
    expect(history.stops().map((s) => s.label)).toEqual(["Projects", "build · issues", "build · agents"])
    expect(history.behind().map((s) => s.label)).toEqual(["build · issues", "Projects"])
    expect(history.nameOf(history.behind()[0]!)).toBe("build · issues")

    history.back()
    await tick()
    expect(router.path()).toBe("/projects/atlas/build/issues")
    expect(history.here()?.label).toBe("build · issues")
    expect(history.ahead().map((s) => s.label)).toEqual(["build · agents"])
    history.forward()
    await tick()
    expect(history.here()?.label).toBe("build · agents")
    history.jump(history.stops()[0]!)
    await tick()
    expect(router.path()).toBe("/projects")
    expect(history.index()).toBe(0)
    dispose()
  })

  test("writes a short address out in full when it records the stop", () => {
    const router = memoryRouter("/projects")
    const { dispose } = createRoot((d) => ({ history: workbench(router), dispose: d }))
    router.push("/projects/atlas")
    expect(router.path()).toBe("/projects/atlas/build")
    expect(router.entries()).toEqual(["/projects", "/projects/atlas/build"])
    dispose()
  })

  test("a run of lens switches is one stop; switching back undoes it", async () => {
    const router = memoryRouter("/projects")
    const { history, dispose } = createRoot((d) => ({ history: workbench(router), dispose: d }))
    router.push("/projects/atlas/build/issues")
    history.switchLens("/projects/atlas/product")
    await tick()
    history.switchLens("/projects/atlas/explore")
    await tick()
    expect(history.stops().map((s) => s.path)).toEqual([
      "/projects",
      "/projects/atlas/build/issues",
      "/projects/atlas/explore",
    ])
    expect(history.behind()[0]!.path).toBe("/projects/atlas/build/issues")
    history.switchLens("/projects/atlas/build/issues")
    await tick()
    expect(history.here()?.path).toBe("/projects/atlas/build/issues")
    expect(history.index()).toBe(1)
    dispose()
  })

  test("a fast double switch waits for the first to land and stays in the scope", async () => {
    const router = memoryRouter("/projects")
    const { history, dispose } = createRoot((d) => ({ history: workbench(router), dispose: d }))
    router.push("/projects/atlas/build/issues")
    history.switchLens("/projects/atlas/product")
    await tick()
    // Back to Build undoes the run (a walk that lands later); Explore comes before it has.
    history.switchLens("/projects/atlas/build/issues")
    history.switchLens("/projects/atlas/explore")
    await tick(4)
    expect(router.path()).toBe("/projects/atlas/explore")
    expect(history.here()?.frame).toBe("projects/atlas")
    expect(history.stops().map((s) => s.path)).toEqual([
      "/projects",
      "/projects/atlas/build/issues",
      "/projects/atlas/explore",
    ])
    dispose()
  })

  test("binds ⌘[ ⌘], Alt+arrows and the mouse's buttons", async () => {
    const router = memoryRouter("/projects")
    const { history, dispose } = createRoot((d) => ({ history: workbench(router), dispose: d }))
    const target = document.createElement("div")
    const unbind = history.bindKeys(target)
    router.push("/projects/atlas/build/issues")
    press(target, "[", { metaKey: true })
    await tick()
    expect(history.index()).toBe(0)
    press(target, "ArrowRight", { altKey: true })
    await tick()
    expect(history.index()).toBe(1)
    target.dispatchEvent(new MouseEvent("mouseup", { button: 3, bubbles: true }))
    await tick()
    expect(history.index()).toBe(0)
    unbind()
    dispose()
  })

  test("keeps its stops in the store across a reload", async () => {
    const storage = memoryStorage()
    const router = memoryRouter("/projects")
    const first = createRoot((d) => ({
      history: createHistory({ router, storage, describe: (p) => ({ label: p }), keys: false }),
      d,
    }))
    router.push("/projects/atlas/build")
    first.d()
    const again = createRoot((d) => ({
      history: createHistory({ router, storage, describe: (p) => ({ label: p }), keys: false }),
      d,
    }))
    expect(again.history.stops().map((s) => s.path)).toEqual(["/projects", "/projects/atlas/build"])
    expect(again.history.index()).toBe(1)
    again.d()
  })
})

describe("HistoryArrows", () => {
  test("name where they go, step, and list the stops on a right click", async () => {
    const router = memoryRouter("/projects")
    let history!: ReturnType<typeof workbench>
    const { root, dispose } = mount(() => {
      history = workbench(router)
      return <HistoryArrows history={history} />
    })
    const group = one('[data-part="history-arrows"]', root)
    const [back, forward] = all<HTMLButtonElement>(".nc-history__btn")
    expect(back!.getAttribute("aria-disabled")).toBe("true")
    router.push("/projects/atlas/build/issues")
    router.push("/projects/atlas/build/agents")
    flush()
    expect(back!.getAttribute("aria-disabled")).toBeNull()
    expect(back!.getAttribute("aria-label")).toBe("Back to build · issues")
    expect(forward!.getAttribute("aria-disabled")).toBe("true")

    click(back!)
    await tick()
    flush()
    expect(router.path()).toBe("/projects/atlas/build/issues")
    expect(forward!.getAttribute("aria-label")).toBe("Forward to build · agents")

    back!.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }))
    flush()
    await tick()
    const entries = all('[data-part="menu"] [data-value]')
    expect(entries.map((e) => e.textContent)).toEqual(["Projects"])
    click(entries[0]!)
    await tick()
    flush()
    expect(router.path()).toBe("/projects")
    expect(group).toBeTruthy()
    dispose()
  })
})

describe("WindowControls", () => {
  test("calls the app's handlers in both styles", () => {
    const calls: string[] = []
    const [style, setStyle] = createSignal<"mac" | "win">("mac")
    const { root, dispose } = mount(() => (
      <WindowControls
        style={style()}
        onMinimise={() => calls.push("min")}
        onMaximise={() => calls.push("max")}
        onClose={() => calls.push("close")}
      />
    ))
    const part = one('[data-part="window-controls"]', root)
    expect(part.getAttribute("data-style")).toBe("mac")
    for (const b of part.querySelectorAll("button")) click(b)
    expect(calls).toEqual(["close", "min", "max"])
    setStyle("win")
    flush()
    expect(part.getAttribute("data-style")).toBe("win")
    const labels = Array.from(part.querySelectorAll("button")).map((b) => b.getAttribute("aria-label"))
    expect(labels).toEqual(["Minimise", "Maximise", "Close window"])
    for (const b of part.querySelectorAll("button")) click(b)
    expect(calls).toEqual(["close", "min", "max", "min", "max", "close"])
    dispose()
  })
})

describe("createAppearance", () => {
  test("applies data-theme and the lens accent on the root, and round-trips the store", () => {
    const storage = memoryStorage()
    const el = document.createElement("div")
    el.setAttribute("data-theme", "dark")
    const { a, dispose } = createRoot((d) => ({ a: createAppearance({ storage, root: el }), dispose: d }))
    expect(a.theme()).toBe("dark")
    a.setTheme("light")
    expect(el.getAttribute("data-theme")).toBe("light")
    a.setLensHue("mint")
    expect(el.getAttribute("data-nc-accent")).toBe("mint")
    a.setFollowLens(false)
    expect(el.hasAttribute("data-nc-accent")).toBe(false)
    a.setTintLine(false)
    expect(JSON.parse(storage.get("appearance")!)).toEqual({ theme: "light", follow: false, tint: false })
    dispose()

    const el2 = document.createElement("div")
    const again = createRoot((d) => ({ a: createAppearance({ storage, root: el2 }), d }))
    expect(again.a.theme()).toBe("light")
    expect(again.a.followLens()).toBe(false)
    expect(again.a.tintLine()).toBe(false)
    expect(el2.getAttribute("data-theme")).toBe("light")
    again.d()
  })

  test("follows a lens for as long as its owner lives", () => {
    const [hue, setHue] = createSignal<"sky" | "rose" | undefined>("sky")
    const html = document.documentElement
    const { a, dispose } = createRoot((d) => {
      const a = createAppearance()
      a.follow(hue)
      return { a, dispose: d }
    })
    flush()
    expect(html.getAttribute("data-nc-accent")).toBe("sky")
    setHue("rose")
    flush()
    expect(a.accent()).toBe("rose")
    expect(html.getAttribute("data-nc-accent")).toBe("rose")
    dispose()
    expect(html.hasAttribute("data-nc-accent")).toBe(false)
  })
})

describe("AppearanceSettings", () => {
  test("its rows set the theme and the two lens switches", () => {
    const el = document.createElement("div")
    let a!: ReturnType<typeof createAppearance>
    const { root, dispose } = mount(() => {
      a = createAppearance({ root: el, defaultTheme: "dark" })
      return <AppearanceSettings appearance={a} />
    })
    const part = one('[data-part="appearance-settings"]', root)
    expect(part.querySelectorAll('[data-part="setting-row"]')).toHaveLength(3)
    expect(part.textContent).toContain("Accent follows lens")
    expect(part.textContent).toContain("Lens tint line")
    const light = Array.from(part.querySelectorAll<HTMLElement>(".nc-seg__item")).find(
      (b) => b.textContent === "Light",
    )!
    click(light)
    expect(a.theme()).toBe("light")
    expect(el.getAttribute("data-theme")).toBe("light")
    const [follow, tint] = Array.from(part.querySelectorAll<HTMLElement>('[role="switch"]'))
    click(follow!)
    click(tint!)
    expect(a.followLens()).toBe(false)
    expect(a.tintLine()).toBe(false)
    dispose()
  })
})
