import { afterEach, describe, expect, test } from "bun:test"
import { EntryGlyph, HoverCard, Identicon, identiconCells, ListRow, NavItem, ViewHeader } from "../src"
import { mount, one, tick } from "./dom"

let cleanup: Array<() => void> = []
afterEach(() => {
  for (const c of cleanup) c()
  cleanup = []
  document.body.innerHTML = ""
})
const track = <T extends { dispose: () => void }>(m: T): T => {
  cleanup.push(m.dispose)
  return m
}

/** Rests the pointer on an element, as a person hovering it. */
function hover(el: Element) {
  for (const type of ["pointerover", "pointerenter", "pointermove"])
    el.dispatchEvent(new PointerEvent(type, { bubbles: type !== "pointerenter", pointerType: "mouse" }))
  for (const type of ["mouseover", "mouseenter", "mousemove"])
    el.dispatchEvent(new MouseEvent(type, { bubbles: type !== "mouseenter" }))
}

describe("HoverCard", () => {
  test("wraps its element in an anchor and opens its details while the pointer rests on it", async () => {
    track(
      mount(() => (
        <HoverCard
          delay={0}
          title="Give the deploy step room"
          meta="#418 · Mira"
          rows={[{ label: "Checks", value: "2 passed" }]}
        >
          <b>#418</b>
        </HoverCard>
      )),
    )
    const anchor = one("[data-part=hover-card-anchor]")
    expect(anchor.textContent).toBe("#418")
    hover(anchor)
    await tick(6)
    await new Promise((r) => setTimeout(r, 20))
    await tick(4)
    const card = one("[data-part=hover-card]")
    expect(card.hasAttribute("data-open")).toBe(true)
    expect(card.querySelector(".nc-hover-card__title")?.textContent).toBe("Give the deploy step room")
    expect(card.querySelector("dt")?.textContent).toBe("Checks")
    expect(card.querySelector("dd")?.textContent).toBe("2 passed")
  })
})

describe("Identicon", () => {
  test("draws the same image for the same seed, mirrored left to right", () => {
    const a = identiconCells("c-arm64")
    expect(identiconCells("c-arm64")).toEqual(a)
    for (const [x, y] of a.cells) expect(a.cells.some(([mx, my]) => mx === 4 - x && my === y)).toBe(true)
    expect(identiconCells("c-other")).not.toEqual(a)
  })

  test("is decorative unless it has a label", () => {
    const { root } = track(mount(() => <Identicon seed="c-arm64" />))
    const svg = one("[data-part=identicon]", root)
    expect(svg.getAttribute("aria-hidden")).toBe("true")
    expect(svg.querySelectorAll("rect").length).toBe(identiconCells("c-arm64").cells.length)
  })
})

describe("NavItem", () => {
  test("puts a badge on its icon and wraps the icon in a hover card", () => {
    const { root } = track(
      mount(() => (
        <NavItem
          label="Give the deploy step room"
          icon="file"
          badge={() => <i data-testid="badge" />}
          hover={() => ({ title: "Give the deploy step room" })}
        />
      )),
    )
    const badge = one("[data-part=nav-item-badge]", root)
    expect(badge.querySelector("[data-testid=badge]")).not.toBeNull()
    // The icon and its badge are what the pointer rests on to see the details.
    expect(one("[data-part=hover-card-anchor]", root).contains(badge)).toBe(true)
  })
})

describe("ViewHeader", () => {
  test("keeps More actions last, after the primary action", () => {
    const { root } = track(
      mount(() => (
        <ViewHeader
          title="Chat"
          actions={[
            { id: "reset", label: "Reset", overflow: true, onClick: () => {} },
            { id: "done", label: "Done", primary: true, onClick: () => {} },
            { id: "add", label: "Add", icon: "plus", onClick: () => {} },
          ]}
        />
      )),
    )
    const more = one("[data-part=view-overflow]", root)
    const done = one("[data-action=done]", root)
    const add = one("[data-action=add]", root)
    expect(add.compareDocumentPosition(done) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(done.compareDocumentPosition(more) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe("EntryGlyph", () => {
  test("draws a record's leading element with its badge, or its status, and its hover card", async () => {
    track(
      mount(() => (
        <div>
          <EntryGlyph
            label="#418"
            leading={() => <i data-test="avatar" />}
            badge={() => <b data-test="badge" />}
          />
          <EntryGlyph label="c-1" leading={<i data-test="mark" />} status="warn" />
          <EntryGlyph label="hook" icon="webhook" hover={() => ({ title: "Deploy hook" })} />
        </div>
      )),
    )
    expect(one("[data-part=nav-item-badge] [data-test=avatar]")).toBeTruthy()
    expect(one("[data-part=nav-item-badge] [data-test=badge]")).toBeTruthy()
    expect(one("[data-part=nav-item-status]").getAttribute("data-status")).toBe("warn")
    expect(one("[data-part=hover-card-anchor]").getAttribute("aria-label")).toBe("Details of hook")
  })

  test("in a list row, a click on a glyph with a hover card still opens the row", async () => {
    let opened = 0
    track(
      mount(() => (
        <ListRow
          title="Deploy hook"
          leading={<EntryGlyph label="hook" icon="webhook" hover={() => ({ title: "Deploy hook" })} />}
          onClick={() => opened++}
        />
      )),
    )
    ;(one("[data-part=hover-card-anchor]") as HTMLElement).click()
    await tick()
    expect(opened).toBe(1)
  })
})
