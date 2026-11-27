import { afterEach, describe, expect, test } from "bun:test"
import { createSignal, flush } from "solid-js"
import { Nav, NavItem, Select, TextArea, TextField } from "../src"
import { click, mount, one } from "./dom"

let cleanup: Array<() => void> = []
const track = <T extends { dispose: () => void }>(m: T): T => {
  cleanup.push(m.dispose)
  return m
}
afterEach(() => {
  for (const dispose of cleanup) dispose()
  cleanup = []
})

describe("sidebar levels", () => {
  test("a drill row ends in a chevron, and a plain row has none", () => {
    const { root } = track(
      mount(() => (
        <>
          <NavItem label="Atlas" href="/spaces/atlas" drill />
          <NavItem label="Home" href="/" />
        </>
      )),
    )
    const rows = Array.from(root.querySelectorAll("[data-part=nav-item]"))
    expect(rows[0]?.querySelector(".nc-nav-item__drill")).not.toBeNull()
    expect(rows[1]?.querySelector(".nc-nav-item__drill")).toBeNull()
  })

  test("a group's action sits beside its heading and runs on a click", () => {
    let added = 0
    const { root } = track(
      mount(() => (
        <Nav
          label="Places"
          groups={[
            { items: [{ label: "Home", href: "/" }] },
            {
              label: "Spaces",
              action: { label: "New space", icon: "plus", onClick: () => added++ },
              items: [],
            },
          ]}
        />
      )),
    )
    const head = one(".nc-nav__head", root)
    expect(head.textContent).toContain("Spaces")
    expect(head.hasAttribute("data-empty")).toBe(true)
    click(one("button[aria-label='New space']", head))
    flush()
    expect(added).toBe(1)
  })
})

describe("field info", () => {
  test("a field's explanation is behind an InfoTip beside its label, not text under it", () => {
    const { root } = track(
      mount(() => (
        <>
          <TextField label="Name" info="The name people see." />
          <TextArea label="Notes" info="Kept with the item." />
          <Select label="Kind" info="What it holds." options={[{ value: "a", label: "A" }]} />
        </>
      )),
    )
    for (const part of ["text-field", "text-area"]) {
      const field = one(`[data-part=${part}]`, root)
      expect(field.querySelector("[data-part=info-tip]")).not.toBeNull()
      expect(field.querySelector(".nc-field__help")).toBeNull()
    }
    expect(root.querySelectorAll("[data-part=info-tip]").length).toBe(3)
    expect(root.textContent).not.toContain("The name people see.")
  })
})

describe("Nav group headings", () => {
  test("a heading takes a small icon, and a collapsible one folds its group, kept in collapsed", () => {
    const [collapsed, setCollapsed] = createSignal<string[]>([])
    const opened: string[] = []
    const { root } = track(
      mount(() => (
        <Nav
          label="Host"
          collapsed={collapsed()}
          onCollapsedChange={setCollapsed}
          groups={[
            {
              id: "sessions",
              label: "Sessions",
              icon: "terminal",
              collapsible: true,
              action: { label: "Open Sessions", icon: "arrow-right", onClick: () => opened.push("sessions") },
              items: [
                { id: "s1", label: "build", onClick: () => {} },
                { id: "s2", label: "shell", onClick: () => {} },
              ],
            },
          ]}
        />
      )),
    )
    const head = one(".nc-nav__head", root)
    expect(head.querySelector(".nc-nav__label .nc-icon")).not.toBeNull()
    expect(root.querySelectorAll("[data-part=nav-item]").length).toBe(2)
    click(one("[aria-label='Open Sessions']", root))
    expect(opened).toEqual(["sessions"])
    click(one("[data-part=nav-group-fold]", root))
    flush()
    expect(collapsed()).toEqual(["sessions"])
    expect(root.querySelectorAll("[data-part=nav-item]").length).toBe(0)
    expect(one("[data-part=nav-group-fold]", root).getAttribute("aria-expanded")).toBe("false")
    click(one("[data-part=nav-group-fold]", root))
    flush()
    expect(root.querySelectorAll("[data-part=nav-item]").length).toBe(2)
  })
})

test("a heading that is its place opens it, shows its count and is marked on its page", () => {
  const opened: string[] = []
  const { root } = track(
    mount(() => (
      <Nav
        label="Host"
        groups={[
          {
            label: "Sessions",
            icon: "terminal",
            count: 3,
            current: true,
            onClick: () => opened.push("sessions"),
            items: [{ id: "s1", label: "build", onClick: () => {} }],
          },
        ]}
      />
    )),
  )
  const link = one("[data-part=nav-group-link]", root)
  expect(link.getAttribute("aria-current")).toBe("page")
  expect(link.querySelector(".nc-nav__count")?.textContent).toBe("3")
  click(link)
  expect(opened).toEqual(["sessions"])
})

test("folded, a section that is its place is one icon: hover shows its entries in a flyout, the chevron lists them", async () => {
  const opened: string[] = []
  const { root } = track(
    mount(() => (
      <Nav
        label="Host"
        folded
        groups={[
          { items: [{ id: "overview", label: "Overview", icon: "activity", onClick: () => {} }] },
          {
            label: "Sessions",
            icon: "terminal",
            count: 2,
            onClick: () => opened.push("sessions"),
            items: [
              { id: "s1", label: "build", icon: "terminal", onClick: () => opened.push("s1") },
              { id: "s2", label: "shell", icon: "terminal", onClick: () => {} },
            ],
          },
        ]}
      />
    )),
  )
  const group = one("[data-part=nav-rail-group]", root)
  const icon = group.querySelector("[data-part=nav-item]") as HTMLElement
  // One icon for the section, none for its entries until asked.
  expect(root.querySelectorAll("[data-part=nav-item]").length).toBe(2)
  click(icon)
  expect(opened).toEqual(["sessions"])
  icon.dispatchEvent(new MouseEvent("mouseenter"))
  await new Promise((r) => setTimeout(r, 200))
  flush()
  const flyout = one("[data-part=nav-flyout]")
  expect(flyout.textContent).toContain("build")
  click(flyout.querySelector("[data-part=nav-item]") as HTMLElement)
  expect(opened).toEqual(["sessions", "s1"])
  click(one("[data-part=nav-rail-expand]", root))
  flush()
  expect(group.querySelectorAll("[data-part=nav-item]").length).toBe(3)
})

test("a group's footer shows under its items, and stays when the group is folded", () => {
  const [collapsed, setCollapsed] = createSignal<string[]>([])
  const { root } = track(
    mount(() => (
      <Nav
        label="Host"
        collapsed={collapsed()}
        onCollapsedChange={setCollapsed}
        groups={[
          {
            id: "sessions",
            label: "Sessions",
            collapsible: true,
            footer: <button type="button">New session</button>,
            items: [{ id: "s1", label: "build", onClick: () => {} }],
          },
        ]}
      />
    )),
  )
  expect(one("[data-part=nav-group-foot]", root).textContent).toBe("New session")
  click(one("[data-part=nav-group-fold]", root))
  flush()
  expect(root.querySelectorAll("[data-part=nav-item]").length).toBe(0)
  expect(one("[data-part=nav-group-foot]", root).textContent).toBe("New session")
})

test("a heading's action can be marked current, such as a section's list open in the view", () => {
  const { root } = track(
    mount(() => (
      <Nav
        label="Host"
        groups={[
          {
            label: "Sessions",
            action: { label: "Open Sessions", icon: "arrow-up-right", onClick: () => {}, current: true },
            items: [{ id: "s1", label: "build", onClick: () => {} }],
          },
        ]}
      />
    )),
  )
  expect(one("[aria-label='Open Sessions']", root).getAttribute("aria-current")).toBe("page")
})

test("a heading's actions show in its header, and in the folded rail's flyout", async () => {
  const made: string[] = []
  const groups = [
    {
      label: "Sessions",
      icon: "terminal" as const,
      onClick: () => {},
      actions: [
        { label: "New session", icon: "plus" as const, onClick: () => made.push("new") },
        { label: "Open Sessions", icon: "arrow-up-right" as const, onClick: () => made.push("open") },
      ],
      items: [{ id: "s1", label: "build", icon: "terminal" as const, onClick: () => {} }],
    },
  ]
  const open = track(mount(() => <Nav label="Host" groups={groups} />))
  click(one("[aria-label='New session']", open.root))
  expect(made).toEqual(["new"])
  const folded = track(mount(() => <Nav label="Host" folded groups={groups} />))
  const icon = one("[data-part=nav-rail-group] [data-part=nav-item]", folded.root)
  icon.dispatchEvent(new MouseEvent("mouseenter"))
  await new Promise((r) => setTimeout(r, 200))
  flush()
  click(one("[data-part=nav-flyout] [aria-label='Open Sessions']"))
  expect(made).toEqual(["new", "open"])
})
