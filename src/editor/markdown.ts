// Markdown into the shared schema, for Markdown paste. The conventions, which a server-side reader should
// share: a link to an entity URI is a mention, `> [!NOTE]` and its
// kin are callouts, `- [ ]` and `- [x]` are task items, GitHub tables are tables.

import type { Token } from "markdown-it"
import MarkdownIt from "markdown-it"
import type { Mark, Node as PMNode } from "prosemirror-model"
import { type RichTextJSON, richTextSchema as schema } from "./schema"

const md = new MarkdownIt({ html: false, linkify: true, breaks: false })
// Entity URIs (note://…) are fine links here.
md.validateLink = (url) => !/^(javascript|vbscript|data):/i.test(url.trim())
md.normalizeLink = (url) => url
md.normalizeLinkText = (t) => t

/** Whether a link target is an entity URI rather than a web address. */
export function isEntityUri(href: string): boolean {
  const m = /^([a-z][a-z0-9-]*):\/\/(.+)$/.exec(href)
  return !!m && !["http", "https", "ftp", "file"].includes(m[1]!)
}

const TONES: Record<string, string> = {
  NOTE: "info",
  IMPORTANT: "info",
  TIP: "success",
  WARNING: "warning",
  CAUTION: "danger",
}

interface Frame {
  type: string
  attrs: Record<string, unknown>
  content: PMNode[]
}

/** Parses Markdown into a document of the shared schema. */
export function parseMarkdown(text: string): PMNode {
  const tokens = md.parse(text, {})
  const stack: Frame[] = [{ type: "doc", attrs: {}, content: [] }]
  const top = () => stack[stack.length - 1]!
  const open = (type: string, attrs: Record<string, unknown> = {}) => stack.push({ type, attrs, content: [] })
  const close = () => {
    const f = stack.pop()!
    const t = schema.nodes[f.type]!
    const node =
      t.createAndFill(f.attrs, f.content) ??
      t.createAndFill(f.attrs, [schema.node("paragraph"), ...f.content.filter((c) => c.isBlock)])
    if (node) top().content.push(node)
  }
  const inline = (children: Token[]) => {
    const marks: Mark[] = []
    let mention: { uri: string; label: string } | null = null
    const out: PMNode[] = []
    const pushText = (s: string) => {
      if (!s) return
      if (mention) {
        mention.label += s
        return
      }
      out.push(schema.text(s, marks.slice()))
    }
    for (const t of children) {
      switch (t.type) {
        case "text":
          pushText(t.content)
          break
        case "code_inline":
          if (mention) mention.label += t.content
          else out.push(schema.text(t.content, [...marks, schema.marks.code!.create()]))
          break
        case "strong_open":
          marks.push(schema.marks.strong!.create())
          break
        case "em_open":
          marks.push(schema.marks.em!.create())
          break
        case "s_open":
          marks.push(schema.marks.strike!.create())
          break
        case "strong_close":
        case "em_close":
        case "s_close":
          marks.pop()
          break
        case "link_open": {
          const href = String(t.attrGet("href") ?? "")
          if (isEntityUri(href)) mention = { uri: href, label: "" }
          else marks.push(schema.marks.link!.create({ href }))
          break
        }
        case "link_close":
          if (mention) {
            out.push(schema.nodes.mention!.create(mention))
            mention = null
          } else marks.pop()
          break
        case "softbreak":
          pushText(" ")
          break
        case "hardbreak":
          out.push(schema.nodes.hard_break!.create())
          break
        case "image":
          out.push(
            schema.nodes.image!.create({
              src: String(t.attrGet("src") ?? ""),
              alt: t.content || t.children?.[0]?.content || "",
            }),
          )
          break
        default:
          if (t.content) pushText(t.content)
      }
    }
    return out
  }
  /** Inline content into the current textblock; images are lifted out as blocks. */
  const addInline = (nodes: PMNode[]) => {
    const f = top()
    if (f.type === "code_block") {
      f.content.push(...nodes)
      return
    }
    for (const n of nodes) {
      if (n.type.name === "image") {
        const para = stack.pop()!
        if (para.content.length) {
          const p = schema.node(para.type, para.attrs, para.content)
          top().content.push(p)
        }
        top().content.push(n)
        stack.push({ type: para.type, attrs: para.attrs, content: [] })
      } else f.content.push(n)
    }
  }
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!
    switch (t.type) {
      case "paragraph_open":
        open("paragraph")
        break
      case "heading_open":
        open("heading", { level: Math.min(3, Number(t.tag.slice(1)) || 1) })
        break
      case "paragraph_close":
      case "heading_close": {
        const f = stack.pop()!
        if (f.type === "__skip") break
        if (f.type === "paragraph" && f.content.length === 0 && t.type === "paragraph_close") {
          // A paragraph emptied by a lifted image.
          if (top().content.at(-1)?.type.name === "image") break
        }
        top().content.push(schema.node(f.type, f.attrs, f.content))
        break
      }
      case "inline": {
        let children = t.children ?? []
        // A task item: its first paragraph starts with [ ] or [x].
        const parent = stack[stack.length - 2]
        if (parent?.type === "list_item" && top().content.length === 0 && parent.content.length === 0) {
          const first = children[0]
          const m = first?.type === "text" ? /^\[( |x|X)\]\s+/.exec(first.content) : null
          if (m) {
            parent.type = "task_item"
            parent.attrs = { checked: m[1] !== " " }
            children = [
              Object.assign(Object.create(Object.getPrototypeOf(first!)), first, {
                content: first!.content.slice(m[0].length),
              }),
              ...children.slice(1),
            ]
          }
        }
        // A callout: a quote whose first paragraph is [!NOTE] and its kin.
        const quote = stack[stack.length - 2]
        if (quote?.type === "blockquote" && quote.content.length === 0 && top().content.length === 0) {
          const first = children[0]
          const m =
            first?.type === "text"
              ? /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/.exec(first.content)
              : null
          if (m) {
            quote.type = "callout"
            quote.attrs = { tone: TONES[m[1]!] }
            const rest = first!.content.slice(m[0].length)
            children = children.slice(1)
            if (children[0]?.type === "softbreak") children = children.slice(1)
            if (rest)
              children = [
                Object.assign(Object.create(Object.getPrototypeOf(first!)), first, { content: rest }),
                ...children,
              ]
            if (!children.length) {
              stack.pop()
              stack.push({ type: "__skip", attrs: {}, content: [] })
              break
            }
          }
        }
        addInline(inline(children))
        break
      }
      case "blockquote_open":
        open("blockquote")
        break
      case "bullet_list_open":
        open("bullet_list")
        break
      case "ordered_list_open":
        open("ordered_list", { order: Number(t.attrGet("start") ?? 1) || 1 })
        break
      case "list_item_open":
        open("list_item")
        break
      case "blockquote_close":
      case "list_item_close":
        close()
        break
      case "bullet_list_close":
      case "ordered_list_close": {
        const f = top()
        if (f.content.some((c) => c.type.name === "task_item")) {
          f.type = "task_list"
          f.attrs = {}
          f.content = f.content.map((c) =>
            c.type.name === "task_item" ? c : schema.nodes.task_item!.create({ checked: false }, c.content),
          )
        }
        close()
        break
      }
      case "fence":
      case "code_block": {
        const code = t.content.replace(/\n$/, "")
        const lang = (t.info ?? "").trim().split(/\s+/)[0] ?? ""
        top().content.push(schema.node("code_block", { language: lang }, code ? [schema.text(code)] : []))
        break
      }
      case "hr":
        top().content.push(schema.node("horizontal_rule"))
        break
      case "table_open":
        open("table")
        break
      case "tr_open":
        open("table_row")
        break
      case "th_open":
        open("table_header")
        open("paragraph")
        break
      case "td_open":
        open("table_cell")
        open("paragraph")
        break
      case "th_close":
      case "td_close": {
        const p = stack.pop()!
        top().content.push(schema.node("paragraph", {}, p.content))
        close()
        break
      }
      case "tr_close":
      case "table_close":
        close()
        break
      default:
        break
    }
  }
  while (stack.length > 1) close()
  const content = stack[0]!.content
  return schema.node("doc", {}, content.length ? content : [schema.node("paragraph")])
}

/** Whether pasted plain text looks like Markdown worth parsing (and not just a sentence). */
export function looksLikeMarkdown(text: string): boolean {
  return /(^|\n)(#{1,6} |[-*+] |\d+\. |> |```|\|.+\|)|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`/.test(text)
}

// ── Out ─────────────────────────────────────────────────────────────────────────────────────────────

export interface ToMarkdownOptions {
  /** Markdown for a `plugin_block` node (an app's block type); leave it out, or return null, to drop it. */
  block?: (node: RichTextJSON) => string | null | undefined
}

const ESCAPED = /[\\*_`[\]<~]/g
const escapeMd = (s: string) => s.replace(ESCAPED, (c) => `\\${c}`)

const CALLOUT_KIND: Record<string, string> = { success: "TIP", warning: "WARNING", danger: "CAUTION" }
const MARK_RANK: Record<string, number> = { link: 0, strong: 1, em: 2, strike: 3, underline: 4 }
const LISTS = new Set(["bullet_list", "ordered_list", "task_list"])

const kids = (n: RichTextJSON): RichTextJSON[] => n.content ?? []
const attr = <T>(n: RichTextJSON, k: string, fallback: T): T => (n.attrs?.[k] as T | undefined) ?? fallback

function inlineMd(nodes: RichTextJSON[]): string {
  // Neighbouring texts with the same marks are one span, so `**a**` stays whole.
  const merged: RichTextJSON[] = []
  for (const n of nodes) {
    const last = merged.at(-1)
    if (n.type === "text" && last?.type === "text" && JSON.stringify(last.marks) === JSON.stringify(n.marks))
      merged[merged.length - 1] = { ...last, text: (last.text ?? "") + (n.text ?? "") }
    else merged.push(n)
  }
  let out = ""
  for (const n of merged) {
    if (n.type === "text") {
      const raw = n.text ?? ""
      const marks = [...(n.marks ?? [])].sort((a, b) => (MARK_RANK[a.type] ?? 5) - (MARK_RANK[b.type] ?? 5))
      const code = marks.some((m) => m.type === "code")
      const tick = raw.includes("`") ? "``" : "`"
      let s = code ? `${tick}${raw}${tick}` : escapeMd(raw)
      for (const m of [...marks].reverse()) {
        if (m.type === "strong") s = `**${s}**`
        else if (m.type === "em") s = `*${s}*`
        else if (m.type === "strike") s = `~~${s}~~`
        else if (m.type === "underline") s = `<u>${s}</u>`
        else if (m.type === "link") s = `[${s}](${String(m.attrs?.href ?? "")})`
      }
      out += s
    } else if (n.type === "mention") {
      const uri = attr(n, "uri", "")
      out += `[${escapeMd(attr(n, "label", uri) || uri)}](${uri})`
    } else if (n.type === "hard_break") out += "\\\n"
  }
  return out
}

function pushLines(out: string[], prefix: string, text: string): void {
  for (const line of text.split("\n")) out.push(prefix + line)
}

function writeBlocks(blocks: RichTextJSON[], out: string[], prefix: string, o: ToMarkdownOptions): void {
  blocks.forEach((b, i) => {
    if (i > 0) out.push(prefix.trimEnd())
    writeBlock(b, out, prefix, o)
  })
}

function writeBlock(b: RichTextJSON, out: string[], prefix: string, o: ToMarkdownOptions): void {
  switch (b.type) {
    case "heading": {
      const level = Math.min(6, Math.max(1, attr(b, "level", 1)))
      pushLines(out, prefix, `${"#".repeat(level)} ${inlineMd(kids(b))}`)
      return
    }
    case "blockquote":
      writeBlocks(kids(b), out, `${prefix}> `, o)
      return
    case "callout": {
      const p = `${prefix}> `
      pushLines(out, p, `[!${CALLOUT_KIND[attr(b, "tone", "info")] ?? "NOTE"}]`)
      writeBlocks(kids(b), out, p, o)
      return
    }
    case "code_block": {
      const code = kids(b)
        .map((c) => c.text ?? "")
        .join("")
      const fence = code.includes("```") ? "````" : "```"
      pushLines(out, prefix, `${fence}${attr(b, "language", "")}`)
      pushLines(out, prefix, code)
      pushLines(out, prefix, fence)
      return
    }
    case "horizontal_rule":
      pushLines(out, prefix, "---")
      return
    case "bullet_list":
    case "ordered_list":
    case "task_list": {
      let n = attr(b, "order", 1)
      for (const item of kids(b)) {
        const marker =
          b.type === "ordered_list"
            ? `${n++}. `
            : b.type === "task_list"
              ? attr(item, "checked", false)
                ? "- [x] "
                : "- [ ] "
              : "- "
        const indent = " ".repeat(b.type === "ordered_list" ? marker.length : 2)
        const inner: string[] = []
        for (const [i, c] of kids(item).entries()) {
          if (i > 0 && !LISTS.has(c.type)) inner.push("")
          writeBlock(c, inner, "", o)
        }
        while (inner.length && inner.at(-1) === "") inner.pop()
        for (const [i, line] of inner.entries())
          out.push(prefix + (i === 0 ? marker : line ? indent : "") + line)
      }
      return
    }
    case "table": {
      const rows = kids(b).map((r) =>
        kids(r).map((c) =>
          kids(c)
            .map((p) => inlineMd(kids(p)))
            .join("<br>")
            .replace(/\|/g, "\\|"),
        ),
      )
      const cols = Math.max(0, ...rows.map((r) => r.length))
      rows.forEach((r, i) => {
        const cells = [...r, ...Array(cols - r.length).fill("")]
        pushLines(out, prefix, `| ${cells.join(" | ")} |`)
        if (i === 0) pushLines(out, prefix, `|${" --- |".repeat(cols)}`)
      })
      return
    }
    case "image":
      pushLines(out, prefix, `![${escapeMd(attr(b, "alt", ""))}](${attr(b, "src", "")})`)
      return
    case "file":
      pushLines(out, prefix, `[${escapeMd(attr(b, "name", "file"))}](${attr(b, "src", "")})`)
      return
    case "plugin_block": {
      const t = o.block?.(b)
      if (t) pushLines(out, prefix, t)
      return
    }
    default:
      pushLines(out, prefix, inlineMd(kids(b)))
      return
  }
}

/**
 * A document as Markdown, with the conventions `parseMarkdown` reads: mentions are links to entity URIs,
 * callouts are GitHub alerts (`> [!NOTE]`, `[!TIP]`, `[!WARNING]`, `[!CAUTION]`), task items are `- [ ]` and
 * `- [x]`, tables are GitHub tables with the first row as the header. Block widths, image sizes and underline
 * have no Markdown form and are lost on the way back; a file reads back as a link.
 */
export function toMarkdown(doc: PMNode | RichTextJSON, opts: ToMarkdownOptions = {}): string {
  const json = "toJSON" in doc && typeof doc.toJSON === "function" ? (doc.toJSON() as RichTextJSON) : doc
  const out: string[] = []
  writeBlocks(kids(json as RichTextJSON), out, "", opts)
  return `${out.join("\n").trimEnd()}\n`
}
