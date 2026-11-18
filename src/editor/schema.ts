// The shared editor's document format: one ProseMirror schema for collaborative documents and plain `richtext`
// fields. A server that reads these documents (for search text, mentions, Markdown or edits of its own) reads
// the same names, so treat a change here as a change to a stored format. Every attribute has a default, because
// y-prosemirror drops a node it cannot build, and attributes are stored as given (null ones left out).
import {
  type DOMOutputSpec,
  type MarkSpec,
  type NodeSpec,
  type Node as PMNode,
  Schema,
} from "prosemirror-model"
import { tableNodes } from "prosemirror-tables"

export type CalloutTone = "info" | "success" | "warning" | "danger"
export const CALLOUT_TONES: CalloutTone[] = ["info", "success", "warning", "danger"]

/** A block's chosen width (`reading`, `wide`, `full`; see width.ts), kept in copy and paste. */
const blockWidthAttr = { blockWidth: { default: null } }
const widthFrom = (d: HTMLElement | string) =>
  typeof d === "string" ? null : d.getAttribute("data-block-width") || null
const widthTo = (n: PMNode) => (n.attrs.blockWidth ? { "data-block-width": n.attrs.blockWidth } : {})

/** prosemirror-tables' nodes, with the table's width. */
function tables(): Record<string, NodeSpec> {
  const t = tableNodes({ tableGroup: "block", cellContent: "block+", cellAttributes: {} })
  const table = t.table
  return {
    ...t,
    table: {
      ...table,
      attrs: { ...table.attrs, ...blockWidthAttr },
      parseDOM: [{ tag: "table", getAttrs: (d) => ({ blockWidth: widthFrom(d) }) }],
      toDOM: (n) => ["table", widthTo(n), ["tbody", 0]],
    },
  }
}

const headingClass = (level: number) => (level <= 1 ? "title" : level === 2 ? "heading" : "body-lg")

const nodes: Record<string, NodeSpec> = {
  doc: { content: "block+" },
  paragraph: {
    group: "block",
    content: "inline*",
    parseDOM: [{ tag: "p" }],
    toDOM: () => ["p", { class: "body-lg" }, 0],
  },
  heading: {
    group: "block",
    content: "inline*",
    attrs: { level: { default: 1 } },
    defining: true,
    parseDOM: [1, 2, 3, 4, 5, 6].map((level) => ({ tag: `h${level}`, attrs: { level: Math.min(level, 3) } })),
    toDOM: (n) => [`h${n.attrs.level}`, { class: headingClass(n.attrs.level) }, 0],
  },
  blockquote: {
    group: "block",
    content: "block+",
    defining: true,
    parseDOM: [{ tag: "blockquote" }],
    toDOM: () => ["blockquote", 0],
  },
  callout: {
    group: "block",
    content: "block+",
    defining: true,
    attrs: { tone: { default: "info" } },
    parseDOM: [
      {
        tag: "aside[data-callout]",
        getAttrs: (d) => ({ tone: (d as HTMLElement).getAttribute("data-callout") || "info" }),
      },
    ],
    toDOM: (n) => [
      "aside",
      { "data-callout": n.attrs.tone, class: `nc-editor-callout nc-editor-callout--${n.attrs.tone}` },
      ["div", { class: "nc-editor-callout__body" }, 0],
    ],
  },
  code_block: {
    group: "block",
    content: "text*",
    marks: "",
    code: true,
    defining: true,
    attrs: { language: { default: "" }, ...blockWidthAttr },
    parseDOM: [
      {
        tag: "pre",
        preserveWhitespace: "full",
        getAttrs: (d) => ({
          blockWidth: widthFrom(d),
          language:
            (d as HTMLElement).getAttribute("data-language") ||
            /language-(\S+)/.exec((d as HTMLElement).querySelector("code")?.className ?? "")?.[1] ||
            "",
        }),
      },
    ],
    toDOM: (n) => ["pre", { "data-language": n.attrs.language, class: "code", ...widthTo(n) }, ["code", 0]],
  },
  horizontal_rule: {
    group: "block",
    parseDOM: [{ tag: "hr" }],
    toDOM: () => ["hr"],
  },
  bullet_list: {
    group: "block",
    content: "list_item+",
    parseDOM: [{ tag: "ul:not([data-tasks])" }],
    toDOM: () => ["ul", 0],
  },
  ordered_list: {
    group: "block",
    content: "list_item+",
    attrs: { order: { default: 1 } },
    parseDOM: [
      {
        tag: "ol",
        getAttrs: (d) => ({ order: Number((d as HTMLElement).getAttribute("start") ?? 1) || 1 }),
      },
    ],
    toDOM: (n) => ["ol", n.attrs.order === 1 ? {} : { start: n.attrs.order }, 0],
  },
  list_item: {
    content: "paragraph block*",
    defining: true,
    parseDOM: [{ tag: "li:not([data-task])" }],
    toDOM: () => ["li", 0],
  },
  task_list: {
    group: "block",
    content: "task_item+",
    parseDOM: [{ tag: "ul[data-tasks]", priority: 60 }],
    toDOM: () => ["ul", { "data-tasks": "", class: "nc-editor-tasks" }, 0],
  },
  task_item: {
    content: "paragraph block*",
    defining: true,
    attrs: { checked: { default: false } },
    parseDOM: [
      {
        tag: "li[data-task]",
        priority: 60,
        getAttrs: (d) => ({ checked: (d as HTMLElement).getAttribute("data-checked") === "true" }),
      },
    ],
    toDOM: (n) => ["li", { "data-task": "", "data-checked": String(n.attrs.checked) }, 0],
  },
  ...tables(),
  image: {
    group: "block",
    atom: true,
    draggable: true,
    attrs: {
      src: { default: "" },
      alt: { default: "" },
      title: { default: "" },
      blob: { default: null },
      width: { default: null },
      ...blockWidthAttr,
    },
    parseDOM: [
      {
        tag: "img[src]",
        getAttrs: (d) => ({
          blockWidth:
            (d as HTMLElement).closest?.("[data-block-width]")?.getAttribute("data-block-width") ?? null,
          src: (d as HTMLElement).getAttribute("src"),
          alt: (d as HTMLElement).getAttribute("alt") ?? "",
          title: (d as HTMLElement).getAttribute("title") ?? "",
        }),
      },
    ],
    toDOM: (n) => [
      "figure",
      { class: "nc-editor-image", ...widthTo(n) },
      ["img", { src: n.attrs.src, alt: n.attrs.alt }],
    ],
  },
  file: {
    group: "block",
    atom: true,
    draggable: true,
    attrs: {
      src: { default: "" },
      name: { default: "file" },
      size: { default: null },
      mime: { default: null },
      blob: { default: null },
    },
    parseDOM: [
      {
        tag: "a[data-file]",
        getAttrs: (d) => ({
          src: (d as HTMLElement).getAttribute("href") ?? "",
          name: (d as HTMLElement).textContent ?? "file",
        }),
      },
    ],
    toDOM: (n) => ["a", { "data-file": "", href: n.attrs.src, class: "nc-editor-file" }, n.attrs.name],
  },
  plugin_block: {
    group: "block",
    atom: true,
    draggable: true,
    selectable: true,
    attrs: { type: { default: "" }, attrs: { default: {} }, ...blockWidthAttr },
    parseDOM: [
      {
        tag: "div[data-block-type]",
        getAttrs: (d) => {
          let attrs = {}
          try {
            attrs = JSON.parse((d as HTMLElement).getAttribute("data-block-attrs") ?? "{}")
          } catch {
            /* keep the defaults */
          }
          return {
            type: (d as HTMLElement).getAttribute("data-block-type"),
            attrs,
            blockWidth: widthFrom(d as HTMLElement),
          }
        },
      },
    ],
    toDOM: (n) => [
      "div",
      {
        "data-block-type": n.attrs.type,
        "data-block-attrs": JSON.stringify(n.attrs.attrs ?? {}),
        ...widthTo(n),
      },
    ],
  },
  text: { group: "inline" },
  hard_break: {
    inline: true,
    group: "inline",
    selectable: false,
    parseDOM: [{ tag: "br" }],
    toDOM: () => ["br"],
  },
  mention: {
    inline: true,
    group: "inline",
    atom: true,
    selectable: true,
    attrs: { uri: { default: "" }, label: { default: "" } },
    parseDOM: [
      {
        tag: "span[data-mention]",
        getAttrs: (d) => ({
          uri: (d as HTMLElement).getAttribute("data-mention"),
          label: (d as HTMLElement).textContent ?? "",
        }),
      },
    ],
    toDOM: (n) => [
      "span",
      { "data-mention": n.attrs.uri, class: "nc-editor-mention" },
      n.attrs.label || n.attrs.uri,
    ],
    leafText: (n) => n.attrs.label || n.attrs.uri,
  },
}

const marks: Record<string, MarkSpec> = {
  link: {
    attrs: { href: { default: "" }, title: { default: null } },
    inclusive: false,
    parseDOM: [
      {
        tag: "a[href]:not([data-file])",
        getAttrs: (d) => ({
          href: (d as HTMLElement).getAttribute("href"),
          title: (d as HTMLElement).getAttribute("title"),
        }),
      },
    ],
    toDOM: (m): DOMOutputSpec => [
      "a",
      { href: m.attrs.href, title: m.attrs.title, rel: "noopener noreferrer nofollow", target: "_blank" },
      0,
    ],
  },
  strong: {
    parseDOM: [
      { tag: "strong" },
      { tag: "b", getAttrs: (n) => (n as HTMLElement).style.fontWeight !== "normal" && null },
      { style: "font-weight=bold" },
      { style: "font-weight", getAttrs: (v) => /^(bold(er)?|[5-9]\d{2,})$/.test(v as string) && null },
    ],
    toDOM: () => ["strong", 0],
  },
  em: {
    parseDOM: [{ tag: "i" }, { tag: "em" }, { style: "font-style=italic" }],
    toDOM: () => ["em", 0],
  },
  underline: {
    parseDOM: [{ tag: "u" }, { style: "text-decoration=underline" }],
    toDOM: () => ["u", 0],
  },
  strike: {
    parseDOM: [{ tag: "s" }, { tag: "del" }, { tag: "strike" }, { style: "text-decoration=line-through" }],
    toDOM: () => ["s", 0],
  },
  code: {
    excludes: "_",
    parseDOM: [{ tag: "code" }],
    toDOM: () => ["code", { class: "nc-editor-code code" }, 0],
  },
}

/** The schema of every rich text the editor edits. */
export const richTextSchema = new Schema({ nodes, marks })

/** ProseMirror JSON, as stored in `richtext` fields and returned by `documents.read`. */
export interface RichTextJSON {
  type: string
  attrs?: Record<string, unknown>
  content?: RichTextJSON[]
  text?: string
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
}

/** An empty document: one empty paragraph. */
export function emptyDoc(): RichTextJSON {
  return { type: "doc", content: [{ type: "paragraph" }] }
}

/**
 * A node from JSON, repaired where it does not fit the schema: unknown nodes become paragraphs of their text,
 * so content written by older code or other tools still opens.
 */
export function docFromJSON(json: RichTextJSON | null | undefined): PMNode {
  if (json?.type !== "doc") return richTextSchema.nodeFromJSON(emptyDoc())
  try {
    const n = richTextSchema.nodeFromJSON(json)
    n.check()
    return n
  } catch {
    return richTextSchema.nodeFromJSON(repair(json))
  }
}

function textOf(n: RichTextJSON): string {
  if (n.type === "text") return n.text ?? ""
  if (n.type === "mention") return String(n.attrs?.label ?? "")
  return (n.content ?? []).map(textOf).join(n.content?.every((c) => c.type === "text") ? "" : " ")
}

function repair(json: RichTextJSON): RichTextJSON {
  const blocks = (json.content ?? []).map((b) => {
    try {
      const n = richTextSchema.nodeFromJSON(b)
      n.check()
      if (!n.isBlock) throw new Error("inline at the top")
      return b
    } catch {
      const t = textOf(b)
      return t ? { type: "paragraph", content: [{ type: "text", text: t }] } : { type: "paragraph" }
    }
  })
  return { type: "doc", content: blocks.length ? blocks : [{ type: "paragraph" }] }
}

/** The plain text of a document, blocks on their own lines (what search indexes). */
export function plainTextOf(doc: PMNode): string {
  return doc.textBetween(0, doc.content.size, "\n", (leaf) =>
    leaf.type.name === "mention" ? String(leaf.attrs.label || leaf.attrs.uri) : leaf.isBlock ? "\n" : "",
  )
}
