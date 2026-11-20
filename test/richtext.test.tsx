import { afterEach, describe, expect, test } from "bun:test"
import { render } from "@solidjs/web"
import { EditorState, TextSelection } from "prosemirror-state"
import { createSignal, flush } from "solid-js"
import { prosemirrorJSONToYDoc, yXmlFragmentToProsemirrorJSON } from "y-prosemirror"
import * as awarenessProtocol from "y-protocols/awareness"
import * as Y from "yjs"
import {
  docFromJSON,
  insertBlock,
  isEntityUri,
  looksLikeMarkdown,
  makeTable,
  moveTopBlock,
  parseMarkdown,
  plainTextOf,
  RichTextEditor,
  type RichTextEditorHandle,
  type RichTextJSON,
  richTextSchema as schema,
  turnInto,
} from "../src"
import { triggerKey, triggers } from "../src/editor/plugins"

let cleanup: Array<() => void> = []
afterEach(() => {
  for (const c of cleanup) c()
  cleanup = []
  document.body.innerHTML = ""
})

const tick = () => new Promise((r) => setTimeout(r, 0))

const stateOf = (json: RichTextJSON, cursor?: number) => {
  const s = EditorState.create({ schema, doc: docFromJSON(json), plugins: [triggers()] })
  return cursor == null ? s : s.apply(s.tr.setSelection(TextSelection.create(s.doc, cursor)))
}
const para = (text: string): RichTextJSON => ({
  type: "paragraph",
  content: text ? [{ type: "text", text }] : [],
})
const doc = (...content: RichTextJSON[]): RichTextJSON => ({ type: "doc", content })

describe("schema", () => {
  test("every node of the schema round-trips through JSON", () => {
    const json = doc(
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Plan" }] },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Ask " },
          { type: "mention", attrs: { uri: "user://a", label: "Ada" } },
          {
            type: "text",
            text: " now",
            marks: [{ type: "strong" }, { type: "link", attrs: { href: "https://x.y", title: null } }],
          },
        ],
      },
      {
        type: "task_list",
        content: [{ type: "task_item", attrs: { checked: true }, content: [para("done")] }],
      },
      { type: "callout", attrs: { tone: "warning" }, content: [para("careful")] },
      { type: "code_block", attrs: { language: "rust" }, content: [{ type: "text", text: "fn main() {}" }] },
      { type: "plugin_block", attrs: { type: "probe.counter", attrs: { count: 2 } } },
      { type: "image", attrs: { src: "/blobs/1", alt: "chart", title: "", blob: "blob://1", width: null } },
      { type: "horizontal_rule" },
    )
    const node = docFromJSON(json)
    expect(node.toJSON().content[0]).toEqual(json.content![0]!)
    expect(node.child(5).attrs.attrs).toEqual({ count: 2 })
    expect(plainTextOf(node)).toContain("Ask Ada now")
  })

  test("content the schema cannot hold opens repaired instead of failing", () => {
    const node = docFromJSON({
      type: "doc",
      content: [{ type: "mystery", content: [{ type: "text", text: "kept" }] }, para("ok")],
    })
    expect(node.child(0).type.name).toBe("paragraph")
    expect(node.child(0).textContent).toBe("kept")
    expect(docFromJSON(null).childCount).toBe(1)
  })
})

describe("markdown", () => {
  test("paste turns Markdown into blocks, mentions and callouts", () => {
    const d = parseMarkdown(
      "# Plan\n\nAsk **Ada** about [the issue](issue://1) and [docs](https://x.y).\n\n- [x] done\n- [ ] open\n\n> [!WARNING]\n> Careful\n\n```js\nlet a = 1\n```\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\n---\n\n1. one\n2. two",
    )
    expect(Array.from({ length: d.childCount }, (_, i) => d.child(i).type.name)).toEqual([
      "heading",
      "paragraph",
      "task_list",
      "callout",
      "code_block",
      "table",
      "horizontal_rule",
      "ordered_list",
    ])
    const p = d.child(1)
    expect(p.child(1).marks[0]!.type.name).toBe("strong")
    expect(p.child(3).type.name).toBe("mention")
    expect(p.child(3).attrs).toEqual({ uri: "issue://1", label: "the issue" })
    expect(d.child(2).child(0).attrs.checked).toBe(true)
    expect(d.child(3).attrs.tone).toBe("warning")
    expect(d.child(3).textContent).toBe("Careful")
    expect(d.child(4).attrs.language).toBe("js")
    expect(d.child(5).child(0).child(0).type.name).toBe("table_header")
    expect(isEntityUri("note://x")).toBe(true)
    expect(isEntityUri("https://x")).toBe(false)
    expect(looksLikeMarkdown("just a sentence")).toBe(false)
    expect(looksLikeMarkdown("- one\n- two")).toBe(true)
  })
})

describe("commands", () => {
  test("blocks turn into other kinds and back", () => {
    let s = stateOf(doc(para("one"), para("two")), 2)
    const run = (c: ReturnType<typeof turnInto>) => c(s, (tr) => (s = s.apply(tr)))
    expect(run(turnInto("h2"))).toBe(true)
    expect(s.doc.child(0).type.name).toBe("heading")
    run(turnInto("task"))
    expect(s.doc.child(0).type.name).toBe("task_list")
    expect(s.selection.$from.parent.textContent).toBe("one")
    expect(s.selection.$from.parentOffset).toBe(1)
    run(turnInto("bullet"))
    expect(s.doc.child(0).type.name).toBe("bullet_list")
    run(turnInto("callout"))
    expect(s.doc.child(0).type.name).toBe("callout")
    run(turnInto("text"))
    expect(s.doc.child(0).type.name).toBe("paragraph")
    expect(s.doc.child(0).textContent).toBe("one")
  })

  test("blocks are inserted in place of an empty paragraph and moved", () => {
    let s = stateOf(doc(para("a"), para(""), para("c")), 4)
    insertBlock(makeTable(2, 2))(s, (tr) => (s = s.apply(tr)))
    expect(s.doc.child(1).type.name).toBe("table")
    s = s.apply(moveTopBlock(s, 1, 0))
    expect(s.doc.child(0).type.name).toBe("table")
    s = s.apply(moveTopBlock(s, 0, 3))
    expect(s.doc.child(2).type.name).toBe("table")
  })

  test("typing / or @ opens a trigger that follows the query", () => {
    let s = stateOf(doc(para("Hi ")), 4)
    s = s.apply(s.tr.insertText("@"))
    expect(triggerKey.getState(s)).toMatchObject({ kind: "@", query: "" })
    s = s.apply(s.tr.insertText("ad"))
    expect(triggerKey.getState(s)).toMatchObject({ kind: "@", query: "ad", from: 4 })
    s = s.apply(s.tr.insertText(" "))
    expect(triggerKey.getState(s)).toBeNull()
    let t = stateOf(doc(para("")), 1)
    t = t.apply(t.tr.insertText("/hea"))
    expect(triggerKey.getState(t)).toBeNull()
    t = stateOf(doc(para("")), 1)
    t = t.apply(t.tr.insertText("/"))
    t = t.apply(t.tr.insertText("hea"))
    expect(triggerKey.getState(t)).toMatchObject({ kind: "/", query: "hea" })
  })

  test("typing [[ opens a page link trigger whose query may have spaces", () => {
    let s = stateOf(doc(para("See ")), 5)
    s = s.apply(s.tr.insertText("["))
    expect(triggerKey.getState(s)).toBeNull()
    s = s.apply(s.tr.insertText("["))
    expect(triggerKey.getState(s)).toMatchObject({ kind: "[[", query: "", from: 5 })
    s = s.apply(s.tr.insertText("Launch plan"))
    expect(triggerKey.getState(s)).toMatchObject({ kind: "[[", query: "Launch plan", from: 5 })
    s = s.apply(s.tr.insertText("]"))
    expect(triggerKey.getState(s)).toBeNull()
  })
})

describe("RichTextEditor", () => {
  test("plain mode reports changes and takes new values", async () => {
    const changes: RichTextJSON[] = []
    let handle!: RichTextEditorHandle
    const host = document.createElement("div")
    document.body.append(host)
    const [value, setValue] = createSignal<RichTextJSON | null>(doc(para("hello")))
    cleanup.push(
      render(
        () => (
          <RichTextEditor
            value={value()}
            onChange={(v) => changes.push(v)}
            ref={(h) => {
              handle = h
            }}
          />
        ),
        host,
      ),
    )
    await tick()
    expect(host.querySelector("[data-part=rich-text-editor]")).not.toBeNull()
    expect(host.querySelector("p")?.textContent).toBe("hello")
    handle.view.dispatch(handle.view.state.tr.insertText(" world", 6))
    expect(changes.at(-1)?.content?.[0]?.content?.[0]?.text).toBe("hello world")
    setValue(doc(para("replaced")))
    flush()
    await tick()
    expect(handle.getJSON().content?.[0]?.content?.[0]?.text).toBe("replaced")
    expect(changes.length).toBe(1)
  })

  test("a key acts where the browser put the caret, before its selectionchange event has run", async () => {
    let handle!: RichTextEditorHandle
    const host = document.createElement("div")
    document.body.append(host)
    const heading: RichTextJSON = {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Title" }],
    }
    cleanup.push(
      render(
        () => (
          <RichTextEditor
            value={doc(heading, para("last"))}
            ref={(h) => {
              handle = h
            }}
          />
        ),
        host,
      ),
    )
    await tick()
    const view = handle.view
    view.focus()
    await tick()
    // The caret moves in the DOM (a click at the end of the paragraph), and Enter comes before the
    // document's selectionchange event: the editor still has its caret at the start of the heading.
    const text = host.querySelector("p")!.firstChild!
    const before = view.state.selection.from
    const hold = (e: Event) => e.stopImmediatePropagation()
    window.addEventListener("selectionchange", hold, true)
    getSelection()!.collapse(text, 4)
    window.removeEventListener("selectionchange", hold, true)
    expect(view.state.selection.from).toBe(before)
    view.dom.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true, cancelable: true }),
    )
    const blocks = handle.getJSON().content ?? []
    expect(blocks.map((b) => b.type)).toEqual(["heading", "paragraph", "paragraph"])
    expect(blocks[0]?.content?.[0]?.text).toBe("Title")
    expect(blocks[1]?.content?.[0]?.text).toBe("last")
  })

  test("read-only editors cannot be edited", async () => {
    const host = document.createElement("div")
    document.body.append(host)
    cleanup.push(render(() => <RichTextEditor value={doc(para("fixed"))} readOnly />, host))
    await tick()
    const content = host.querySelector("[data-part=editor-content]")!
    expect(content.getAttribute("contenteditable")).toBe("false")
    expect(content.getAttribute("aria-readonly")).toBe("true")
  })

  test("collaborative mode edits the Yjs document, and remote edits show", async () => {
    const ydoc = prosemirrorJSONToYDoc(schema, doc(para("shared")))
    const awareness = new awarenessProtocol.Awareness(ydoc)
    let handle!: RichTextEditorHandle
    const host = document.createElement("div")
    document.body.append(host)
    cleanup.push(
      render(
        () => (
          <RichTextEditor
            provider={{ doc: ydoc, awareness }}
            user={{ name: "Ada", color: "#3b82f6" }}
            ref={(h) => {
              handle = h
            }}
          />
        ),
        host,
      ),
    )
    await tick()
    expect(host.querySelector("p")?.textContent).toBe("shared")
    handle.insertText("!")
    const frag = ydoc.getXmlFragment("prosemirror")
    expect(JSON.stringify(yXmlFragmentToProsemirrorJSON(frag))).toContain("!")
    // Another replica's change arrives.
    const other = new Y.Doc()
    Y.applyUpdate(other, Y.encodeStateAsUpdate(ydoc))
    const p = other.getXmlFragment("prosemirror").get(0) as Y.XmlElement
    ;(p.get(0) as Y.XmlText).insert(0, ">> ")
    Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(other, Y.encodeStateVector(ydoc)))
    await tick()
    expect(host.querySelector("p")?.textContent?.startsWith(">> ")).toBe(true)
    expect(awareness.getLocalState()?.user).toEqual({ name: "Ada", color: "#3b82f6" })
    awareness.destroy()
  })

  test("[[ links to a page found by title, or makes one", async () => {
    let handle!: RichTextEditorHandle
    const host = document.createElement("div")
    document.body.append(host)
    const made: string[] = []
    const links = {
      search: async (q: string) =>
        [{ uri: "doc://1", title: "Launch plan" }].filter((p) =>
          p.title.toLowerCase().includes(q.toLowerCase()),
        ),
      create: async (title: string) => {
        made.push(title)
        return { uri: "doc://2", title }
      },
    }
    cleanup.push(
      render(
        () => (
          <RichTextEditor
            value={doc(para("See "))}
            services={{ links }}
            ref={(h) => {
              handle = h
            }}
          />
        ),
        host,
      ),
    )
    await tick()
    const v = handle.view
    v.dispatch(v.state.tr.setSelection(TextSelection.create(v.state.doc, 5)))
    v.dispatch(v.state.tr.insertText("["))
    v.dispatch(v.state.tr.insertText("["))
    v.dispatch(v.state.tr.insertText("laun"))
    await new Promise((r) => setTimeout(r, 120))
    const menu = host.querySelector("[data-part=mention-menu]")!
    expect(menu.textContent).toContain("Launch plan")
    expect(menu.querySelector("[data-part=link-create]")).not.toBeNull()
    ;(menu.querySelector("[data-uri='doc://1']") as HTMLButtonElement).click()
    expect(JSON.stringify(handle.getJSON())).toContain('"uri":"doc://1"')
    expect(handle.getJSON().content?.[0]?.content?.[0]?.text).toBe("See ")

    v.dispatch(v.state.tr.insertText("["))
    v.dispatch(v.state.tr.insertText("["))
    v.dispatch(v.state.tr.insertText("Retro notes"))
    await new Promise((r) => setTimeout(r, 120))
    ;(host.querySelector("[data-part=link-create]") as HTMLButtonElement).click()
    await new Promise((r) => setTimeout(r, 10))
    expect(made).toEqual(["Retro notes"])
    expect(JSON.stringify(handle.getJSON())).toContain('"uri":"doc://2"')
    expect(JSON.stringify(handle.getJSON())).not.toContain("[[")
  })

  test("selection actions show in the format bar, extensions run, and blocks see the outline", async () => {
    let handle!: RichTextEditorHandle
    const host = document.createElement("div")
    document.body.append(host)
    const picked: string[] = []
    const updates: number[] = []
    const { Plugin } = await import("prosemirror-state")
    let seen = 0
    const counter = new Plugin({ view: () => ({ update: () => void seen++ }) })
    let outline: () => Array<{ level: number; text: string; pos: number }> = () => []
    const blocks = () => [
      {
        id: "t.toc",
        title: "Contents",
        available: true,
        component: (p: { outline: typeof outline }) => {
          outline = p.outline
          return (
            <span data-test="toc">
              {p
                .outline()
                .map((h) => h.text)
                .join("|")}
            </span>
          )
        },
      },
    ]
    cleanup.push(
      render(
        () => (
          <RichTextEditor
            value={doc(
              { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Intro" }] },
              para("hello world"),
              { type: "plugin_block", attrs: { type: "t.toc", attrs: {} } } as never,
            )}
            services={{ blocks: blocks as never }}
            extensions={[counter]}
            onUpdate={(v) => updates.push(v.state.doc.childCount)}
            selectionActions={[
              {
                id: "comment",
                label: "Comment",
                run: (v) =>
                  picked.push(v.state.doc.textBetween(v.state.selection.from, v.state.selection.to)),
              },
            ]}
            ref={(h) => {
              handle = h
            }}
          />
        ),
        host,
      ),
    )
    await tick()
    const v = handle.view
    v.focus()
    v.dispatch(v.state.tr.setSelection(TextSelection.create(v.state.doc, 8, 13)))
    await tick()
    const btn = host.querySelector("[data-part=format-bar] [data-action=comment]") as HTMLButtonElement | null
    expect(btn?.textContent).toBe("Comment")
    btn!.click()
    expect(picked).toEqual(["hello"])
    expect(seen).toBeGreaterThan(0)
    expect(host.querySelector("[data-test=toc]")?.textContent).toBe("Intro")
    v.dispatch(v.state.tr.insert(0, schema.nodes.heading!.create({ level: 2 }, schema.text("Top"))))
    await tick()
    expect(outline().map((h) => h.text)).toEqual(["Top", "Intro"])
    expect(host.querySelector("[data-test=toc]")?.textContent).toBe("Top|Intro")
    expect(updates.length).toBe(1)
  })

  test("annotations highlight a quote by its text and prefix, and follow edits", async () => {
    let handle!: RichTextEditorHandle
    const host = document.createElement("div")
    document.body.append(host)
    const clicked: string[] = []
    const [list, setList] = createSignal([{ id: "c1", quote: "plan", prefix: "second " }])
    cleanup.push(
      render(
        () => (
          <RichTextEditor
            value={doc(para("first plan"), para("second plan here"))}
            annotations={list()}
            onAnnotationClick={(id) => clicked.push(id)}
            ref={(h) => {
              handle = h
            }}
          />
        ),
        host,
      ),
    )
    await tick()
    const marks = () => [...host.querySelectorAll("[data-annotation]")] as HTMLElement[]
    expect(marks().map((m) => m.textContent)).toEqual(["plan"])
    expect(marks()[0]!.closest("p")!.textContent).toBe("second plan here")
    marks()[0]!.click()
    expect(clicked).toEqual(["c1"])
    // An edit before it keeps it on the same words.
    handle.view.dispatch(handle.view.state.tr.insertText("New ", 1))
    await tick()
    expect(marks()[0]!.closest("p")!.textContent).toBe("second plan here")
    const { findQuote, quoteOf } = await import("../src")
    const d = handle.view.state.doc
    const r = findQuote(d, "plan", "first ")!
    expect(d.textBetween(r.from, r.to)).toBe("plan")
    expect(quoteOf(d, r.from, r.to)).toEqual({ quote: "plan", prefix: "New first " })
    setList([{ id: "c2", quote: "gone", prefix: "" }])
    flush()
    await tick()
    expect(marks()).toEqual([])
  })
})
