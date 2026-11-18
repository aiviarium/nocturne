import { describe, expect, test } from "bun:test"
import { EditorState } from "prosemirror-state"
import { richTextSchema as schema } from "../src/editor/schema"
import {
  allowedWidths,
  blockWidthKey,
  blockWidths,
  CORE_BLOCK_WIDTHS,
  checkWidthPolicy,
  defaultWidth,
  resolveWidth,
  widthChoices,
} from "../src/editor/width"

describe("block width policy", () => {
  test("without a policy a block is reading only, with no choice", () => {
    expect(allowedWidths(undefined)).toEqual(["reading"])
    expect(resolveWidth(undefined, "wide")).toBe("reading")
    expect(widthChoices(undefined)).toEqual([])
  })

  test("a forced width wins over what is stored, and offers no choice", () => {
    const p = { force: "wide" as const }
    expect(allowedWidths(p)).toEqual(["wide"])
    expect(resolveWidth(p, "full")).toBe("wide")
    expect(resolveWidth(p, null)).toBe("wide")
    expect(widthChoices(p)).toEqual([])
  })

  test("allowed widths are offered in their order, the default first applies, a stored allowed one wins", () => {
    const p = { default: "wide" as const, allowed: ["full" as const, "reading" as const, "wide" as const] }
    expect(widthChoices(p)).toEqual(["reading", "wide", "full"])
    expect(defaultWidth(p)).toBe("wide")
    expect(resolveWidth(p, null)).toBe("wide")
    expect(resolveWidth(p, "full")).toBe("full")
    expect(resolveWidth(p, "huge")).toBe("wide")
    expect(resolveWidth({ allowed: ["reading", "wide"] }, "full")).toBe("reading")
  })

  test("a width forced at run time (from the block's attributes) wins over the policy and the choice", () => {
    const p = { default: "reading" as const, allowed: ["reading" as const, "wide" as const, "full" as const] }
    expect(resolveWidth(p, "full", "wide")).toBe("wide")
    expect(widthChoices(p, "wide")).toEqual([])
    expect(widthChoices(p, null)).toEqual(["reading", "wide", "full"])
  })

  test("a policy that sets only a default is that width only", () => {
    expect(allowedWidths({ default: "full" })).toEqual(["full"])
    expect(widthChoices({ default: "full" })).toEqual([])
  })

  test("a policy's rules: force alone, a default among the allowed, each width once", () => {
    expect(checkWidthPolicy({ force: "wide" })).toEqual([])
    expect(checkWidthPolicy({ default: "wide", allowed: ["reading", "wide"] })).toEqual([])
    expect(checkWidthPolicy({ force: "wide", allowed: ["wide"] })[0]).toContain("force fixes the width")
    expect(checkWidthPolicy({ default: "full", allowed: ["reading"] })[0]).toContain("not one of the allowed")
    expect(checkWidthPolicy({ allowed: ["wide", "wide"] })[0]).toContain("twice")
    expect(checkWidthPolicy({ allowed: [] })[0]).toContain("no width")
  })

  test("core nodes: images and tables may go full width, code blocks wide", () => {
    expect(widthChoices(CORE_BLOCK_WIDTHS.image)).toEqual(["reading", "wide", "full"])
    expect(widthChoices(CORE_BLOCK_WIDTHS.table)).toEqual(["reading", "wide", "full"])
    expect(widthChoices(CORE_BLOCK_WIDTHS.code_block)).toEqual(["reading", "wide"])
  })
})

describe("block width decorations", () => {
  const doc = schema.nodeFromJSON({
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Intro" }] },
      { type: "image", attrs: { src: "/a.png", blockWidth: "full" } },
      { type: "code_block", attrs: { blockWidth: "full" }, content: [{ type: "text", text: "x" }] },
      { type: "plugin_block", attrs: { type: "wiki.database", attrs: { view: { layout: "board" } } } },
      { type: "blockquote", content: [{ type: "image", attrs: { src: "/b.png", blockWidth: "wide" } }] },
    ],
  })
  const widthOf = (n: import("prosemirror-model").Node) =>
    n.type.name === "plugin_block"
      ? resolveWidth({ default: "reading", allowed: ["reading", "wide"] }, n.attrs.blockWidth, "wide")
      : resolveWidth(CORE_BLOCK_WIDTHS[n.type.name], n.attrs.blockWidth)

  test("top-level blocks wider than the column are marked; nested ones and reading ones are not", () => {
    const state = EditorState.create({ schema, doc, plugins: [blockWidths(widthOf)] })
    const set = blockWidthKey.getState(state)
    const marked = set
      .find()
      .map((d: { from: number; type: { attrs: Record<string, string> } }) => [
        state.doc.nodeAt(d.from)!.type.name,
        d.type.attrs["data-block-width"],
      ])
    // The code block stored "full", which its policy does not allow: it falls back to reading.
    expect(marked).toEqual([
      ["image", "full"],
      ["plugin_block", "wide"],
    ])
  })

  test("the attribute survives a round trip through JSON, as it syncs", () => {
    const back = schema.nodeFromJSON(doc.toJSON())
    expect(back.child(1).attrs.blockWidth).toBe("full")
    expect(back.child(3).attrs.blockWidth).toBeNull()
  })
})
