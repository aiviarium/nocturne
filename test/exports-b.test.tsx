// Exported components, one block each: the root's part, then the prop or interaction that matters most.
import { afterEach, describe, expect, test } from "bun:test"
import { TextSelection } from "prosemirror-state"
import { createSignal } from "solid-js"
import {
  AI_COPY_DEFAULTS,
  type AiHandler,
  EditorServicesProvider,
  FieldEmpty,
  FieldValue,
  FilterBar,
  IdBadge,
  InfoTip,
  InsetGroup,
  InsetList,
  InsetRow,
  Kbd,
  KbdGroup,
  LabelChip,
  List,
  Nav,
  NavigationBar,
  NavigationScreen,
  NavigationStack,
  Panel,
  PhoneOverride,
  Popover,
  PullToRefresh,
  RichTextEditor,
  type RichTextEditorHandle,
  RowMenu,
  ScreenOptions,
  useEditorServices,
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

const touch = (el: Element, type: string, y: number) => {
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(e, "touches", { value: type === "touchend" ? [] : [{ clientX: 0, clientY: y }] })
  el.dispatchEvent(e)
}

const noAi: AiHandler = async function* () {}

describe("EditorServicesProvider", () => {
  test("a child reads the services it was given", () => {
    const search = async () => []
    let seen: unknown
    function Probe() {
      const s = useEditorServices()
      seen = s.searchMentions
      return <span data-part="probe">{s.aiCopy?.label}</span>
    }
    const { root } = track(
      mount(() => (
        <EditorServicesProvider value={{ searchMentions: search, aiCopy: { label: "Helper" } }}>
          <Probe />
        </EditorServicesProvider>
      )),
    )
    expect(seen).toBe(search)
    expect(one("[data-part=probe]", root).textContent).toBe("Helper")
  })

  test("without a provider the services are empty", () => {
    let seen: unknown
    function Probe() {
      seen = useEditorServices()
      return null
    }
    track(mount(() => <Probe />))
    expect(seen).toEqual({})
  })

  const openEditor = async (services: Parameters<typeof EditorServicesProvider>[0]["value"]) => {
    let handle!: RichTextEditorHandle
    const m = track(
      mount(() => (
        <EditorServicesProvider value={services}>
          <RichTextEditor
            value={{
              type: "doc",
              content: [{ type: "paragraph", content: [{ type: "text", text: "hello world" }] }],
            }}
            ref={(h) => {
              handle = h
            }}
          />
        </EditorServicesProvider>
      )),
    )
    await tick()
    return { root: m.root, handle }
  }
  const selectWord = async (handle: RichTextEditorHandle) => {
    const v = handle.view
    v.focus()
    v.dispatch(v.state.tr.setSelection(TextSelection.create(v.state.doc, 1, 6)))
    await tick()
  }
  const openSlash = async (handle: RichTextEditorHandle) => {
    const v = handle.view
    v.focus()
    v.dispatch(v.state.tr.setSelection(TextSelection.create(v.state.doc, v.state.doc.content.size - 1)))
    v.dispatch(v.state.tr.insertText(" "))
    v.dispatch(v.state.tr.insertText("/"))
    await tick()
  }

  test("an editor under it shows the writing assistant, named Assist by default", async () => {
    expect(AI_COPY_DEFAULTS.label).toBe("Assist")
    const { root, handle } = await openEditor({ ai: noAi })
    await selectWord(handle)
    expect(one("[data-part=ask-ai]", root).textContent).toBe("Assist")
    await openSlash(handle)
    const item = one("[data-part=slash-menu] [data-item=ai]", root)
    expect(item.textContent).toContain("Assist")
  })

  test("aiCopy renames the writing assistant in the format bar and the / menu", async () => {
    const { root, handle } = await openEditor({
      ai: noAi,
      aiCopy: { label: "Ghostwriter", description: "Draft it" },
    })
    await selectWord(handle)
    expect(one("[data-part=ask-ai]", root).textContent).toBe("Ghostwriter")
    await openSlash(handle)
    const item = one("[data-part=slash-menu] [data-item=ai]", root)
    expect(item.textContent).toContain("Ghostwriter")
    expect(item.textContent).toContain("Draft it")
    expect(item.textContent).not.toContain("Assist")
  })

  test("without an ai service the assistant entry is hidden", async () => {
    const { root, handle } = await openEditor({})
    await selectWord(handle)
    expect(root.querySelector("[data-part=format-bar]")).not.toBeNull()
    expect(root.querySelector("[data-part=ask-ai]")).toBeNull()
  })
})

describe("FieldEmpty", () => {
  test("draws one muted dash named Empty", () => {
    const { root } = track(mount(() => <FieldEmpty />))
    const el = one(".nc-field-empty", root)
    expect(el.getAttribute("aria-label")).toBe("Empty")
    expect(el.textContent).toBe("—")
  })
})

describe("FieldValue", () => {
  test("draws a value through its kind, and an empty one as the dash", () => {
    const [value, setValue] = createSignal<unknown>("hello@example.com")
    const { root } = track(
      mount(() => (
        <div data-part="host">
          <FieldValue spec={{ name: "mail", title: "Mail", kind: "text", format: "email" }} value={value()} />
        </div>
      )),
    )
    const link = one<HTMLAnchorElement>("a.nc-field-link", root)
    expect(link.getAttribute("href")).toBe("mailto:hello@example.com")
    setValue(null)
    expect(root.querySelector("a")).toBeNull()
    expect(one(".nc-field-empty", root).getAttribute("aria-label")).toBe("Empty")
  })
})

describe("FilterBar", () => {
  test("a named group with the search, the filters and the end slot", () => {
    const [label, setLabel] = createSignal<string | undefined>(undefined)
    const { root } = track(
      mount(() => (
        <FilterBar
          label={label()}
          search={<input data-test="search" />}
          end={<span data-test="count">3</span>}
        >
          <button type="button" data-test="filter">
            Open
          </button>
        </FilterBar>
      )),
    )
    const bar = one("[data-part=filter-bar]", root)
    expect(bar.getAttribute("role")).toBe("group")
    expect(bar.getAttribute("aria-label")).toBe("Filters")
    expect(one(".nc-filterbar__search [data-test=search]", bar)).toBeTruthy()
    expect(one(".nc-filterbar__filters [data-test=filter]", bar)).toBeTruthy()
    expect(one(".nc-filterbar__end [data-test=count]", bar).textContent).toBe("3")
    setLabel("Issue filters")
    expect(bar.getAttribute("aria-label")).toBe("Issue filters")
  })

  test("leaves out the slots it is not given", () => {
    const { root } = track(mount(() => <FilterBar />))
    const bar = one("[data-part=filter-bar]", root)
    expect(bar.querySelector(".nc-filterbar__search")).toBeNull()
    expect(bar.querySelector(".nc-filterbar__filters")).toBeNull()
    expect(bar.querySelector(".nc-filterbar__end")).toBeNull()
  })
})

describe("IdBadge", () => {
  test("shows the identifier and passes attributes through", () => {
    let clicked = 0
    const { root } = track(
      mount(() => (
        <IdBadge title="Task" class="extra" onClick={() => clicked++}>
          TSK-41
        </IdBadge>
      )),
    )
    const el = one("[data-part=id-badge]", root)
    expect(el.textContent).toBe("TSK-41")
    expect(el.getAttribute("title")).toBe("Task")
    expect(el.classList.contains("nc-id")).toBe(true)
    expect(el.classList.contains("extra")).toBe(true)
    click(el)
    expect(clicked).toBe(1)
  })
})

describe("InfoTip", () => {
  test("the button opens the explanation in a popover, Escape closes it", async () => {
    const { root } = track(mount(() => <InfoTip label="Retention">Kept for 30 days.</InfoTip>))
    const tip = one("[data-part=info-tip]", root)
    const button = one<HTMLButtonElement>("button", tip)
    expect(button.getAttribute("aria-label")).toBe("Explanation")
    expect(button.getAttribute("aria-expanded")).toBe("false")
    expect(all("[data-part=popover]")).toHaveLength(0)
    click(button)
    await tick()
    expect(button.getAttribute("aria-expanded")).toBe("true")
    const dialog = one("[data-part=popover] [role=dialog]")
    expect(dialog.getAttribute("aria-label")).toBe("Retention")
    expect(dialog.textContent).toBe("Kept for 30 days.")
    expect(button.getAttribute("aria-controls")).toBe(dialog.id)
    press(document.body, "Escape")
    await tick()
    expect(all("[data-part=popover]")).toHaveLength(0)
    expect(button.getAttribute("aria-expanded")).toBe("false")
  })

  test("on a phone it opens a sheet titled with the label", async () => {
    const { root } = track(
      mount(() => (
        <PhoneOverride.Provider value={true}>
          <InfoTip label="Retention">Kept for 30 days.</InfoTip>
        </PhoneOverride.Provider>
      )),
    )
    click(one("[data-part=info-tip] button", root))
    await tick()
    expect(all("[data-part=popover]")).toHaveLength(0)
    const sheet = one("[data-part=sheet]")
    expect(sheet.textContent).toContain("Retention")
    expect(sheet.textContent).toContain("Kept for 30 days.")
  })
})

describe("InsetList, InsetGroup and InsetRow", () => {
  test("InsetList stacks its groups", () => {
    const { root } = track(
      mount(() => (
        <InsetList class="mine">
          <InsetGroup label="One" />
          <InsetGroup label="Two" />
        </InsetList>
      )),
    )
    const list = one("[data-part=inset-list]", root)
    expect(list.classList.contains("mine")).toBe(true)
    expect(all("[data-part=inset-group]").map((g) => g.getAttribute("aria-label"))).toEqual(["One", "Two"])
  })

  test("InsetGroup shows its heading and footer only when given", () => {
    const [title, setTitle] = createSignal<string | undefined>("Account")
    const { root } = track(
      mount(() => (
        <InsetGroup title={title()} footer="Signed in as ada">
          <InsetRow label="Name" />
        </InsetGroup>
      )),
    )
    const group = one("[data-part=inset-group]", root)
    expect(one(".nc-inset-group__title", group).textContent).toBe("Account")
    expect(one(".nc-inset-group__footer", group).textContent).toBe("Signed in as ada")
    expect(one("[role=list] [data-part=inset-row]", group)).toBeTruthy()
    setTitle(undefined)
    expect(group.querySelector(".nc-inset-group__head")).toBeNull()
  })

  test("InsetRow runs onClick, shows its value, and marks a checked choice", () => {
    let clicks = 0
    const [checked, setChecked] = createSignal(false)
    const { root } = track(
      mount(() => (
        <InsetRow
          label="Theme"
          detail="Follows the system"
          value="Dark"
          checked={checked()}
          onClick={() => clicks++}
        />
      )),
    )
    const row = one("[data-part=inset-row]", root)
    expect(row.getAttribute("role")).toBe("listitem")
    expect(row.hasAttribute("data-two-line")).toBe(true)
    expect(one(".nc-inset-row__value", row).textContent).toBe("Dark")
    const main = one<HTMLButtonElement>("button.nc-inset-row__main", row)
    expect(main.getAttribute("role")).toBe("menuitemradio")
    expect(main.getAttribute("aria-checked")).toBe("false")
    click(main)
    expect(clicks).toBe(1)
    setChecked(true)
    expect(main.getAttribute("aria-checked")).toBe("true")
    expect(row.querySelector(".nc-inset-row__check")).not.toBeNull()
  })

  test("InsetRow with an href is a link with a chevron", () => {
    const { root } = track(mount(() => <InsetRow label="Profile" href="/profile" />))
    const row = one("[data-part=inset-row]", root)
    expect(one<HTMLAnchorElement>("a.nc-inset-row__main", row).getAttribute("href")).toBe("/profile")
    expect(row.querySelector(".nc-inset-row__chevron")).not.toBeNull()
  })

  test("InsetRow's context menu opens on a right click and reports the choice", async () => {
    const picked: string[] = []
    const { root } = track(
      mount(() => (
        <InsetRow
          label="Message"
          menu={[
            { id: "archive", label: "Archive" },
            { id: "delete", label: "Delete" },
          ]}
          onMenuSelect={(id) => picked.push(id)}
        />
      )),
    )
    one("[data-part=inset-row]", root).dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }),
    )
    await tick()
    const items = all("[data-part=popover] [role=menuitem]")
    expect(items.map((i) => i.textContent)).toEqual(["Archive", "Delete"])
    click(items[1]!)
    await tick()
    expect(picked).toEqual(["delete"])
    expect(all("[data-part=popover]")).toHaveLength(0)
  })
})

describe("Kbd and KbdGroup", () => {
  test("Kbd shows its keys, or its children instead", () => {
    const [keys, setKeys] = createSignal("Ctrl K")
    const { root } = track(
      mount(() => (
        <>
          <Kbd keys={keys()} data-test="a" />
          <Kbd keys="ignored" data-test="b">
            Esc
          </Kbd>
        </>
      )),
    )
    const a = one("[data-part=kbd][data-test=a]", root)
    expect(a.tagName).toBe("KBD")
    expect(a.textContent).toBe("Ctrl K")
    setKeys("Ctrl J")
    expect(a.textContent).toBe("Ctrl J")
    expect(one("[data-part=kbd][data-test=b]", root).textContent).toBe("Esc")
  })

  test("KbdGroup draws one key per entry", () => {
    const [keys, setKeys] = createSignal(["Ctrl", "K"])
    const { root } = track(mount(() => <KbdGroup keys={keys()} />))
    const group = one("[data-part=kbd-group]", root)
    expect(Array.from(group.querySelectorAll("[data-part=kbd]")).map((k) => k.textContent)).toEqual([
      "Ctrl",
      "K",
    ])
    setKeys(["Shift", "Alt", "P"])
    expect(group.querySelectorAll("[data-part=kbd]")).toHaveLength(3)
  })
})

describe("LabelChip", () => {
  test("shows its text with a dot in its hue, the accent by default", () => {
    const [hue, setHue] = createSignal<"sky" | undefined>(undefined)
    const { root } = track(mount(() => <LabelChip hue={hue()}>Backend</LabelChip>))
    const chip = one("[data-part=label-chip]", root)
    expect(chip.textContent).toBe("Backend")
    const dot = one(".nc-chip__dot", chip)
    expect(dot.getAttribute("data-hue")).toBe("accent")
    setHue("sky")
    expect(dot.getAttribute("data-hue")).toBe("sky")
  })
})

describe("List", () => {
  test("arrow keys move the active row and Enter or a click selects", () => {
    const items = ["alpha", "beta", "gamma", "delta"]
    const selected: string[] = []
    const active: number[] = []
    const { root } = track(
      mount(() => (
        <List
          items={items}
          height={300}
          label="Letters"
          onSelect={(item) => selected.push(item)}
          onActiveChange={(i) => active.push(i)}
        >
          {(item) => <span>{item}</span>}
        </List>
      )),
    )
    const list = one("[data-part=list]", root)
    expect(list.getAttribute("role")).toBe("listbox")
    expect(list.getAttribute("aria-label")).toBe("Letters")
    const options = all("[role=option]")
    expect(options.map((o) => o.textContent)).toEqual(items)
    expect(options[0]!.getAttribute("aria-selected")).toBe("true")
    press(list, "ArrowDown")
    press(list, "ArrowDown")
    expect(active).toEqual([1, 2])
    expect(list.getAttribute("aria-activedescendant")).toBe(options[2]!.id)
    press(list, "Enter")
    expect(selected).toEqual(["gamma"])
    press(list, "End")
    expect(active.at(-1)).toBe(3)
    click(options[1]!)
    expect(selected).toEqual(["gamma", "beta"])
  })
})

describe("Nav", () => {
  test("lays out groups of items, marks the current one, and clicks reach the item", () => {
    const clicked: string[] = []
    const { root } = track(
      mount(() => (
        <Nav
          label="Main"
          groups={[
            { items: [{ label: "Home", icon: "home", current: true, href: "/" }] },
            { label: "Projects", items: [{ label: "Atlas", onClick: () => clicked.push("atlas") }] },
          ]}
        />
      )),
    )
    const nav = one("[data-part=nav]", root)
    expect(nav.tagName).toBe("NAV")
    expect(nav.getAttribute("aria-label")).toBe("Main")
    expect(one(".nc-nav__label", nav).textContent).toBe("Projects")
    const items = all("[data-part=nav-item]")
    expect(items.map((i) => i.textContent)).toEqual(["Home", "Atlas"])
    expect(items[0]!.getAttribute("aria-current")).toBe("page")
    expect(items[1]!.getAttribute("aria-current")).toBeNull()
    click(items[1]!)
    expect(clicked).toEqual(["atlas"])
  })
})

describe("NavigationBar", () => {
  test("shows the title, a back control that fires, and the actions", () => {
    const calls: string[] = []
    const { root } = track(
      mount(() => (
        <NavigationBar
          title="Inbox"
          back={{ label: "Mail", onClick: () => calls.push("back") }}
          actions={[{ id: "compose", label: "Compose", icon: "plus", onClick: () => calls.push("compose") }]}
        />
      )),
    )
    const bar = one("[data-part=nav-bar]", root)
    expect(one("[data-part=nav-title]", bar).textContent).toBe("Inbox")
    const back = one("[data-part=nav-back]", bar)
    expect(back.getAttribute("aria-label")).toBe("Back to Mail")
    click(back)
    click(one("[data-action=compose]", bar))
    expect(calls).toEqual(["back", "compose"])
    expect(bar.querySelector("[data-part=nav-overflow]")).toBeNull()
  })

  test("actions past the room go into the menu", async () => {
    const calls: string[] = []
    const act = (id: string) => ({ id, label: id, icon: "star" as const, onClick: () => calls.push(id) })
    const { root } = track(
      mount(() => <NavigationBar title="Inbox" actions={[act("a"), act("b"), act("c")]} />),
    )
    const bar = one("[data-part=nav-bar]", root)
    expect(all("[data-action]").map((b) => b.getAttribute("data-action"))).toEqual(["a"])
    click(one("[data-part=nav-overflow]", bar))
    await tick()
    const items = all("[role=menuitem]")
    expect(items.map((i) => i.textContent)).toEqual(["b", "c"])
    click(items[1]!)
    await tick()
    expect(calls).toEqual(["c"])
  })
})

describe("NavigationScreen and ScreenOptions", () => {
  test("a screen shows its bar and content, and a large title when asked", () => {
    const titles: string[] = []
    const { root } = track(
      mount(() => (
        <PhoneOverride.Provider value={true}>
          <NavigationScreen title="Settings" largeTitle onTitle={(t) => titles.push(t)}>
            <p data-test="body">Body</p>
          </NavigationScreen>
        </PhoneOverride.Provider>
      )),
    )
    const screen = one("[data-part=screen]", root)
    expect(screen.getAttribute("data-level")).toBe("main")
    expect(screen.hasAttribute("data-large")).toBe(true)
    expect(one("[data-part=large-title]", screen).textContent).toBe("Settings")
    expect(one("[data-part=nav-title]", screen).hasAttribute("data-hidden")).toBe(true)
    expect(one("[data-part=screen-content] [data-test=body]", screen)).toBeTruthy()
    expect(titles).toEqual(["Settings"])
  })

  test("ScreenOptions sets the screen's title and mode from inside it", () => {
    const [mode, setMode] = createSignal<"scroll" | "full">("scroll")
    const modes: string[] = []
    const titles: string[] = []
    const { root } = track(
      mount(() => (
        <NavigationScreen title="Fallback" onTitle={(t) => titles.push(t)} onMode={(m) => modes.push(m)}>
          <ScreenOptions title="Terminal" mode={mode()} />
        </NavigationScreen>
      )),
    )
    const screen = one("[data-part=screen]", root)
    expect(one("[data-part=nav-title]", screen).textContent).toBe("Terminal")
    expect(titles.at(-1)).toBe("Terminal")
    expect(screen.getAttribute("data-mode")).toBe("scroll")
    setMode("full")
    expect(screen.getAttribute("data-mode")).toBe("full")
    expect(modes.at(-1)).toBe("full")
  })

  test("ScreenOptions outside a screen renders nothing", () => {
    const { root } = track(mount(() => <ScreenOptions title="Alone" />))
    expect(root.innerHTML).toBe("")
  })
})

describe("NavigationStack", () => {
  test("shows only the top screen; the ones under it are hidden from assistive technology", async () => {
    const [items, setItems] = createSignal([{ id: "home" }])
    const { root } = track(
      mount(() => (
        <NavigationStack items={items()} getKey={(x) => x.id} label="Stack">
          {(item) => <span data-test="screen">{item().id}</span>}
        </NavigationStack>
      )),
    )
    const stack = one("[data-part=navigation-stack]", root)
    expect(stack.getAttribute("aria-label")).toBe("Stack")
    expect(one("[data-part=stack-edge]", stack).hidden).toBe(true)
    setItems([{ id: "home" }, { id: "detail" }])
    await tick()
    const screens = all("[data-part=stack-screen]")
    expect(screens.map((s) => s.getAttribute("data-key"))).toEqual(["home", "detail"])
    expect(screens[0]!.getAttribute("data-position")).toBe("below")
    expect(screens[0]!.getAttribute("aria-hidden")).toBe("true")
    expect(screens[1]!.getAttribute("aria-hidden")).toBeNull()
    expect(one("[data-part=stack-edge]", stack).hidden).toBe(false)
  })

  test("a pop keeps the leaving screen until it has slid out", async () => {
    const [items, setItems] = createSignal([{ id: "home" }, { id: "detail" }])
    track(
      mount(() => (
        <NavigationStack items={items()} getKey={(x) => x.id}>
          {(item) => <span>{item().id}</span>}
        </NavigationStack>
      )),
    )
    setItems([{ id: "home" }])
    await tick()
    expect(one("[data-part=stack-screen][data-key=detail]").getAttribute("data-position")).toBe("leaving")
    await new Promise((r) => setTimeout(r, 320))
    expect(all("[data-part=stack-screen]").map((s) => s.getAttribute("data-key"))).toEqual(["home"])
    expect(one("[data-part=stack-screen][data-key=home]").getAttribute("data-position")).toBe("top")
  })
})

describe("Panel", () => {
  test("a header with the title and actions, the body, and the footer when given", () => {
    const [footer, setFooter] = createSignal<string | undefined>(undefined)
    const { root } = track(
      mount(() => (
        <Panel title="Runs" actions={<button type="button">Refresh</button>} footer={footer()} flush fill>
          <p>rows</p>
        </Panel>
      )),
    )
    const panel = one("[data-part=panel]", root)
    expect(panel.hasAttribute("data-fill")).toBe(true)
    expect(one(".nc-panel-title", panel).textContent).toBe("Runs")
    expect(one("[data-part=panel-header] button", panel).textContent).toBe("Refresh")
    const body = one("[data-part=panel-body]", panel)
    expect(body.textContent).toBe("rows")
    expect(body.classList.contains("nc-panel__body--flush")).toBe(true)
    expect(panel.querySelector("[data-part=panel-footer]")).toBeNull()
    setFooter("3 of 10")
    expect(one("[data-part=panel-footer]", panel).textContent).toBe("3 of 10")
  })

  test("header replaces the title", () => {
    const { root } = track(mount(() => <Panel title="Gone" header={<span data-test="tabs">Tabs</span>} />))
    const header = one("[data-part=panel-header]", root)
    expect(header.querySelector(".nc-panel-title")).toBeNull()
    expect(one("[data-test=tabs]", header).textContent).toBe("Tabs")
  })
})

describe("Popover", () => {
  test("opens in the themed root and closes on Escape or a press outside, not on its anchor", async () => {
    const closes: string[] = []
    const [open, setOpen] = createSignal(false)
    let anchor!: HTMLButtonElement
    const { root } = track(
      mount(() => (
        <>
          <button type="button" ref={anchor}>
            Anchor
          </button>
          <Popover open={open()} anchor={anchor} onClose={() => closes.push("close")} class="mine">
            <p>Inside</p>
          </Popover>
        </>
      )),
    )
    expect(all("[data-part=popover]")).toHaveLength(0)
    setOpen(true)
    await tick()
    const pop = one("[data-part=popover]")
    expect(root.contains(pop)).toBe(true)
    expect(pop.classList.contains("nc-popover")).toBe(true)
    expect(pop.classList.contains("mine")).toBe(true)
    expect(pop.textContent).toBe("Inside")
    pop.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))
    anchor.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))
    expect(closes).toEqual([])
    press(document.body, "Escape")
    expect(closes).toEqual(["close"])
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))
    expect(closes).toEqual(["close", "close"])
    setOpen(false)
    expect(all("[data-part=popover]")).toHaveLength(0)
  })
})

describe("PullToRefresh", () => {
  test("a long pull from the top refreshes; a short one does not", async () => {
    let refreshes = 0
    let finish!: () => void
    const { root } = track(
      mount(() => (
        <PullToRefresh
          label="Inbox"
          onRefresh={() => {
            refreshes++
            return new Promise<void>((r) => {
              finish = r
            })
          }}
        >
          <p>rows</p>
        </PullToRefresh>
      )),
    )
    const el = one("[data-part=pull-to-refresh]", root)
    expect(el.getAttribute("aria-label")).toBe("Inbox")
    expect(el.querySelector("[data-part=refresh]")).toBeNull()

    touch(el, "touchstart", 0)
    touch(el, "touchmove", 20)
    expect(one("[data-part=refresh] [role=status]", el).getAttribute("aria-label")).toBe("Pull to refresh")
    touch(el, "touchend", 20)
    await tick()
    expect(refreshes).toBe(0)
    expect(el.querySelector("[data-part=refresh]")).toBeNull()

    touch(el, "touchstart", 0)
    touch(el, "touchmove", 400)
    touch(el, "touchend", 400)
    await tick()
    expect(refreshes).toBe(1)
    expect(one("[data-part=refresh] [role=status]", el).getAttribute("aria-label")).toBe("Refreshing")
    finish()
    await tick()
    expect(el.querySelector("[data-part=refresh]")).toBeNull()
  })
})

describe("RowMenu", () => {
  test("opens a menu in the theme of the row it came from and reports the choice", async () => {
    const picked: string[] = []
    let closed = 0
    const themed = document.createElement("div")
    themed.setAttribute("data-theme", "light")
    const row = document.createElement("div")
    themed.append(row)
    document.body.append(themed)
    track(
      mount(() => (
        <RowMenu
          at={{ x: 20, y: 30 }}
          phone={false}
          origin={row}
          label="Row actions"
          items={[
            { id: "open", label: "Open" },
            { id: "delete", label: "Delete", danger: true },
          ]}
          onClose={() => closed++}
          onSelect={(id) => picked.push(id)}
        />
      )),
    )
    await tick()
    const menu = one("[data-part=popover] [data-part=menu]")
    expect(themed.contains(menu)).toBe(true)
    expect(menu.getAttribute("aria-label")).toBe("Row actions")
    const items = all("[role=menuitem]")
    expect(items.map((i) => i.textContent)).toEqual(["Open", "Delete"])
    click(items[0]!)
    expect(picked).toEqual(["open"])
    press(document.body, "Escape")
    expect(closed).toBeGreaterThan(0)
  })

  test("on a phone it is a sheet", async () => {
    track(
      mount(() => (
        <RowMenu
          at={{ x: 0, y: 0 }}
          phone
          label="Row actions"
          items={[{ id: "open", label: "Open" }]}
          onClose={() => {}}
          onSelect={() => {}}
        />
      )),
    )
    await tick()
    expect(all("[data-part=popover]")).toHaveLength(0)
    expect(one("[data-part=sheet] [data-part=menu]").textContent).toContain("Open")
  })
})
