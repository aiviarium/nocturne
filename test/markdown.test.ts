import { describe, expect, test } from "bun:test"
import { docFromJSON, parseMarkdown, type RichTextJSON, richTextSchema, toMarkdown } from "../src/editor"

const t = (text: string, marks?: RichTextJSON["marks"]): RichTextJSON =>
  marks ? { type: "text", text, marks } : { type: "text", text }
const p = (...content: RichTextJSON[]): RichTextJSON => ({ type: "paragraph", content })
const doc = (...content: RichTextJSON[]): RichTextJSON => ({ type: "doc", content })

/** The document as the reader builds it, so attribute defaults compare equal. */
const canonical = (json: RichTextJSON) => docFromJSON(json).toJSON()
const roundTrip = (json: RichTextJSON) => parseMarkdown(toMarkdown(json)).toJSON()

// One document with every block and mark that Markdown can carry.
const EVERYTHING = doc(
  { type: "heading", attrs: { level: 1 }, content: [t("Release plan")] },
  { type: "heading", attrs: { level: 3 }, content: [t("Scope")] },
  p(
    t("Ship "),
    t("both", [{ type: "strong" }]),
    t(" builds, "),
    t("carefully", [{ type: "em" }]),
    t(", without "),
    t("the old flag", [{ type: "strike" }]),
    t(". Run "),
    t("bun test", [{ type: "code" }]),
    t(" and read "),
    t("the guide", [{ type: "link", attrs: { href: "https://example.com/guide" } }]),
    t("."),
  ),
  p(t("Ask "), { type: "mention", attrs: { uri: "user://ada", label: "Ada" } }, t(" first.")),
  p(t("Line one"), { type: "hard_break" }, t("line two")),
  p(t("Literal *stars*, _underscores_ and [brackets] stay text.")),
  {
    type: "bullet_list",
    content: [
      { type: "list_item", content: [p(t("one"))] },
      {
        type: "list_item",
        content: [
          p(t("two")),
          { type: "bullet_list", content: [{ type: "list_item", content: [p(t("nested"))] }] },
        ],
      },
    ],
  },
  {
    type: "ordered_list",
    attrs: { order: 3 },
    content: [
      { type: "list_item", content: [p(t("third"))] },
      { type: "list_item", content: [p(t("fourth"))] },
    ],
  },
  {
    type: "task_list",
    content: [
      { type: "task_item", attrs: { checked: true }, content: [p(t("done"))] },
      { type: "task_item", attrs: { checked: false }, content: [p(t("open"))] },
    ],
  },
  { type: "blockquote", content: [p(t("Quoted"))] },
  { type: "callout", attrs: { tone: "warning" }, content: [p(t("Careful"))] },
  { type: "callout", attrs: { tone: "success" }, content: [p(t("A tip"))] },
  { type: "code_block", attrs: { language: "ts" }, content: [t("const a = 1\nconst b = `x`")] },
  { type: "horizontal_rule" },
  {
    type: "table",
    content: [
      {
        type: "table_row",
        content: [
          { type: "table_header", content: [p(t("Host"))] },
          { type: "table_header", content: [p(t("Role"))] },
        ],
      },
      {
        type: "table_row",
        content: [
          { type: "table_cell", content: [p(t("build-01"))] },
          { type: "table_cell", content: [p(t("a | b"))] },
        ],
      },
    ],
  },
  { type: "image", attrs: { src: "https://example.com/a.png", alt: "A diagram" } },
)

describe("Markdown out and back", () => {
  test("every block and mark Markdown can carry comes back the same", () => {
    expect(roundTrip(EVERYTHING)).toEqual(canonical(EVERYTHING))
  })

  test("the written form follows the reader's conventions", () => {
    const md = toMarkdown(EVERYTHING)
    expect(md).toContain("[Ada](user://ada)")
    expect(md).toContain("> [!WARNING]\n> Careful")
    expect(md).toContain("> [!TIP]")
    expect(md).toContain("- [x] done\n- [ ] open")
    expect(md).toContain("3. third\n4. fourth")
    expect(md).toContain("- two\n  - nested")
    expect(md).toContain("| Host | Role |\n| --- | --- |\n| build-01 | a \\| b |")
    expect(md).toContain("```ts\nconst a = 1\nconst b = `x`\n```")
    expect(md).toContain("Literal \\*stars\\*, \\_underscores\\_ and \\[brackets\\] stay text.")
    expect(md.endsWith("\n")).toBe(true)
    expect(md.endsWith("\n\n")).toBe(false)
  })

  test("Markdown read and written again is stable", () => {
    const source =
      "# Plan\n\nAsk **Ada** about [the issue](issue://1) and [docs](https://x.y).\n\n- [x] done\n- [ ] open\n\n> [!NOTE]\n> Read this\n\n```js\nlet a = 1\n```\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\n---\n\n1. one\n2. two\n"
    const once = toMarkdown(parseMarkdown(source))
    expect(once).toBe(source)
    expect(toMarkdown(parseMarkdown(once))).toBe(once)
  })

  test("a code block holding a fence gets a longer fence", () => {
    const d = doc({ type: "code_block", attrs: { language: "md" }, content: [t("```js\nx\n```")] })
    expect(toMarkdown(d).startsWith("````md\n")).toBe(true)
    expect(roundTrip(d)).toEqual(canonical(d))
  })

  test("what Markdown cannot hold is dropped or simplified, never an error", () => {
    const d = doc(
      p(t("under", [{ type: "underline" }])),
      { type: "file", attrs: { src: "/files/1", name: "notes.pdf" } },
      { type: "plugin_block", attrs: { type: "charts.line", attrs: { title: "Visits" } } },
    )
    expect(toMarkdown(d)).toBe("<u>under</u>\n\n[notes.pdf](/files/1)\n")
    const custom = toMarkdown(d, {
      block: (n) => `**${String((n.attrs?.attrs as { title?: string } | undefined)?.title)}**`,
    })
    expect(custom.endsWith("**Visits**\n")).toBe(true)
    expect(() => parseMarkdown(custom)).not.toThrow()
  })

  test("a ProseMirror node and its JSON write the same Markdown", () => {
    expect(toMarkdown(docFromJSON(EVERYTHING))).toBe(toMarkdown(EVERYTHING))
    expect(toMarkdown(richTextSchema.node("doc", null, [richTextSchema.node("paragraph")]))).toBe("\n")
  })
})
