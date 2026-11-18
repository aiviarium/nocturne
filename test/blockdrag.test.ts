// Moving blocks: the drop target for a pointer (gaps and nesting levels, against a fake layout), the move itself
// (conversions into and out of lists, emptied containers, joins, the caret) and the keyboard moves.
import { describe, expect, test } from "bun:test"
import type { Node as PMNode } from "prosemirror-model"
import { EditorState, NodeSelection, TextSelection } from "prosemirror-state"
import {
  type BlockGeometry,
  blockAt,
  dropTarget,
  gapAt,
  indentBlock,
  lineGaps,
  moveBlock,
  moveBlocks,
  NEST_STEP,
  outdentBlock,
  type Rect,
  unitsAt,
} from "../src/editor/blockdrag"
import { docFromJSON, type RichTextJSON, richTextSchema as schema } from "../src/editor/schema"

const p = (text: string): RichTextJSON => ({
  type: "paragraph",
  content: text ? [{ type: "text", text }] : [],
})
const code = (text: string): RichTextJSON => ({ type: "code_block", content: [{ type: "text", text }] })
const callout = (...content: RichTextJSON[]): RichTextJSON => ({ type: "callout", content })
const quote = (...content: RichTextJSON[]): RichTextJSON => ({ type: "blockquote", content })
const li = (text: string, ...rest: RichTextJSON[]): RichTextJSON => ({
  type: "list_item",
  content: [p(text), ...rest],
})
const ul = (...items: RichTextJSON[]): RichTextJSON => ({ type: "bullet_list", content: items })
const task = (text: string): RichTextJSON => ({
  type: "task_item",
  attrs: { checked: false },
  content: [p(text)],
})
const tasks = (...items: RichTextJSON[]): RichTextJSON => ({ type: "task_list", content: items })
const doc = (...content: RichTextJSON[]) => docFromJSON({ type: "doc", content })

const state = (d: PMNode, cursor?: number) => {
  const s = EditorState.create({ schema, doc: d })
  return cursor == null ? s : s.apply(s.tr.setSelection(TextSelection.create(s.doc, cursor)))
}

/** Where the node whose text starts with `text` starts (its first textblock's block, or the block itself). */
function posOf(d: PMNode, text: string, type?: string): number {
  let found = -1
  d.descendants((n, pos) => {
    if (found >= 0) return false
    if ((!type || n.type.name === type) && n.textContent.startsWith(text) && (type || n.isTextblock))
      found = pos
    return true
  })
  if (found < 0) throw new Error(`no ${type ?? "block"} "${text}"`)
  return found
}
const range = (d: PMNode, text: string, type?: string) => {
  const from = posOf(d, text, type)
  return { from, to: from + d.nodeAt(from)!.nodeSize }
}

/**
 * A fake layout: leaves are 20px tall with 4px between them, containers pad 4px; the document's content starts at
 * x 40 and every container nests its children 20px further in (a list item's first line sits at the item's edge).
 */
function layout(d: PMNode): BlockGeometry {
  const rects = new Map<number, Rect>()
  let y = 0
  const walk = (node: PMNode, start: number, left: number) => {
    node.forEach((c, off) => {
      const pos = start + off
      const top = y
      if (c.isTextblock || c.isAtom || c.type.name === "table") y += 20
      else {
        y += 4
        const inner = c.type.name === "list_item" || c.type.name === "task_item" ? left : left + 20
        walk(c, pos + 1, inner)
        y += 4
      }
      rects.set(pos, { left, right: 600, top, bottom: y })
      y += 4
    })
  }
  walk(d, 0, 40)
  return (pos) => rects.get(pos) ?? null
}
const mid = (r: Rect | null) => (r!.top + r!.bottom) / 2

describe("drop targets", () => {
  const d = doc(p("intro"), callout(code("ls"), p("inside")), p("after"), ul(li("one"), li("two")), p("end"))
  const g = layout(d)
  const C = posOf(d, "ls", "callout")
  const src = range(d, "end")

  test("the pointer's height picks the line between blocks, at the deepest level", () => {
    const code = posOf(d, "ls", "code_block")
    expect(gapAt(d, g, g(code)!.top + 2)).toBe(code)
    expect(gapAt(d, g, g(code)!.bottom - 2)).toBe(code + d.nodeAt(code)!.nodeSize)
    expect(gapAt(d, g, -50)).toBe(0)
    expect(gapAt(d, g, 10_000)).toBe(d.content.size)
    // A list item's first line: above its middle is before the item, below it under the item.
    const two = posOf(d, "two", "list_item")
    expect(gapAt(d, g, g(two + 1)!.top + 2)).toBe(two)
    expect(gapAt(d, g, g(two + 1)!.bottom - 2)).toBe(two + d.nodeAt(two)!.nodeSize - 1)
  })

  test("the end of a callout and the gap after it are one line; x picks the level", () => {
    const end = C + d.nodeAt(C)!.nodeSize - 1
    expect(lineGaps(d, end).sort()).toEqual([end, end + 1].sort())
    const inside = posOf(d, "inside")
    const y = g(inside)!.bottom - 2
    // Straight down from the top level stays at the top level: after the callout.
    expect(dropTarget(d, g, src, 40, y)!.pos).toBe(end + 1)
    expect(dropTarget(d, g, src, 40, y)!.left).toBe(40)
    // Indented: into the callout, at its end, drawn at the callout's content edge.
    const into = dropTarget(d, g, src, 62, y)!
    expect(into.pos).toBe(end)
    expect(into.left).toBe(60)
  })

  test("the start of a container is the line before it; a gap inside is one level", () => {
    const code = posOf(d, "ls", "code_block")
    expect(lineGaps(d, code).sort()).toEqual([C, code].sort())
    const between = posOf(d, "inside")
    expect(lineGaps(d, between)).toEqual([between])
    expect(dropTarget(d, g, src, 0, mid(g(between)) - 3)!.pos).toBe(between)
  })

  test("dropping into a list makes an item; under an item, a nested list one step in", () => {
    const two = posOf(d, "two", "list_item")
    const t = dropTarget(d, g, src, 60, g(two + 1)!.top + 2)!
    expect(t.pos).toBe(two)
    expect(t.left).toBe(60)
    const under = dropTarget(d, g, src, 60 + NEST_STEP, g(two + 1)!.bottom - 2)!
    expect(under.pos).toBe(two + d.nodeAt(two)!.nodeSize - 1)
    expect(under.left).toBe(60 + NEST_STEP)
    // A code block cannot be an item: between items there is no place for it, but under an item there is.
    const codeSrc = range(d, "ls", "code_block")
    expect(dropTarget(d, g, codeSrc, 60, g(two + 1)!.top + 2)?.pos).not.toBe(two)
  })

  test("nothing lands inside what is dragged", () => {
    const whole = range(d, "ls", "callout")
    const t = dropTarget(d, g, whole, 60, mid(g(posOf(d, "inside"))))
    expect(t == null || t.pos <= whole.from || t.pos >= whole.to).toBe(true)
  })

  test("the handle shows for the innermost block whose gutter reaches the pointer", () => {
    const inside = posOf(d, "inside")
    const y = mid(g(inside))
    expect(blockAt(d, g, 300, y, 44)).toBe(inside)
    expect(blockAt(d, g, 60 - 30, y, 44)).toBe(inside)
    expect(blockAt(d, g, 10, y, 44)).toBe(C)
    const two = posOf(d, "two", "list_item")
    expect(blockAt(d, g, 300, mid(g(two))!, 44)).toBe(two)
  })
})

const names = (d: PMNode) => {
  const out: string[] = []
  d.forEach((n) => {
    out.push(`${n.type.name}${n.isTextblock ? `:${n.textContent}` : `[${names(n).join(",")}]`}`)
  })
  return out
}

describe("moving blocks", () => {
  test("out of a callout, after it, and back in between its blocks: one transaction each", () => {
    let s = state(doc(callout(code("ls"), p("inside")), p("after")))
    const C = 0
    const end = s.doc.nodeAt(C)!.nodeSize
    let tr = moveBlocks(s, range(s.doc, "ls", "code_block"), end)!
    s = s.apply(tr)
    expect(names(s.doc)).toEqual(["callout[paragraph:inside]", "code_block:ls", "paragraph:after"])
    tr = moveBlocks(s, range(s.doc, "after"), 1)!
    s = s.apply(tr)
    expect(names(s.doc)).toEqual(["callout[paragraph:after,paragraph:inside]", "code_block:ls"])
  })

  test("a callout emptied by a move keeps an empty paragraph; a quote goes", () => {
    let s = state(doc(callout(p("only")), quote(p("q")), p("end")))
    s = s.apply(moveBlocks(s, range(s.doc, "only"), s.doc.content.size)!)
    expect(names(s.doc)).toEqual([
      "callout[paragraph:]",
      "blockquote[paragraph:q]",
      "paragraph:end",
      "paragraph:only",
    ])
    s = s.apply(moveBlocks(s, range(s.doc, "q"), 0)!)
    expect(names(s.doc)).toEqual(["paragraph:q", "callout[paragraph:]", "paragraph:end", "paragraph:only"])
  })

  test("a paragraph dropped into a list becomes an item; an item dropped outside is its text again", () => {
    let s = state(doc(ul(li("one"), li("two")), p("para")))
    const two = posOf(s.doc, "two", "list_item")
    s = s.apply(moveBlocks(s, range(s.doc, "para"), two)!)
    expect(names(s.doc)).toEqual([
      "bullet_list[list_item[paragraph:one],list_item[paragraph:para],list_item[paragraph:two]]",
    ])
    s = s.apply(moveBlocks(s, range(s.doc, "one", "list_item"), s.doc.content.size)!)
    expect(names(s.doc)).toEqual([
      "bullet_list[list_item[paragraph:para],list_item[paragraph:two]]",
      "paragraph:one",
    ])
  })

  test("the only item of a list, dropped before it, unwraps in place; task items become bullets", () => {
    let s = state(doc(p("a"), ul(li("solo")), tasks(task("t"))))
    const list = posOf(s.doc, "solo", "bullet_list")
    s = s.apply(moveBlocks(s, range(s.doc, "solo", "list_item"), list)!)
    expect(names(s.doc)).toEqual(["paragraph:a", "paragraph:solo", "task_list[task_item[paragraph:t]]"])
    s = state(doc(ul(li("one")), tasks(task("t"))))
    s = s.apply(moveBlocks(s, range(s.doc, "t", "task_item"), 1)!)
    expect(names(s.doc)).toEqual(["bullet_list[list_item[paragraph:t],list_item[paragraph:one]]"])
  })

  test("under an item, a block becomes a nested list that joins one already there", () => {
    let s = state(doc(ul(li("one", ul(li("sub")))), p("x")))
    const one = posOf(s.doc, "one", "list_item")
    const end = one + s.doc.nodeAt(one)!.nodeSize - 1
    s = s.apply(moveBlocks(s, range(s.doc, "x"), end)!)
    expect(names(s.doc)).toEqual([
      "bullet_list[list_item[paragraph:one,bullet_list[list_item[paragraph:sub],list_item[paragraph:x]]]]",
    ])
  })

  test("the caret moves with its block", () => {
    const d = doc(p("first"), callout(p("hello")), p("last"))
    const at = posOf(d, "hello") + 3
    let s = state(d, at)
    s = s.apply(moveBlocks(s, range(s.doc, "hello"), 0)!)
    expect(s.selection.$from.parent.textContent).toBe("hello")
    expect(s.selection.$from.parentOffset).toBe(2)
  })

  test("a remote cursor elsewhere is mapped, not lost", () => {
    const d = doc(p("a"), p("b"), p("c"))
    let s = state(d, posOf(d, "c") + 1)
    s = s.apply(moveBlocks(s, range(s.doc, "a"), posOf(s.doc, "b") + 3)!)
    expect(names(s.doc)).toEqual(["paragraph:b", "paragraph:a", "paragraph:c"])
    expect(s.selection.$from.parent.textContent).toBe("c")
  })

  test("a move onto itself changes nothing", () => {
    const s = state(doc(p("a"), p("b")))
    const r = range(s.doc, "a")
    expect(moveBlocks(s, r, r.from)).toBeNull()
    expect(moveBlocks(s, r, r.to)).toBeNull()
  })

  test("several selected blocks move together", () => {
    const d = doc(p("a"), p("b"), p("c"), p("d"))
    let s = EditorState.create({ schema, doc: d })
    s = s.apply(s.tr.setSelection(TextSelection.create(s.doc, posOf(d, "a") + 1, posOf(d, "b") + 2)))
    const r = unitsAt(s)!
    expect(r).toEqual({ from: 0, to: posOf(d, "c") })
    s = s.apply(moveBlocks(s, r, s.doc.content.size)!)
    expect(names(s.doc)).toEqual(["paragraph:c", "paragraph:d", "paragraph:a", "paragraph:b"])
    expect(s.selection.from).toBe(posOf(s.doc, "a") + 1)
  })
})

describe("keys", () => {
  const run = (
    s: EditorState,
    c: (s: EditorState, d?: (tr: import("prosemirror-state").Transaction) => void) => boolean,
  ) => {
    let out = s
    const ok = c(s, (tr) => (out = s.apply(tr)))
    return ok ? out : null
  }

  test("Alt ↑ walks a block into a callout, through it and out the top", () => {
    const d = doc(p("top"), callout(p("x"), p("y")), p("me"))
    let s = state(d, posOf(d, "me") + 1)
    const steps: string[][] = []
    for (let i = 0; i < 5; i++) {
      const next = run(s, moveBlock(-1))
      if (!next) break
      s = next
      steps.push(names(s.doc))
    }
    expect(steps).toEqual([
      ["paragraph:top", "callout[paragraph:x,paragraph:y,paragraph:me]"],
      ["paragraph:top", "callout[paragraph:x,paragraph:me,paragraph:y]"],
      ["paragraph:top", "callout[paragraph:me,paragraph:x,paragraph:y]"],
      ["paragraph:top", "paragraph:me", "callout[paragraph:x,paragraph:y]"],
      ["paragraph:me", "paragraph:top", "callout[paragraph:x,paragraph:y]"],
    ])
    expect(run(s, moveBlock(-1))).toBeNull()
    expect(s.selection.$from.parent.textContent).toBe("me")
  })

  test("Alt ↓ moves a list item past its sibling and out of the list as text", () => {
    const d = doc(ul(li("one"), li("two")), p("end"))
    let s = state(d, posOf(d, "one") + 1)
    s = run(s, moveBlock(1))!
    expect(names(s.doc)).toEqual([
      "bullet_list[list_item[paragraph:two],list_item[paragraph:one]]",
      "paragraph:end",
    ])
    s = run(s, moveBlock(1))!
    expect(names(s.doc)).toEqual(["bullet_list[list_item[paragraph:two]]", "paragraph:one", "paragraph:end"])
  })

  test("Tab puts a block into the container before it; Shift Tab takes it out", () => {
    const d = doc(callout(p("x")), p("me"), ul(li("i")), p("tail"))
    let s = state(d, posOf(d, "me") + 1)
    s = run(s, indentBlock)!
    expect(names(s.doc)[0]).toBe("callout[paragraph:x,paragraph:me]")
    s = run(s, outdentBlock)!
    expect(names(s.doc).slice(0, 2)).toEqual(["callout[paragraph:x]", "paragraph:me"])
    s = state(s.doc, posOf(s.doc, "tail") + 1)
    s = run(s, indentBlock)!
    expect(names(s.doc).at(-1)).toBe("bullet_list[list_item[paragraph:i],list_item[paragraph:tail]]")
    expect(run(state(doc(p("a"), p("b")), 4), indentBlock)).toBeNull()
  })

  test("a selected image moves and stays selected", () => {
    const d = docFromJSON({
      type: "doc",
      content: [p("a"), { type: "image", attrs: { src: "x.png" } }, p("b")],
    })
    let s = EditorState.create({ schema, doc: d })
    const img = posOf(d, "", "image")
    s = s.apply(s.tr.setSelection(NodeSelection.create(s.doc, img)))
    s = run(s, moveBlock(-1))!
    expect(s.doc.child(0).type.name).toBe("image")
    expect(s.selection instanceof NodeSelection && s.selection.node.type.name).toBe("image")
  })
})

describe("keys in nested lists", () => {
  test("Alt ↑ on a nested item that is first in its list takes it out, never a move in place", () => {
    const d = doc(ul(li("outer", ul(li("inner")))))
    let s = state(d, posOf(d, "inner") + 1)
    let out: EditorState | null = null
    moveBlock(-1)(s, (tr) => (out = s.apply(tr)))
    s = out!
    expect(names(s.doc)).toEqual(["bullet_list[list_item[paragraph:inner],list_item[paragraph:outer]]"])
    expect(moveBlocks(state(d), range(d, "inner", "list_item"), posOf(d, "inner", "bullet_list"))).toBeNull()
  })
})
