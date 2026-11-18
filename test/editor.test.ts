import { describe, expect, test } from "bun:test"
import {
  CHIP,
  type ComposerChip,
  type ComposerValue,
  cleanPlainText,
  createHistory,
  flatOffset,
  flatText,
  isBlank,
  isCanonical,
  keepOutOfChips,
  locate,
  normalizeSegments,
  readSegments,
  renderChip,
  renderSegments,
  replaceFlat,
  sameSegments,
  segmentsToText,
  selectFlat,
  selectionFlat,
} from "../src/lib/editor"

const chip = (trigger: "/" | "@" | "$", id: string, label: string): ComposerValue[number] => ({
  type: "chip",
  trigger,
  id,
  label,
})
const text = (value: string): ComposerValue[number] => ({ type: "text", text: value })

function editor(value: ComposerValue = []): HTMLDivElement {
  const el = document.createElement("div")
  el.setAttribute("contenteditable", "true")
  document.body.append(el)
  renderSegments(el, value)
  return el
}

describe("segments", () => {
  test("adjacent text is merged and empty text dropped", () => {
    expect(
      normalizeSegments([text("a"), text(""), text("b"), chip("/", "x", "x"), text(""), text("c")]),
    ).toEqual([text("ab"), chip("/", "x", "x"), text("c")])
  })
  test("plain text reads a chip as its trigger and name; blank means no chip and only whitespace", () => {
    expect(segmentsToText([chip("/", "r", "review"), text(" now "), chip("@", "f", "a.ts")])).toBe(
      "/review now @a.ts",
    )
    expect(isBlank([text("  \n ")])).toBe(true)
    expect(isBlank([])).toBe(true)
    expect(isBlank([chip("$", "s", "s")])).toBe(false)
    expect(sameSegments([text("a")], [text("a")])).toBe(true)
    expect(sameSegments([chip("@", "1", "a")], [chip("@", "2", "a")])).toBe(false)
  })
  test("cleanPlainText normalises line breaks and drops control characters", () => {
    expect(cleanPlainText("a\r\nb\rc\u0000d​e")).toBe("a\nb\ncde")
  })
})

describe("reading the DOM", () => {
  test("a rendered value reads back unchanged", () => {
    const value = [
      text("see "),
      chip("@", "f1", "useTasks.ts"),
      text(" and\nmore"),
      chip("$", "rn", "release-notes"),
    ]
    expect(readSegments(editor(value))).toEqual(value)
  })
  test("what the browser may add: wrapper divs become line breaks, zero-width spaces go, a <br> is nothing", () => {
    const el = editor()
    el.innerHTML = "one<br>two<div>three</div><div>four\u200B</div>"
    expect(readSegments(el)).toEqual([text("onetwo\nthree\nfour")])
    expect(flatText(el)).toBe("onetwo\nthree\nfour")
  })
  test("a field is canonical with text, chips and the one trailing break, and not otherwise", () => {
    const el = editor([text("a"), chip("/", "r", "r")])
    expect(isCanonical(el)).toBe(true)
    el.append(document.createElement("div"))
    expect(isCanonical(el)).toBe(false)
    renderSegments(el, [text("a")])
    expect((el.lastChild as HTMLElement).tagName).toBe("BR")
    el.querySelector("br")?.remove()
    expect(isCanonical(el)).toBe(false)
  })
})

describe("flat positions", () => {
  const value = [text("ab"), chip("@", "f", "x.ts"), text("cd")]
  test("flatText marks a chip with one character", () => {
    expect(flatText(editor(value))).toBe(`ab${CHIP}cd`)
  })
  test("locate and flatOffset are inverse for every position", () => {
    const el = editor(value)
    for (let at = 0; at <= 5; at++) {
      const where = locate(el, at)
      expect(flatOffset(el, where.node, where.offset)).toBe(at)
    }
  })
  test("a position next to a chip is a text position when there is text beside it", () => {
    const el = editor(value)
    expect(locate(el, 2).node.nodeType).toBe(3)
    expect(locate(el, 3).node.nodeType).toBe(3)
  })
  test("a chip at the very start or end is addressed through its parent", () => {
    const el = editor([chip("/", "r", "review")])
    const start = locate(el, 0)
    const end = locate(el, 1)
    // Before the chip, and after it but before the placeholder break.
    expect([start.node === el, start.offset, end.node === el, end.offset]).toEqual([true, 0, true, 1])
  })
  test("selectFlat and selectionFlat agree", () => {
    const el = editor(value)
    el.focus()
    selectFlat(el, 1, 4)
    expect(selectionFlat(el)).toEqual({ start: 1, end: 4 })
  })
})

describe("editing", () => {
  test("replaceFlat swaps a range for nodes and puts the caret after them", () => {
    const el = editor([text("hello world")])
    el.focus()
    const caret = replaceFlat(el, 6, 11, [document.createTextNode("there")])
    expect(readSegments(el)).toEqual([text("hello there")])
    expect(caret).toBe(11)
    expect(selectionFlat(el)).toEqual({ start: 11, end: 11 })
  })
  test("the caret after a replacement is counted from what was inserted, not from the merged text nodes", () => {
    // The inserted space merges with the text after it and becomes that node; its length must not count.
    const el = editor([text("@use alpha alpha")])
    el.focus()
    const caret = replaceFlat(el, 0, 4, [
      renderChip(chip("@", "f", "x.ts") as ComposerChip),
      document.createTextNode(" "),
    ])
    expect(caret).toBe(2)
    expect(selectionFlat(el)).toEqual({ start: 2, end: 2 })
    expect(readSegments(el)).toEqual([chip("@", "f", "x.ts"), text("  alpha alpha")])
  })
  test("removing a chip leaves the text on both sides joined", () => {
    const el = editor([text("a"), chip("@", "f", "x"), text("b")])
    el.focus()
    replaceFlat(el, 1, 2, [])
    expect(readSegments(el)).toEqual([text("ab")])
    expect(el.childNodes).toHaveLength(2)
  })
  test("a selection that ends inside a chip moves out of it, to the side it was nearer from", () => {
    const el = editor([text("ab"), chip("@", "f", "x.ts"), text("cd")])
    el.focus()
    const inner = (el.querySelector("[data-chip]") as HTMLElement).lastChild as Text
    const range = document.createRange()
    range.setStart(el.firstChild as Text, 1)
    range.setEnd(inner, 2)
    const sel = window.getSelection() as Selection
    sel.removeAllRanges()
    sel.addRange(range)
    expect(keepOutOfChips(el)).toBe(true)
    expect(selectionFlat(el)).toEqual({ start: 1, end: 3 })
    expect(keepOutOfChips(el)).toBe(false)
  })
})

describe("history", () => {
  const entry = (s: string) => ({ value: [text(s)], caret: s.length })
  test("typing in a burst is one step; a pause or a different kind of edit starts a new one", () => {
    const h = createHistory(entry(""))
    h.record(entry("a"), true, 1000)
    h.record(entry("ab"), true, 1200)
    h.record(entry("abc"), true, 1300)
    h.record(entry("abc!"), false, 1400)
    expect(h.undo()?.value).toEqual([text("abc")])
    expect(h.undo()?.value).toEqual([text("")])
    expect(h.undo()).toBeUndefined()
    expect(h.redo()?.value).toEqual([text("abc")])
  })
  test("typing after undo forgets the redo steps", () => {
    const h = createHistory(entry(""))
    h.record(entry("a"), false)
    h.undo()
    h.record(entry("b"), false)
    expect(h.redo()).toBeUndefined()
  })
  test("a long pause starts a new typing step", () => {
    const h = createHistory(entry(""))
    h.record(entry("a"), true, 1000)
    h.record(entry("ab"), true, 5000)
    expect(h.undo()?.value).toEqual([text("a")])
  })
})
