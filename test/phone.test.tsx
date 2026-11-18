// The phone pieces that are not gestures: which actions a navigation bar shows, the tab bar's taps and badges.
import { afterEach, describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { type BarAction, splitBarActions } from "../src/components/NavigationBar"
import { TabBar } from "../src/components/TabBar"
import { all, click, mount, one } from "./dom"

const a = (id: string, extra: Partial<BarAction> = {}): BarAction => ({
  id,
  label: id,
  icon: "star",
  onClick: () => {},
  ...extra,
})

describe("the navigation bar's actions", () => {
  test("two fit; with more, one slot goes to the menu", () => {
    expect(splitBarActions([a("x"), a("y")]).shown.map((x) => x.id)).toEqual(["x", "y"])
    const s = splitBarActions([a("x"), a("y"), a("z")])
    expect(s.shown.map((x) => x.id)).toEqual(["x"])
    expect(s.menu.map((x) => x.id)).toEqual(["y", "z"])
  })
  test("the primary action is kept and sits last, under the thumb", () => {
    const s = splitBarActions([a("x"), a("y"), a("go", { primary: true })])
    expect(s.shown.map((x) => x.id)).toEqual(["go"])
    expect(splitBarActions([a("go", { primary: true }), a("x")]).shown.map((x) => x.id)).toEqual(["x", "go"])
  })
  test("a lower rank wins a slot; overflow-only actions are always in the menu", () => {
    const s = splitBarActions([a("x"), a("y"), a("panel", { rank: 1 }), a("pin", { overflow: true })])
    expect(s.shown.map((x) => x.id)).toEqual(["panel"])
    expect(s.menu.map((x) => x.id)).toEqual(["x", "y", "pin"])
  })
})

describe("TabBar", () => {
  let dispose = () => {}
  afterEach(() => {
    dispose()
    document.body.innerHTML = ""
  })
  test("a tap selects, a tap on the active tab reselects, badges show and 0 does not", () => {
    const picked: string[] = []
    ;({ dispose } = mount(() => (
      <TabBar
        active="home"
        items={[
          { id: "home", label: "Home", icon: "home" },
          { id: "inbox", label: "Inbox", icon: "inbox", badge: 3 },
          { id: "more", label: "More", icon: "more", badge: 0 },
        ]}
        onSelect={(id) => picked.push(`select:${id}`)}
        onReselect={(id) => picked.push(`reselect:${id}`)}
      />
    )))
    const tabs = all("[data-tab]")
    expect(tabs.map((t) => t.getAttribute("aria-current"))).toEqual(["page", null, null])
    expect(all("[data-part=tab-badge]").map((b) => b.textContent)).toEqual(["3"])
    click(one("[data-tab=inbox]"))
    click(one("[data-tab=home]"))
    expect(picked).toEqual(["select:inbox", "reselect:home"])
  })
})

describe("the phone's hit areas", () => {
  const css = (name: string) => readFileSync(join(import.meta.dir, "../src/styles", name), "utf8")
  /** The `.nc-x::after` / `.nc-x::before` boxes the selectors of the rules matching `test` take. */
  const pseudos = (source: string, test: (body: string) => boolean): Set<string> => {
    const out = new Set<string>()
    for (const m of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!test(m[2]!)) continue
      for (const p of m[1]!.matchAll(/(\.nc-[\w-]+)::(after|before)/g)) out.add(`${p[1]}::${p[2]}`)
    }
    return out
  }
  test("never take a pseudo-element a control draws with (a switch's knob is its ::after)", () => {
    const drawn = pseudos(css("bundle.css") + css("extra.css"), (body) => /content:/.test(body))
    const hit = pseudos(css("phone.css"), (body) => body.includes("var(--phone-hit) / 2"))
    expect(hit.size).toBeGreaterThan(0)
    expect([...hit].filter((p) => drawn.has(p))).toEqual([])
    expect(hit.has(".nc-switch::before")).toBe(true)
  })
})

describe("the phone stylesheet", () => {
  const css = (name: string) => readFileSync(join(import.meta.dir, "../src/styles", name), "utf8")
  /** Classes a stylesheet gives a rule of its own to, as the first class of a selector. */
  const roots = (source: string) =>
    new Set([...source.matchAll(/(?:^|[},\n])\s*(\.nc-[\w-]+)(?=[\s{,:[])/g)].map((m) => m[1]!))
  test("does not restyle the generic layout classes (a NavigationStack was .nc-stack and clipped every stack)", () => {
    const generic = [".nc-stack", ".nc-row", ".nc-col", ".nc-grid"]
    const phone = [...roots(css("phone.css"))]
    for (const g of generic) expect(phone.filter((c) => c === g)).toEqual([])
  })
})
