import { afterEach, describe, expect, test } from "bun:test"
import { createSignal, flush } from "solid-js"
import {
  AccountMenu,
  AppShell,
  memoryStorage,
  Nav,
  type NavGroup,
  PanelRail,
  PhoneOverride,
  type RailPanel,
  ShellPanel,
  type ShellPanelTab,
  SidebarHeader,
  ViewHeader,
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
  document.documentElement.removeAttribute("data-nc-resizing")
})

function typeInto(input: HTMLInputElement, text: string) {
  input.focus()
  input.value = text
  input.dispatchEvent(new InputEvent("input", { inputType: "insertText", data: text, bubbles: true }))
  flush()
}

/** Drags a resize handle from `from` to each of `to` along its axis, then lets go. */
function drag(handle: HTMLElement, from: number, ...to: number[]) {
  handle.dispatchEvent(
    new PointerEvent("pointerdown", { bubbles: true, button: 0, clientX: from, pointerId: 1 }),
  )
  flush()
  for (const x of to) {
    handle.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: x, pointerId: 1 }))
    flush()
  }
  handle.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: to.at(-1), pointerId: 1 }))
  flush()
}

const cmd = (key: string) => {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, metaKey: true, bubbles: true, cancelable: true }))
  flush()
}

const GROUPS: NavGroup[] = [
  {
    items: [
      {
        id: "issues",
        label: "Issues",
        icon: "list",
        current: true,
        items: [{ label: "Backlog", count: 4 }, { label: "All issues" }],
      },
      { label: "Cycles", icon: "refresh-cw" },
      { label: "Pull requests", icon: "git-pull-request", count: 2 },
    ],
  },
]

function Shell(props: { storage?: ReturnType<typeof memoryStorage>; onUp?: () => void }) {
  return (
    <AppShell
      storage={props.storage}
      titleBar={<header data-part="title-bar-stub">bar</header>}
      sidebarHeader={<SidebarHeader up={{ label: "Projects", onClick: () => props.onUp?.() }} />}
      sidebar={<Nav label="Places" groups={GROUPS} />}
      sidebarFoot={<AccountMenu name="Mira Okonkwo" />}
    >
      <ViewHeader title="Issues" />
    </AppShell>
  )
}

describe("AppShell", () => {
  test("lays out the title bar, the sidebar, the raised view surface and the rail", () => {
    const { root } = track(
      mount(() => (
        <AppShell
          titleBar={<header data-part="title-bar-stub">bar</header>}
          sidebar={<nav>places</nav>}
          sidebarLabel="Workspace"
          rail={<PanelRail panels={[]} onToggle={() => {}} />}
        >
          view
        </AppShell>
      )),
    )
    const shell = one("[data-part=app-shell]", root)
    const kids = Array.from(shell.children)
    expect(kids[0]!.getAttribute("data-part")).toBe("title-bar-stub")
    const row = kids[1]!
    expect(Array.from(row.children).map((c) => c.getAttribute("data-part"))).toEqual([
      "sidebar",
      "scrim",
      "shell-surface",
      "panel-rail",
    ])
    expect(one("[data-part=sidebar]", shell).getAttribute("aria-label")).toBe("Workspace")
    expect(one("[data-part=shell-view]", shell).textContent).toBe("view")
    expect(shell.style.getPropertyValue("--nc-sidebar-w")).toBe("240px")
  })

  test("folds the sidebar when its edge is dragged below 140px, and opens it again past it", () => {
    const storage = memoryStorage()
    const { root } = track(mount(() => <Shell storage={storage} />))
    const shell = one("[data-part=app-shell]", root)
    const edge = one("[data-part=sidebar] > [data-part=resize-handle]", shell)
    drag(edge, 240, 200, 100)
    expect(shell.hasAttribute("data-folded")).toBe(true)
    expect(shell.style.getPropertyValue("--nc-sidebar-w")).toBe("48px")
    expect(storage.get("sidebar/folded")).toBe("true")
    // Only the dragged handle lit, and the root forgot the drag once it ended.
    expect(document.documentElement.hasAttribute("data-nc-resizing")).toBe(false)
    drag(edge, 48, 160, 300)
    expect(shell.hasAttribute("data-folded")).toBe(false)
    expect(shell.style.getPropertyValue("--nc-sidebar-w")).toBe("300px")
    expect(storage.get("sidebar/folded")).toBeNull()
  })

  test("⌘B and ⌘\\ fold and unfold it, and unfolding restores the last full width", () => {
    const { root } = track(mount(() => <Shell />))
    const shell = one("[data-part=app-shell]", root)
    press(one("[data-part=sidebar] > [data-part=resize-handle]", shell), "ArrowRight")
    expect(shell.style.getPropertyValue("--nc-sidebar-w")).toBe("248px")
    cmd("b")
    expect(shell.hasAttribute("data-folded")).toBe(true)
    cmd("\\")
    expect(shell.hasAttribute("data-folded")).toBe(false)
    expect(shell.style.getPropertyValue("--nc-sidebar-w")).toBe("248px")
  })

  test("the minimise button folds it to the rail; the rail's one button unfolds it", () => {
    const { root } = track(mount(() => <Shell />))
    const shell = one("[data-part=app-shell]", root)
    click(one("[data-part=sidebar-minimise]", shell))
    expect(shell.hasAttribute("data-folded")).toBe(true)
    const header = one("[data-part=sidebar-header]", shell)
    // Folded: the unfold button alone, where ↑ was.
    expect(header.querySelector("[data-part=sidebar-up]")).toBeNull()
    expect(header.querySelector("[data-part=sidebar-filter]")).toBeNull()
    expect(header.querySelector("[data-part=sidebar-minimise]")).toBeNull()
    // The account is its avatar at the foot.
    expect(one("[data-part=account-menu]", shell).classList.contains("nc-account--avatar")).toBe(true)
    click(one("[data-part=sidebar-unfold]", header))
    expect(shell.hasAttribute("data-folded")).toBe(false)
    expect(one("[data-part=account-menu]", shell).classList.contains("nc-account--row")).toBe(true)
  })

  test("the right panel floats over the view when docking it would leave the view under 480px", async () => {
    const { root } = track(
      mount(() => (
        <AppShell right={<ShellPanel at="right" title="Details" />}>
          <span>view</span>
        </AppShell>
      )),
    )
    const surface = one("[data-part=shell-surface]", root)
    const panel = one("[data-part=shell-panel]", root)
    let width = 1000
    Object.defineProperty(surface, "clientWidth", { get: () => width, configurable: true })
    window.dispatchEvent(new Event("resize"))
    flush()
    expect(panel.hasAttribute("data-overlay")).toBe(false)
    expect(panel.querySelector("[data-part=resize-handle]")).not.toBeNull()
    width = 700
    window.dispatchEvent(new Event("resize"))
    flush()
    expect(surface.hasAttribute("data-overlay")).toBe(true)
    expect(panel.hasAttribute("data-overlay")).toBe(true)
    // Floating, it has no edge to drag.
    expect(panel.querySelector("[data-part=resize-handle]")).toBeNull()
  })

  test("a panel whose content the view already shows is hidden, and its rail button goes", () => {
    const [covers, setCovers] = createSignal<string[]>([])
    const toggled: string[] = []
    const panels: RailPanel[] = [
      { id: "details", label: "Details", icon: "panel-right", at: "right" },
      { id: "logs", label: "Logs", icon: "logs", at: "bottom" },
    ]
    const { root } = track(
      mount(() => (
        <AppShell
          covers={covers()}
          rail={<PanelRail panels={panels} open={{ bottom: "logs" }} onToggle={(id) => toggled.push(id)} />}
          bottom={<ShellPanel id="logs" at="bottom" title="Logs" />}
        >
          view
        </AppShell>
      )),
    )
    const rail = one("[data-part=panel-rail]", root)
    expect(rail.querySelectorAll("button")).toHaveLength(2)
    expect(one("[data-panel=logs]", rail).getAttribute("aria-pressed")).toBe("true")
    expect(one("[data-part=shell-panel]", root).hidden).toBe(false)
    setCovers(["logs"])
    flush()
    expect(one("[data-part=shell-panel]", root).hidden).toBe(true)
    expect(rail.querySelector("[data-panel=logs]")).toBeNull()
    expect(one("[data-part=shell-surface]", root).hasAttribute("data-bottom")).toBe(false)
    setCovers([])
    flush()
    // It comes back in place: it stayed mounted.
    expect(one("[data-part=shell-panel]", root).hidden).toBe(false)
    click(one("[data-panel=details]", rail))
    expect(toggled).toEqual(["details"])
  })

  test("on a phone the sidebar is a drawer: the scrim and Escape close it, and so does a choice in it", () => {
    let closed = 0
    const [open, setOpen] = createSignal(false)
    const { root } = track(
      mount(() => (
        <PhoneOverride value={true}>
          <AppShell
            drawerOpen={open()}
            onDrawerClose={() => {
              closed++
              setOpen(false)
            }}
            sidebar={<Nav label="Places" groups={GROUPS} />}
          >
            view
          </AppShell>
        </PhoneOverride>
      )),
    )
    const shell = one("[data-part=app-shell]", root)
    expect(shell.hasAttribute("data-phone")).toBe(true)
    expect(shell.hasAttribute("data-drawer")).toBe(false)
    expect(one<HTMLButtonElement>("[data-part=scrim]", shell).hidden).toBe(true)
    // No edge to drag on a phone.
    expect(shell.querySelector("[data-part=resize-handle]")).toBeNull()
    setOpen(true)
    flush()
    expect(shell.getAttribute("data-drawer")).toBe("open")
    click(one("[data-part=scrim]", shell))
    expect(closed).toBe(1)
    setOpen(true)
    flush()
    press(document.body, "Escape")
    expect(closed).toBe(2)
    setOpen(true)
    flush()
    click(one("[data-part=nav-item]", shell))
    expect(closed).toBe(3)
  })
})

describe("SidebarHeader", () => {
  test("↑ goes up, named after where it goes, and stays in place, disabled, when there is nowhere up", () => {
    let up = 0
    const [parent, setParent] = createSignal(true)
    const [shown, setShown] = createSignal(true)
    const { root } = track(
      mount(() => (
        <SidebarHeader
          up={shown() ? (parent() ? { label: "Projects", onClick: () => up++ } : { label: "Up" }) : undefined}
        />
      )),
    )
    const header = one("[data-part=sidebar-header]", root)
    const button = one("[data-part=sidebar-up]", header)
    expect(button.getAttribute("aria-label")).toBe("Up to Projects")
    click(button)
    expect(up).toBe(1)
    setParent(false)
    flush()
    const still = one("[data-part=sidebar-up]", header)
    expect(still.hasAttribute("disabled") || still.getAttribute("aria-disabled") === "true").toBe(true)
    click(still)
    expect(up).toBe(1)
    setShown(false)
    flush()
    expect(header.querySelector("[data-part=sidebar-up]")).toBeNull()
    // Outside a shell, with nothing to minimise, the row is the filter alone.
    expect(header.querySelector("[data-part=sidebar-minimise]")).toBeNull()
    expect(header.querySelector("[data-part=sidebar-filter]")).not.toBeNull()
  })

  test("typing filters, Escape clears the text and then leaves the field, and / focuses it", () => {
    const seen: string[] = []
    const { root } = track(
      mount(() => (
        <div data-part="sidebar">
          <SidebarHeader filterLabel="Filter Atlas web" onFilterChange={(v) => seen.push(v)} />
          <button type="button" data-part="elsewhere">
            item
          </button>
        </div>
      )),
    )
    const input = one<HTMLInputElement>("[data-part=sidebar-filter] input", root)
    expect(input.getAttribute("aria-label")).toBe("Filter Atlas web")
    expect(input.placeholder).toBe("Filter…")
    typeInto(input, "iss")
    expect(seen).toEqual(["iss"])
    expect(one("[data-part=sidebar-filter]", root).hasAttribute("data-active")).toBe(true)
    press(input, "Escape")
    expect(seen).toEqual(["iss", ""])
    expect(input.value).toBe("")
    expect(document.activeElement).toBe(input)
    press(input, "Escape")
    expect(document.activeElement).not.toBe(input)
    const other = one<HTMLButtonElement>("[data-part=elsewhere]", root)
    other.focus()
    press(other, "/")
    expect(document.activeElement).toBe(input)
  })

  test("collapse all runs the app's handler; minimise runs its own when given one", () => {
    const ran: string[] = []
    const { root } = track(
      mount(() => (
        <SidebarHeader onCollapseAll={() => ran.push("collapse")} onMinimise={() => ran.push("minimise")} />
      )),
    )
    click(one("[data-part=sidebar-collapse-all]", root))
    click(one("[data-part=sidebar-minimise]", root))
    expect(ran).toEqual(["collapse", "minimise"])
  })
})

describe("Nav", () => {
  test("child views sit under their parent, and the filter keeps matches with their parents, marked", () => {
    const [filter, setFilter] = createSignal("")
    const { root } = track(mount(() => <Nav label="Places" groups={GROUPS} filter={filter()} />))
    const labels = () => all("[data-part=nav-item]").map((el) => el.textContent?.replace(/\d+$/, ""))
    expect(labels()).toEqual(["Issues", "Backlog", "All issues", "Cycles", "Pull requests"])
    expect(all(".nc-nav-item--child")).toHaveLength(2)
    setFilter("back")
    flush()
    expect(labels()).toEqual(["Issues", "Backlog"])
    expect(one("[data-part=nav-match]", root).textContent).toBe("Back")
    setFilter("zzz")
    flush()
    expect(all("[data-part=nav-item]")).toHaveLength(0)
  })

  test("a parent's icon collapses and expands its children", () => {
    const [collapsed, setCollapsed] = createSignal<string[]>([])
    const { root } = track(
      mount(() => (
        <Nav
          label="Places"
          groups={[{ items: [{ ...GROUPS[0]!.items[0]!, current: false }] }]}
          collapsed={collapsed()}
          onCollapsedChange={setCollapsed}
        />
      )),
    )
    const disclose = one("[data-part=nav-disclose]", root)
    expect(disclose.getAttribute("aria-expanded")).toBe("true")
    click(disclose)
    expect(collapsed()).toEqual(["issues"])
    expect(all("[data-part=nav-item]")).toHaveLength(1)
    click(one("[data-part=nav-disclose]", root))
    expect(collapsed()).toEqual([])
    expect(all("[data-part=nav-item]")).toHaveLength(3)
  })

  test("folded, top-level items are icons named by tooltips, with a neutral dot where they count", () => {
    const { root } = track(mount(() => <Nav label="Places" groups={GROUPS} folded />))
    const nav = one("[data-part=nav]", root)
    expect(nav.hasAttribute("data-folded")).toBe(true)
    const items = all("[data-part=nav-item]")
    expect(items.map((el) => el.getAttribute("aria-label"))).toEqual(["Issues", "Cycles", "Pull requests"])
    expect(items[0]!.getAttribute("aria-current")).toBe("page")
    // Issues counts through its child, Pull requests by itself, Cycles not at all.
    expect(items.map((el) => !!el.querySelector("[data-part=nav-dot]"))).toEqual([true, false, true])
    const tips = all("[data-part=tooltip]").map((t) => t.textContent)
    expect(tips).toEqual(["Issues", "Cycles", "Pull requests"])
    expect(items[0]!.getAttribute("data-slot")).toBe("tooltip-trigger")
  })
})

describe("AccountMenu in the shell", () => {
  test("has an Appearance… item that runs its hook", async () => {
    let opened = 0
    const { root } = track(mount(() => <AccountMenu name="Mira Okonkwo" onAppearance={() => opened++} />))
    click(one("[data-part=account-menu]", root))
    await tick()
    const item = all("[role=menuitem]").find((el) => el.textContent?.includes("Appearance…"))!
    expect(item).toBeDefined()
    click(item)
    await tick()
    expect(opened).toBe(1)
  })
})

describe("ShellPanel", () => {
  function Terminal(props: { onClose?: () => void }) {
    const [tabs, setTabs] = createSignal<ShellPanelTab[]>([
      { id: "a", label: "zsh", status: "running" },
      { id: "b", label: "npm test", status: "input" },
    ])
    const [value, setValue] = createSignal("a")
    let n = 0
    return (
      <ShellPanel
        id="terminal"
        at="bottom"
        title="Terminal"
        onClose={props.onClose}
        tabs={{
          label: "Sessions",
          items: tabs(),
          value: value(),
          onChange: setValue,
          onNew: () => {
            n++
            setTabs((t) => [...t, { id: `n${n}`, label: `new ${n}` }])
            setValue(`n${n}`)
          },
          newLabel: "New session",
          onClose: (ids) => setTabs((t) => t.filter((x) => !ids.includes(x.id))),
          onRename: (id, name) => setTabs((t) => t.map((x) => (x.id === id ? { ...x, label: name } : x))),
          onReorder: (ids) => setTabs((t) => ids.map((id) => t.find((x) => x.id === id)!)),
        }}
      >
        <pre>output</pre>
      </ShellPanel>
    )
  }
  const titles = () => all("[data-part=tab-strip-tab] .nc-tabstrip__title").map((el) => el.textContent)

  test("its tabs open, close and reorder, each with its state as a dot", () => {
    const { root } = track(mount(() => <Terminal />))
    const panel = one("[data-part=shell-panel]", root)
    expect(panel.getAttribute("data-at")).toBe("bottom")
    expect(one("[data-part=shell-panel-header] h2", panel).textContent).toBe("Terminal")
    expect(titles()).toEqual(["zsh", "npm test"])
    expect(one("[data-tab=b] .nc-tabstrip__status", panel).getAttribute("data-status")).toBe("input")
    click(one("[data-part=shell-panel-new]", panel))
    expect(titles()).toEqual(["zsh", "npm test", "new 1"])
    expect(one("[data-tab=n1]", panel).hasAttribute("data-active")).toBe(true)
    // ⌘T opens another while the panel shows.
    cmd("t")
    expect(titles()).toEqual(["zsh", "npm test", "new 1", "new 2"])
    click(one("[data-tab=b] .nc-tabstrip__close", panel))
    expect(titles()).toEqual(["zsh", "new 1", "new 2"])
    // Alt+→ moves the focused tab one place on.
    press(one("[data-tab=a] [role=tab]", panel), "ArrowRight", { altKey: true })
    expect(titles()).toEqual(["new 1", "zsh", "new 2"])
  })

  test("⌃Tab cycles the tabs and the menu's Rename renames one", async () => {
    const { root } = track(mount(() => <Terminal />))
    const panel = one("[data-part=shell-panel]", root)
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", ctrlKey: true, bubbles: true }))
    flush()
    expect(one("[data-tab=b]", panel).hasAttribute("data-active")).toBe(true)
    one("[data-tab=a]", panel).dispatchEvent(new MouseEvent("dblclick", { bubbles: true }))
    flush()
    await tick()
    const form = one<HTMLFormElement>("[data-part=shell-panel-rename]")
    const input = one<HTMLInputElement>("input", form)
    expect(input.value).toBe("zsh")
    input.value = "deploy"
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
    flush()
    expect(titles()).toEqual(["deploy", "npm test"])
  })

  test("its edge resizes it from the keyboard, and Escape inside it closes it", () => {
    let closed = 0
    const { root } = track(mount(() => <Terminal onClose={() => closed++} />))
    const panel = one("[data-part=shell-panel]", root)
    const edge = one("[data-part=resize-handle]", panel)
    expect(edge.getAttribute("data-at")).toBe("top")
    expect(panel.style.getPropertyValue("--nc-panel-size")).toBe("280px")
    press(edge, "ArrowUp")
    expect(panel.style.getPropertyValue("--nc-panel-size")).toBe("288px")
    press(edge, "ArrowDown", { shiftKey: true })
    expect(panel.style.getPropertyValue("--nc-panel-size")).toBe("248px")
    press(one("pre", panel), "Escape")
    expect(closed).toBe(1)
    click(one("[data-part=shell-panel-close]", panel))
    expect(closed).toBe(2)
  })

  test("a drilled panel shows its trail in place of its name", () => {
    const { root } = track(
      mount(() => (
        <ShellPanel
          at="right"
          title="Details"
          trail={[{ label: "WEB-142", onClick: () => {} }, { label: "WEB-127" }]}
        />
      )),
    )
    const panel = one("[data-part=shell-panel]", root)
    expect(panel.getAttribute("aria-label")).toBe("Details")
    expect(one("[data-part=trail] [aria-current=location]", panel).textContent).toBe("WEB-127")
    expect(one("[data-part=resize-handle]", panel).getAttribute("data-at")).toBe("left")
  })
})

describe("ViewHeader", () => {
  test("a title and the same label as a crumb share one class of text; the last crumb can switch records", async () => {
    const picked: string[] = []
    const [record, setRecord] = createSignal<string | undefined>(undefined)
    const { root } = track(
      mount(() => (
        <ViewHeader
          title={record() ? undefined : "Issues"}
          trail={
            record()
              ? [
                  { label: "Issues", onClick: () => setRecord(undefined) },
                  {
                    label: record()!,
                    switcher: {
                      noun: "issue",
                      sections: [
                        {
                          title: "Active",
                          entries: [
                            { id: "WEB-142", label: "WEB-142", current: record() === "WEB-142" },
                            { id: "WEB-141", label: "WEB-141" },
                          ],
                        },
                      ],
                      onPick: (e) => picked.push(e.id),
                    },
                  },
                ]
              : undefined
          }
        />
      )),
    )
    const header = one("[data-part=view-header]", root)
    expect(one("[data-part=view-title]", header).textContent).toBe("Issues")
    // No leading back chevron, ever.
    expect(header.querySelector("[data-part=view-back], [data-part=view-up]")).toBeNull()
    setRecord("WEB-142")
    flush()
    expect(header.querySelector("[data-part=view-title]")).toBeNull()
    const trail = one("[data-part=trail]", header)
    expect(trail.textContent).toContain("Issues")
    const switcher = one<HTMLButtonElement>("[data-part=switcher]", trail)
    expect(switcher.getAttribute("aria-current")).toBe("location")
    click(switcher)
    await tick()
    const entry = all('[data-part="switcher-list"] [data-slot="command-item"]').find((el) =>
      el.textContent?.includes("WEB-141"),
    )!
    click(entry)
    await tick()
    expect(picked).toEqual(["WEB-141"])
  })

  test("the stepper steps through the list with ↑ and ↓ and shows N / M", () => {
    const [index, setIndex] = createSignal(0)
    const { root } = track(
      mount(() => (
        <ViewHeader
          title="WEB-142"
          stepper={{
            index: index(),
            total: 3,
            noun: "issue",
            prev: () => setIndex((i) => i - 1),
            next: () => setIndex((i) => i + 1),
          }}
          actions={[{ id: "link", label: "Copy link", icon: "link", onClick: () => {} }]}
        />
      )),
    )
    const stepper = one("[data-part=view-stepper]", root)
    const count = one("[data-part=view-step-count]", stepper)
    const prev = one<HTMLButtonElement>("[data-part=view-step-prev]", stepper)
    const next = one<HTMLButtonElement>("[data-part=view-step-next]", stepper)
    expect(count.textContent).toBe("1 / 3")
    expect(prev.getAttribute("aria-label")).toBe("Previous issue")
    expect(prev.disabled || prev.getAttribute("aria-disabled") === "true").toBe(true)
    click(next)
    expect(count.textContent).toBe("2 / 3")
    click(next)
    expect(count.textContent).toBe("3 / 3")
    expect(next.disabled || next.getAttribute("aria-disabled") === "true").toBe(true)
    click(prev)
    expect(count.textContent).toBe("2 / 3")
    // The stepper comes before the view's actions.
    const actions = one("[data-part=view-actions]", root)
    expect(actions.firstElementChild).toBe(stepper)
  })
})
