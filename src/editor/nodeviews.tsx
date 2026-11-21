// Node views: the parts of a document that are more than text. Each renders Solid into ProseMirror's DOM and
// keeps its attributes in signals, so a remote change re-renders in place.

import type { JSX } from "@solidjs/web"
import { Dynamic, render } from "@solidjs/web"
import type { Node as PMNode } from "prosemirror-model"
import { NodeSelection, TextSelection } from "prosemirror-state"
import type { EditorView, NodeView, ViewMutationRecord } from "prosemirror-view"
import { createSignal, For, Show } from "solid-js"
import { Icon, type IconName } from "../components/Icon"
import type { EditorBlockType, EditorServices, OutlineHeading } from "./services"

type GetPos = () => number | undefined

export interface ViewEnv {
  services: () => EditorServices
  readOnly: () => boolean
  /** Changes on every document change (for blocks that show something of the whole document). */
  docVersion?: () => number
}

/** The headings of a document, in order. */
export function outlineOf(doc: PMNode): OutlineHeading[] {
  const out: OutlineHeading[] = []
  doc.forEach((n, pos) => {
    if (n.type.name === "heading") out.push({ level: Number(n.attrs.level ?? 1), text: n.textContent, pos })
  })
  return out
}

function formatSize(n: number | null | undefined): string {
  if (!n) return ""
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/** A node view whose content is a Solid component of the node's attributes. */
abstract class SolidView implements NodeView {
  dom: HTMLElement
  protected node: () => PMNode
  protected setNode: (n: PMNode) => void
  protected selected: () => boolean
  protected setSelected: (b: boolean) => void
  private dispose: () => void

  constructor(
    node: PMNode,
    protected view: EditorView,
    protected getPos: GetPos,
    protected env: ViewEnv,
    tag: string,
  ) {
    this.dom = document.createElement(tag)
    ;[this.node, this.setNode] = createSignal(node, { equals: false })
    ;[this.selected, this.setSelected] = createSignal(false)
    this.dom.contentEditable = "false"
    this.dispose = render(() => this.render(), this.dom)
  }

  abstract render(): JSX.Element

  update(node: PMNode) {
    if (node.type !== this.node().type) return false
    this.setNode(node)
    return true
  }
  selectNode() {
    this.setSelected(true)
    this.dom.classList.add("ProseMirror-selectednode")
  }
  deselectNode() {
    this.setSelected(false)
    this.dom.classList.remove("ProseMirror-selectednode")
  }
  stopEvent(e: Event) {
    // Let controls inside the view work; drags of the whole node go to ProseMirror.
    const t = e.target as HTMLElement | null
    return !!t?.closest("input, textarea, select, button, a, [data-stop-events]") && e.type !== "dragstart"
  }
  ignoreMutation() {
    return true
  }
  destroy() {
    this.dispose()
  }
  protected setAttrs(patch: Record<string, unknown>) {
    const pos = this.getPos()
    if (pos == null || this.env.readOnly()) return
    const n = this.view.state.doc.nodeAt(pos)
    if (!n) return
    this.view.dispatch(this.view.state.tr.setNodeMarkup(pos, undefined, { ...n.attrs, ...patch }))
  }
  protected select() {
    const pos = this.getPos()
    if (pos == null) return
    this.view.dispatch(this.view.state.tr.setSelection(NodeSelection.create(this.view.state.doc, pos)))
  }
}

export class MentionView extends SolidView {
  constructor(node: PMNode, view: EditorView, getPos: GetPos, env: ViewEnv) {
    super(node, view, getPos, env, "span")
    this.dom.classList.add("nc-editor-mention-view")
    this.dom.dataset.part = "mention"
  }
  render() {
    const uri = () => String(this.node().attrs.uri)
    const label = () => String(this.node().attrs.label || this.node().attrs.uri)
    this.dom.dataset.mention = uri()
    const Chip = this.env.services().MentionChip
    return (
      <Show
        when={Chip}
        fallback={
          <span class="nc-editor-mention" data-uri={uri()}>
            {label()}
          </span>
        }
      >
        {(C) => <Dynamic component={C()} uri={uri()} label={label()} />}
      </Show>
    )
  }
  update(node: PMNode) {
    if (!super.update(node)) return false
    this.dom.dataset.mention = String(node.attrs.uri)
    return true
  }
  stopEvent() {
    return false
  }
}

export class ImageView extends SolidView {
  constructor(node: PMNode, view: EditorView, getPos: GetPos, env: ViewEnv) {
    super(node, view, getPos, env, "figure")
    this.dom.classList.add("nc-editor-image")
    this.dom.dataset.part = "image-block"
  }
  render() {
    const a = () => this.node().attrs
    const uploading = () => String(a().src).startsWith("blob:")
    return (
      <>
        <img
          src={String(a().src)}
          alt={String(a().alt ?? "")}
          draggable="false"
          onClick={() => this.select()}
        />
        <Show when={uploading()}>
          <span class="nc-editor-image__state label" data-part="upload-state">
            Uploading…
          </span>
        </Show>
        <Show when={!this.env.readOnly() && !uploading()}>
          <input
            class="nc-editor-image__alt label"
            aria-label="Image description"
            placeholder="Add a description"
            value={String(a().alt ?? "")}
            onChange={(e) => this.setAttrs({ alt: e.currentTarget.value })}
          />
        </Show>
        <Show when={this.env.readOnly() && a().alt}>
          <figcaption class="nc-editor-image__caption label">{String(a().alt)}</figcaption>
        </Show>
      </>
    )
  }
}

export class FileView extends SolidView {
  constructor(node: PMNode, view: EditorView, getPos: GetPos, env: ViewEnv) {
    super(node, view, getPos, env, "div")
    this.dom.classList.add("nc-editor-file")
    this.dom.dataset.part = "file-block"
  }
  render() {
    const a = () => this.node().attrs
    const uploading = () => String(a().src).startsWith("blob:")
    return (
      <>
        <span class="nc-editor-file__icon" onClick={() => this.select()}>
          <Icon name="file" />
        </span>
        <span class="nc-editor-file__text" onClick={() => this.select()}>
          <span class="nc-editor-file__name">{String(a().name)}</span>
          <span class="nc-editor-file__meta label">
            {uploading()
              ? "Uploading…"
              : [a().mime, formatSize(a().size as number)].filter(Boolean).join(" · ")}
          </span>
        </span>
        <Show when={!uploading()}>
          <a class="nc-btn nc-btn--ghost nc-btn--sm" href={String(a().src)} download={String(a().name)}>
            Download
          </a>
        </Show>
      </>
    )
  }
}

export class PluginBlockView extends SolidView {
  constructor(node: PMNode, view: EditorView, getPos: GetPos, env: ViewEnv) {
    super(node, view, getPos, env, "div")
    this.dom.classList.add("nc-editor-plugin-block")
    this.dom.dataset.part = "plugin-block"
    this.dom.dataset.blockType = String(node.attrs.type)
  }
  render() {
    const type = () => String(this.node().attrs.type)
    const spec = (): EditorBlockType | undefined =>
      this.env
        .services()
        .blocks?.()
        .find((b) => b.id === type())
    const attrs = () => (this.node().attrs.attrs ?? {}) as Record<string, unknown>
    const env = this.env
    const selected = this.selected
    const view = this.view
    const props = {
      outline: () => {
        env.docVersion?.()
        return outlineOf(view.state.doc)
      },
      scrollTo: (pos: number) => {
        const doc = view.state.doc
        const at = Math.max(0, Math.min(pos + 1, doc.content.size))
        view.dispatch(view.state.tr.setSelection(TextSelection.near(doc.resolve(at))).scrollIntoView())
        const dom = view.nodeDOM(pos)
        if (dom instanceof HTMLElement) dom.scrollIntoView({ block: "start", behavior: "smooth" })
        view.focus()
      },
      get attrs() {
        return attrs()
      },
      setAttrs: (patch: Record<string, unknown>) => this.setAttrs({ attrs: { ...attrs(), ...patch } }),
      get readOnly() {
        return env.readOnly()
      },
      get selected() {
        return selected()
      },
    }
    return (
      <Show
        when={spec()?.available !== false && spec()?.component}
        fallback={
          <div
            class="nc-editor-plugin-block__missing"
            data-part="block-placeholder"
            onClick={() => this.select()}
          >
            <Icon name="layers" size="sm" />
            <span class="label">{spec()?.title ?? "Block"} is unavailable</span>
            <span class="nc-meta">
              {spec() ? "Its block type is turned off." : "Its block type is not available here."} The block's
              data is kept.
            </span>
            <code class="nc-editor-code">{type()}</code>
          </div>
        }
      >
        {(C) => (
          <div class="nc-editor-plugin-block__body" data-stop-events>
            <Dynamic component={C()} {...props} />
          </div>
        )}
      </Show>
    )
  }
  update(node: PMNode) {
    if (!super.update(node)) return false
    this.dom.dataset.blockType = String(node.attrs.type)
    return true
  }
  stopEvent(e: Event) {
    const t = e.target as HTMLElement | null
    if (e.type === "dragstart" || e.type.startsWith("drop")) return false
    return !!t?.closest(".nc-editor-plugin-block__body")
  }
}

const LANGUAGES = ["", "ts", "js", "tsx", "rust", "py", "go", "sh", "json", "css", "sql", "yaml", "md"]

/** A code block: a bar with the language and Copy, and the code itself. */
export class CodeBlockView implements NodeView {
  dom: HTMLElement
  contentDOM: HTMLElement
  private bar: HTMLElement
  private dispose: () => void
  private lang: () => string
  private setLang: (s: string) => void

  constructor(
    private node: PMNode,
    private view: EditorView,
    private getPos: GetPos,
    private env: ViewEnv,
  ) {
    this.dom = document.createElement("div")
    this.dom.className = "nc-editor-codeblock"
    this.dom.dataset.part = "code-block"
    this.bar = document.createElement("div")
    this.bar.className = "nc-editor-codeblock__bar"
    this.bar.contentEditable = "false"
    const pre = document.createElement("pre")
    pre.className = "code"
    this.contentDOM = document.createElement("code")
    pre.append(this.contentDOM)
    this.dom.append(this.bar, pre)
    ;[this.lang, this.setLang] = createSignal(String(node.attrs.language ?? ""))
    const [copied, setCopied] = createSignal(false)
    this.dispose = render(
      () => (
        <>
          <Show when={!this.env.readOnly()} fallback={<span class="mono">{this.lang() || "text"}</span>}>
            <select
              class="nc-editor-codeblock__lang mono"
              aria-label="Language"
              value={this.lang()}
              onChange={(e) => this.setLanguage(e.currentTarget.value)}
            >
              <For each={LANGUAGES.includes(this.lang()) ? LANGUAGES : [...LANGUAGES, this.lang()]}>
                {(l) => <option value={l}>{l || "text"}</option>}
              </For>
            </select>
          </Show>
          <button
            type="button"
            class="nc-btn nc-btn--ghost nc-btn--sm"
            onClick={() => {
              void navigator.clipboard?.writeText(this.node.textContent).catch(() => {})
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }}
          >
            {copied() ? "Copied" : "Copy"}
          </button>
        </>
      ),
      this.bar,
    )
  }
  private setLanguage(language: string) {
    const pos = this.getPos()
    if (pos == null) return
    this.view.dispatch(this.view.state.tr.setNodeMarkup(pos, undefined, { ...this.node.attrs, language }))
  }
  update(node: PMNode) {
    if (node.type !== this.node.type) return false
    this.node = node
    this.setLang(String(node.attrs.language ?? ""))
    this.dom.dataset.language = String(node.attrs.language ?? "")
    return true
  }
  stopEvent(e: Event) {
    return this.bar.contains(e.target as Node)
  }
  ignoreMutation(m: ViewMutationRecord) {
    return this.bar.contains(m.target as Node)
  }
  destroy() {
    this.dispose()
  }
}

/** A task item: a checkbox and its content. */
export class TaskItemView implements NodeView {
  dom: HTMLElement
  contentDOM: HTMLElement
  private box: HTMLButtonElement

  constructor(
    private node: PMNode,
    private view: EditorView,
    private getPos: GetPos,
    private env: ViewEnv,
  ) {
    this.dom = document.createElement("li")
    this.dom.dataset.task = ""
    this.dom.dataset.part = "task-item"
    this.box = document.createElement("button")
    this.box.type = "button"
    this.box.className = "nc-editor-task__box"
    this.box.contentEditable = "false"
    this.box.addEventListener("mousedown", (e) => e.preventDefault())
    this.box.addEventListener("click", () => this.toggle())
    this.contentDOM = document.createElement("div")
    this.contentDOM.className = "nc-editor-task__body"
    this.dom.append(this.box, this.contentDOM)
    this.sync()
  }
  private sync() {
    const checked = !!this.node.attrs.checked
    this.dom.dataset.checked = String(checked)
    this.box.setAttribute("role", "checkbox")
    this.box.setAttribute("aria-checked", String(checked))
    this.box.setAttribute("aria-label", checked ? "Done" : "Not done")
    this.box.disabled = this.env.readOnly()
    this.box.innerHTML = checked
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : ""
  }
  private toggle() {
    const pos = this.getPos()
    if (pos == null || this.env.readOnly()) return
    this.view.dispatch(
      this.view.state.tr.setNodeMarkup(pos, undefined, {
        ...this.node.attrs,
        checked: !this.node.attrs.checked,
      }),
    )
  }
  update(node: PMNode) {
    if (node.type !== this.node.type) return false
    this.node = node
    this.sync()
    return true
  }
  stopEvent(e: Event) {
    return e.target === this.box || this.box.contains(e.target as Node)
  }
  ignoreMutation(m: ViewMutationRecord) {
    return m.target === this.box || this.box.contains(m.target as Node)
  }
}

/** The node views of the editor. */
export function nodeViews(env: ViewEnv) {
  return {
    mention: (n: PMNode, v: EditorView, g: GetPos) => new MentionView(n, v, g, env),
    image: (n: PMNode, v: EditorView, g: GetPos) => new ImageView(n, v, g, env),
    file: (n: PMNode, v: EditorView, g: GetPos) => new FileView(n, v, g, env),
    plugin_block: (n: PMNode, v: EditorView, g: GetPos) => new PluginBlockView(n, v, g, env),
    code_block: (n: PMNode, v: EditorView, g: GetPos) => new CodeBlockView(n, v, g, env),
    task_item: (n: PMNode, v: EditorView, g: GetPos) => new TaskItemView(n, v, g, env),
  }
}

export type { IconName }
