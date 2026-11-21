import { afterEach, describe, expect, test } from "bun:test"
import { flush } from "solid-js"
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
