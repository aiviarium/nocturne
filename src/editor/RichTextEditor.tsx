// The shared rich text editor: ProseMirror with one schema for every rich text. It runs bound to a
// collaborative document (`provider`, a Yjs document and its awareness) or to a JSON value (`value` and `onChange`,
// conflict detection left to the caller). Pickers, uploads, the model call and dictation come from
// EditorServices; the editor itself has no network code.

import type { JSX } from "@solidjs/web"
import { Dynamic } from "@solidjs/web"
import { baseKeymap } from "prosemirror-commands"
import { dropCursor } from "prosemirror-dropcursor"
import { gapCursor } from "prosemirror-gapcursor"
import { history, redo as pmRedo, undo as pmUndo } from "prosemirror-history"
import { type Node as PMNode, Slice } from "prosemirror-model"
import {
  type Command,
  EditorState,
  NodeSelection,
  type Plugin,
  TextSelection,
  type Transaction,
} from "prosemirror-state"
import {
  addColumnAfter,
  addRowAfter,
  columnResizing,
  deleteColumn,
  deleteRow,
  fixTables,
  isInTable,
  tableEditing,
} from "prosemirror-tables"
import { EditorView } from "prosemirror-view"
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  getOwner,
  onCleanup,
  onSettled,
  runWithOwner,
  Show,
  untrack,
} from "solid-js"
import {
  initProseMirrorDoc,
  yCursorPlugin,
  redo as yRedo,
  ySyncPlugin,
  undo as yUndo,
  yUndoPlugin,
} from "y-prosemirror"
import { DictationBlockedError, type Transcriber, useTranscriber } from "../components/Dictation"
import { ICON_PATHS, Icon, type IconName } from "../components/Icon"
import { Menu, type MenuEntry } from "../components/Menu"
import { aria } from "../lib/aria"
import { cx } from "../lib/cx"
import { Overlay } from "../lib/overlay"
import {
  type BlockGeometry,
  type BlockRange,
  blockAt,
  blockDrag,
  blockDragKey,
  type DropTarget,
  deleteBlocks,
  dragLabel,
  dropTarget,
  moveBlock,
  moveBlocks,
  unitsAt,
} from "./blockdrag"
import { blockKind, insertBlock, keys, makeTable, markActive, setLink, shortcuts, turnInto } from "./commands"
import { looksLikeMarkdown, parseMarkdown } from "./markdown"
import { nodeViews } from "./nodeviews"
import {
  type Annotation,
  annotations,
  annotationsKey,
  closeTrigger,
  codeHighlight,
  keyHook,
  openTrigger,
  placeholders,
  setSuggestionRange,
  suggestion,
  suggestionKey,
  type Trigger,
  triggerKey,
  triggers,
} from "./plugins"
import { docFromJSON, type RichTextJSON, richTextSchema as schema } from "./schema"
import {
  AI_COPY_DEFAULTS,
  type AiCopy,
  type AiRequest,
  type CollabProvider,
  type CollabUser,
  type EditorServices,
  type MentionItem,
  useEditorServices,
} from "./services"
import {
  BLOCK_WIDTH_LABEL,
  type BlockWidth,
  type BlockWidthPolicy,
  blockWidthKey,
  blockWidths,
  CORE_BLOCK_WIDTHS,
  isBlockWidth,
  resolveWidth,
  widthChoices,
} from "./width"

void baseKeymap

export interface RichTextEditorHandle {
  readonly view: EditorView
  focus(): void
  /** The document as ProseMirror JSON. */
  getJSON(): RichTextJSON
  /** Inserts text at the cursor. */
  insertText(text: string): void
  /** Replaces the content (plain mode). */
  setContent(doc: RichTextJSON): void
  /** Runs a command against the editor. */
  run(command: Command): boolean
  /** Opens the writing assistant on the selection or at the cursor. */
  askAI(): void
}

export interface RichTextEditorProps {
  /** Plain mode: the value. A new value replaces the content unless it equals what the editor has. */
  value?: RichTextJSON | null
  /** Plain mode: called after every change with the new value. */
  onChange?: (doc: RichTextJSON) => void
  /** Collaborative mode: the document to bind to (a `CollabProvider`). `value` is ignored. */
  provider?: CollabProvider
  /** Collaborative mode: how the local user shows to others. Sets the awareness `user` field. */
  user?: CollabUser
  /** Nothing can be changed; menus, handles and the format bar are off. */
  readOnly?: boolean
  /** Shown in an empty document. */
  placeholder?: string
  /** Shown in the empty block at the cursor. Default "Type / for blocks, @ to link"; `null` turns it off. */
  blockPlaceholder?: string | null
  /** `page` (docs: wide gutters, block handles), `field` (a form field), `comment` (compact, no handles). */
  variant?: "page" | "field" | "comment"
  /** Overrides the services from the nearest EditorServicesProvider. */
  services?: EditorServices
  autofocus?: boolean
  /** Receives a handle for imperative use. */
  ref?: (handle: RichTextEditorHandle) => void
  /** Called with a message when something fails that the user should know about (an upload, a model call). */
  onError?: (message: string) => void
  /** Called when focus enters or leaves the editor. */
  onFocusChange?: (focused: boolean) => void
  /** Called after every transaction that changed the document, local or remote (both modes). */
  onUpdate?: (view: EditorView) => void
  /** More ProseMirror plugins (decorations, key handlers) after the editor's own. Read when the editor mounts. */
  extensions?: Plugin[]
  /** Buttons at the end of the format bar for a selection ("Comment"). */
  selectionActions?: SelectionAction[]
  /** Stretches of text to highlight, found by their quote (comments on a range). */
  annotations?: Annotation[]
  /** A highlighted stretch was clicked. */
  onAnnotationClick?: (id: string) => void
  "aria-label"?: string
  class?: string
  id?: string
}

/** A button of the format bar that acts on the selection. */
export interface SelectionAction {
  id: string
  label: string
  /** A named icon name shown before the label. */
  icon?: string
  /** The selection is `view.state.selection`. */
  run(view: EditorView): void
}

interface InsertItem {
  id: string
  title: string
  description?: string
  icon: IconName
  key?: string
  keywords?: string
  group: string
  run(view: EditorView): void
}

const KIND_LABEL: Record<string, string> = {
  text: "Text",
  h1: "Heading 1",
  h2: "Heading 2",
  h3: "Heading 3",
  bullet: "Bulleted list",
  ordered: "Numbered list",
  task: "To-do list",
  quote: "Quote",
  callout: "Callout",
  code: "Code",
}

const AI_ACTIONS: Array<{ id: AiRequest["action"]; label: string; instruction: string; selection: boolean }> =
  [
    {
      id: "improve",
      label: "Improve writing",
      instruction: "Improve the writing. Keep its meaning.",
      selection: true,
    },
    {
      id: "shorten",
      label: "Make shorter",
      instruction: "Make it shorter. Keep its meaning.",
      selection: true,
    },
    {
      id: "fix",
      label: "Fix spelling and grammar",
      instruction: "Fix spelling and grammar only.",
      selection: true,
    },
    { id: "summarize", label: "Summarise", instruction: "Summarise it in a few sentences.", selection: true },
    {
      id: "translate",
      label: "Translate to English",
      instruction: "Translate it to English.",
      selection: true,
    },
    {
      id: "continue",
      label: "Continue writing",
      instruction: "Continue the text from here.",
      selection: false,
    },
  ]

/** Dictation through a Transcriber: records until stopped, then yields the transcript. */
function transcriberDictation(t: Transcriber) {
  return async function* ({ signal }: { signal: AbortSignal }): AsyncGenerator<string> {
    let session: Awaited<ReturnType<Transcriber["start"]>>
    try {
      session = await t.start({})
    } catch (e) {
      if (e instanceof DictationBlockedError) t.openSettings?.()
      throw e
    }
    await new Promise<void>((resolve) => {
      if (signal.aborted) resolve()
      else signal.addEventListener("abort", () => resolve(), { once: true })
    })
    const text = (await session.finish()).trim()
    if (text) yield `${text} `
  }
}

/** A CSS colour (a token reference works) as `#rrggbb`, which y-prosemirror's cursors want. */
function resolveColor(el: HTMLElement, css: string): string {
  if (/^#[0-9a-f]{6}$/i.test(css)) return css
  const probe = document.createElement("span")
  probe.style.color = css
  el.append(probe)
  const rgb = getComputedStyle(probe).color
  probe.remove()
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(rgb)
  if (!m) return css
  return `#${[m[1], m[2], m[3]].map((x) => Number(x).toString(16).padStart(2, "0")).join("")}`
}

function filterItems(items: InsertItem[], q: string): InsertItem[] {
  const s = q.trim().toLowerCase()
  if (!s) return items
  const score = (i: InsertItem) => {
    const t = i.title.toLowerCase()
    if (t.startsWith(s)) return 0
    if (t.split(/\s+/).some((w) => w.startsWith(s))) return 1
    if ((i.keywords ?? "").toLowerCase().includes(s) || i.id.includes(s)) return 2
    if (t.includes(s)) return 3
    return 9
  }
  return items
    .map((i) => [i, score(i)] as const)
    .filter(([, sc]) => sc < 9)
    .sort((a, b) => a[1] - b[1])
    .map(([i]) => i)
}

/** The shared rich text editor. */
export function RichTextEditor(props: RichTextEditorProps): JSX.Element {
  const ctxServices = useEditorServices()
  const transcriber = useTranscriber()
  const services = (): EditorServices => {
    const s = props.services ?? ctxServices
    // Dictation from the app's transcriber (TranscriberProvider) when no service gives it otherwise.
    if (s.dictate || !transcriber?.available()) return s
    return { ...s, dictate: transcriberDictation(transcriber) }
  }
  const aiCopy = (): Required<AiCopy> => ({ ...AI_COPY_DEFAULTS, ...services().aiCopy })

  const variant = () => props.variant ?? "page"
  const [providerReadOnly, setProviderReadOnly] = createSignal(false)
  const readOnly = () => !!props.readOnly || providerReadOnly()

  let root!: HTMLDivElement
  let mount!: HTMLDivElement
  let view: EditorView | undefined
  const [tick, setTick] = createSignal(0, { equals: false })
  const [focused, setFocused] = createSignal(false)
  const [trigger, setTrigger] = createSignal<Trigger | null>(null)
  const [docVersion, setDocVersion] = createSignal(0)
  const menuKeys: { current: ((e: KeyboardEvent) => boolean) | null } = { current: null }

  // Position of something in the document, relative to the editor's root (overlays are absolute in it).
  const rel = (r: { left: number; top: number; bottom: number; right?: number }) => {
    const box = root.getBoundingClientRect()
    return { left: r.left - box.left, top: r.top - box.top, bottom: r.bottom - box.top }
  }

  const collab = () => !!props.provider

  // ── Block widths ────────────────────────────────────────────────────────────────────────────────
  // A block's policy is its block type's (`EditorBlockType.width`) or a core node's; an added block type may
  // also force a width from its attributes.
  const blockSpec = (n: PMNode) =>
    n.type.name === "plugin_block"
      ? services()
          .blocks?.()
          .find((b) => b.id === n.attrs.type)
      : undefined
  const policyOf = (n: PMNode): BlockWidthPolicy | undefined =>
    n.type.name === "plugin_block" ? blockSpec(n)?.width : CORE_BLOCK_WIDTHS[n.type.name]
  const forcedOf = (n: PMNode): BlockWidth | null => {
    const w = blockSpec(n)?.forceWidth?.((n.attrs.attrs ?? {}) as Record<string, unknown>)
    return isBlockWidth(w) ? w : null
  }
  const widthOf = (n: PMNode): BlockWidth => resolveWidth(policyOf(n), n.attrs.blockWidth, forcedOf(n))

  const buildState = (doc?: PMNode, mapping?: Map<unknown, unknown>): EditorState => {
    const plugins: Plugin[] = [keyHook(menuKeys), triggers()]
    if (props.provider) {
      const frag = props.provider.doc.getXmlFragment(props.provider.fragment ?? "prosemirror")
      plugins.push(
        ySyncPlugin(frag, mapping ? { mapping: mapping as never } : {}),
        yCursorPlugin(props.provider.awareness, {
          cursorBuilder: (user: { name: string; color: string }) => {
            const c = document.createElement("span")
            c.className = "nc-editor-cursor"
            c.dataset.part = "remote-cursor"
            c.style.setProperty("--cursor", user.color)
            const l = document.createElement("span")
            l.className = "nc-editor-cursor__label label"
            l.textContent = user.name
            c.append(l)
            return c
          },
          selectionBuilder: (user: { color: string }) => ({
            class: "nc-editor-remote-selection",
            style: `--cursor: ${user.color}`,
          }),
        }),
        yUndoPlugin(),
      )
      plugins.push(...keys({ undo: yUndo, redo: yRedo }))
    } else {
      plugins.push(history(), ...keys({ undo: pmUndo, redo: pmRedo }))
    }
    plugins.push(
      shortcuts(),
      blockDrag(),
      dropCursor({ class: "nc-editor-dropcursor" }),
      gapCursor(),
      columnResizing(),
      tableEditing(),
      codeHighlight(),
      suggestion(),
      annotations(() => props.annotations ?? []),
      blockWidths((n) => widthOf(n)),
      ...(props.extensions ?? []),
      placeholders({
        block: () =>
          readOnly() || !focused()
            ? null
            : props.blockPlaceholder === undefined
              ? variant() === "page"
                ? "Type / for blocks, @ to link"
                : null
              : props.blockPlaceholder,
        doc: () => props.placeholder ?? null,
      }),
    )
    return EditorState.create({
      schema,
      doc: doc ?? (props.provider ? undefined : docFromJSON(props.value)),
      plugins,
    })
  }

  // Block types arrive as plugins load: recompute the blocks' widths.
  createEffect(
    () => services().blocks?.(),
    () => {
      if (view) view.dispatch(view.state.tr.setMeta(blockWidthKey, true))
    },
    { defer: true },
  )

  // Annotations are read by their plugin; tell it when the list changes.
  createEffect(
    () => JSON.stringify(props.annotations ?? []),
    () => {
      if (view) view.dispatch(view.state.tr.setMeta(annotationsKey, true))
    },
    { defer: true },
  )

  const lastJSON = { current: "" }

  const dispatch = (tr: Transaction) => {
    if (!view) return
    const state = view.state.apply(tr)
    view.updateState(state)
    setTrigger(triggerKey.getState(state) ?? null)
    setTick(0)
    // Handles and the block menu follow their block through edits, local or remote.
    if (tr.docChanged) {
      const menu = blockMenu()
      if (menu != null) setBlockMenu(tr.mapping.map(menu))
      const h = hover()
      if (h && !gesture) {
        const m = tr.mapping.mapResult(h.pos)
        setHover(m.deleted ? null : handleFor(m.pos))
      }
      if (gesture?.source) updateDrag()
    }
    if (tr.docChanged) {
      setDocVersion((v) => v + 1)
      props.onUpdate?.(view)
    }
    if (tr.docChanged && !collab() && props.onChange) {
      const json = state.doc.toJSON() as RichTextJSON
      lastJSON.current = JSON.stringify(json)
      props.onChange(json)
    }
  }

  // ── Uploads ──────────────────────────────────────────────────────────────────────────────────────

  const uploadFiles = (files: File[], at?: number) => {
    const upload = services().upload
    if (!view || !files.length) return false
    if (!upload) {
      props.onError?.("Files cannot be added here.")
      return true
    }
    for (const file of files) {
      const temp = URL.createObjectURL(file)
      const isImage = file.type.startsWith("image/")
      const node = isImage
        ? schema.nodes.image!.create({ src: temp, alt: "" })
        : schema.nodes.file!.create({ src: temp, name: file.name, size: file.size, mime: file.type || null })
      if (at != null) {
        const $pos = view.state.doc.resolve(at)
        const pos = $pos.depth > 0 ? $pos.after(1) : at
        view.dispatch(view.state.tr.insert(pos, node))
      } else insertBlock(node)(view.state, view.dispatch)
      const findTemp = () => {
        let found: number | null = null
        view?.state.doc.descendants((n, pos) => {
          if (found != null) return false
          if ((n.type.name === "image" || n.type.name === "file") && n.attrs.src === temp) found = pos
          return found == null
        })
        return found
      }
      upload(file)
        .then((f) => {
          const pos = findTemp()
          if (pos == null || !view) return
          const n = view.state.doc.nodeAt(pos)!
          view.dispatch(
            view.state.tr.setNodeMarkup(pos, undefined, {
              ...n.attrs,
              src: f.src,
              blob: f.blob ?? null,
              ...(n.type.name === "file" ? { name: f.name, size: f.size ?? null, mime: f.mime ?? null } : {}),
            }),
          )
        })
        .catch((e) => {
          const pos = findTemp()
          if (pos != null && view) {
            const n = view.state.doc.nodeAt(pos)!
            view.dispatch(view.state.tr.delete(pos, pos + n.nodeSize))
          }
          props.onError?.(`Uploading ${file.name} failed: ${e?.message ?? e}`)
        })
        .finally(() => URL.revokeObjectURL(temp))
    }
    return true
  }

  const pickFiles = (accept: string) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = accept
    input.multiple = true
    input.onchange = () => uploadFiles(Array.from(input.files ?? []))
    input.click()
  }

  // ── Mount ────────────────────────────────────────────────────────────────────────────────────────

  // The view's node views are Solid renders: they need the editor's owner, and a render cannot run inside
  // `onSettled` (which forbids a nested flush), so the view is made in the next microtask.
  const owner = getOwner()
  onSettled(() =>
    queueMicrotask(() => {
      let initial: { doc?: PMNode; mapping?: Map<unknown, unknown> } = {}
      if (props.provider) {
        const frag = props.provider.doc.getXmlFragment(props.provider.fragment ?? "prosemirror")
        if (frag.length > 0) {
          const r = initProseMirrorDoc(frag, schema)
          initial = { doc: r.doc, mapping: r.mapping as Map<unknown, unknown> }
        }
      }
      view = runWithOwner(
        owner,
        () =>
          new EditorView(
            { mount },
            {
              state: buildState(initial.doc, initial.mapping),
              dispatchTransaction: dispatch,
              editable: () => !readOnly(),
              nodeViews: nodeViews({ services, readOnly, docVersion }),
              attributes: () => ({
                class: "nc-editor__content",
                "data-part": "editor-content",
                role: "textbox",
                "aria-multiline": "true",
                "aria-label": props["aria-label"] ?? "Document",
                ...(readOnly() ? { "aria-readonly": "true" } : {}),
              }),
              handleDOMEvents: {
                focus: () => {
                  setFocused(true)
                  props.onFocusChange?.(true)
                  setTick(0)
                  return false
                },
                blur: (_v, e) => {
                  const next = (e as FocusEvent).relatedTarget as Node | null
                  if (next && root.contains(next)) return false
                  setFocused(false)
                  props.onFocusChange?.(false)
                  setTick(0)
                  return false
                },
              },
              handlePaste: (v, event) => {
                if (readOnly()) return false
                const files = Array.from(event.clipboardData?.files ?? [])
                if (files.length) return uploadFiles(files)
                const html = event.clipboardData?.getData("text/html")
                const text = event.clipboardData?.getData("text/plain") ?? ""
                if (
                  !html &&
                  text &&
                  looksLikeMarkdown(text) &&
                  !v.state.selection.$from.parent.type.spec.code
                ) {
                  const doc = parseMarkdown(text)
                  v.dispatch(v.state.tr.replaceSelection(new Slice(doc.content, 1, 1)).scrollIntoView())
                  return true
                }
                return false
              },
              handleDrop: (v, event, _slice, moved) => {
                if (moved || readOnly()) return false
                const files = Array.from((event as DragEvent).dataTransfer?.files ?? [])
                if (!files.length) return false
                const pos = v.posAtCoords({
                  left: (event as DragEvent).clientX,
                  top: (event as DragEvent).clientY,
                })
                event.preventDefault()
                return uploadFiles(files, pos?.pos)
              },
              handleClickOn: (_v, _pos, node, _np, event) => {
                if (node.type.name === "mention" && (event.metaKey || event.ctrlKey || readOnly())) {
                  services().openMention?.(String(node.attrs.uri))
                  return true
                }
                return false
              },
              handleKeyDown: (v, e) => {
                // ProseMirror learns of a caret the browser moved (a click, End, an arrow key) from the
                // document's `selectionchange` event, a task Chromium may run after a key that is already
                // waiting: that key's command would then act where the caret was before (Enter split the first
                // heading instead of the paragraph clicked). Reading the DOM selection first keeps keys where
                // the caret is. `domObserver` is ProseMirror's own; `flush` is what its event handler calls.
                ;(v as unknown as { domObserver?: { flush(): void } }).domObserver?.flush()
                const sel = v.state.selection
                if (e.key === "Enter" && sel instanceof NodeSelection && sel.node.type.name === "mention") {
                  services().openMention?.(String(sel.node.attrs.uri))
                  return true
                }
                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && !readOnly()) {
                  e.preventDefault()
                  openLink()
                  return true
                }
                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j" && services().ai && !readOnly()) {
                  e.preventDefault()
                  openAi()
                  return true
                }
                if (
                  (e.metaKey || e.ctrlKey) &&
                  e.shiftKey &&
                  e.code === "Space" &&
                  services().dictate &&
                  !readOnly()
                ) {
                  e.preventDefault()
                  if (e.repeat) return true
                  // A short press starts and a second one finishes; holding the key records until it is let go.
                  const starting = !dictation
                  void toggleDictation()
                  if (starting) {
                    const pressed = Date.now()
                    const up = (k: KeyboardEvent) => {
                      if (k.code !== "Space") return
                      window.removeEventListener("keyup", up, true)
                      if (Date.now() - pressed > 400) dictation?.abort()
                    }
                    window.addEventListener("keyup", up, true)
                  }
                  return true
                }
                return false
              },
            },
          ),
      )
      // Repair tables the schema would not hold (a concurrent edit can leave a row short).
      const fixed = fixTables(view.state)
      if (fixed && !collab()) view.dispatch(fixed)
      lastJSON.current = JSON.stringify(view.state.doc.toJSON())
      // A presence colour given as a token becomes #rrggbb, which y-prosemirror's cursors take.
      const aw = props.provider?.awareness
      const own = aw?.getLocalState()?.user as CollabUser | undefined
      if (aw && own?.color && !props.user && !own.color.startsWith("#"))
        aw.setLocalStateField("user", { ...own, color: resolveColor(root, own.color) })
      if (props.autofocus) view.focus()
      props.ref?.(handle)
    }),
  )

  onCleanup(() => {
    abortAi()
    dictation?.abort()
    view?.destroy()
    view = undefined
  })

  // Plain mode: a new value from outside replaces the content.
  createEffect(
    () => props.value,
    (v) => {
      if (!view || collab() || v === undefined) return
      const json = JSON.stringify(v ?? null)
      if (json === lastJSON.current) return
      lastJSON.current = json
      const doc = docFromJSON(v)
      const state = view.state
      const tr = state.tr.replaceWith(0, state.doc.content.size, doc.content)
      tr.setMeta("addToHistory", false)
      const sel = Math.min(state.selection.from, tr.doc.content.size - 1)
      tr.setSelection(TextSelection.near(tr.doc.resolve(Math.max(1, sel))))
      view.updateState(state.apply(tr))
      setTick(0)
    },
    { defer: true },
  )

  // The provider says the caller may only view.
  createEffect(
    () => !!props.provider?.readOnly?.(),
    (readOnlyNow) => {
      setProviderReadOnly(readOnlyNow)
    },
  )
  createEffect(readOnly, () => {
    if (!view) return
    view.setProps({ editable: () => !readOnly() })
    view.dispatch(view.state.tr.setMeta("nc-editor-readonly", readOnly()))
  })

  // Collaborative mode: the local user's name and colour for the others.
  createEffect(
    () => ({ user: props.user, provider: props.provider }),
    ({ user, provider }) => {
      if (!user || !provider) return
      const color = untrack(() => (root ? resolveColor(root, user.color) : user.color))
      provider.awareness.setLocalStateField("user", { name: user.name, color })
    },
  )

  // ── Handle ───────────────────────────────────────────────────────────────────────────────────────

  const handle: RichTextEditorHandle = {
    get view() {
      return view!
    },
    focus: () => view?.focus(),
    getJSON: () => (view?.state.doc.toJSON() ?? { type: "doc", content: [] }) as RichTextJSON,
    insertText: (text) => {
      if (view) view.dispatch(view.state.tr.insertText(text).scrollIntoView())
    },
    setContent: (doc) => {
      if (!view) return
      const d = docFromJSON(doc)
      view.dispatch(view.state.tr.replaceWith(0, view.state.doc.content.size, d.content))
    },
    run: (c) => (view ? c(view.state, view.dispatch, view) : false),
    askAI: () => openAi(),
  }

  // ── Triggers: the / menu and the @ picker ────────────────────────────────────────────────────────

  const runCommand = (c: Command) => {
    if (view) c(view.state, view.dispatch, view)
    view?.focus()
  }

  const insertItems = createMemo((): InsertItem[] => {
    tick()
    const s = services()
    const items: InsertItem[] = [
      {
        id: "text",
        title: "Text",
        description: "Plain paragraph",
        icon: "type",
        group: "Basic blocks",
        run: () => runCommand(turnInto("text")),
      },
      {
        id: "h1",
        title: "Heading 1",
        description: "Large section heading",
        icon: "heading-1",
        key: "#",
        group: "Basic blocks",
        run: () => runCommand(turnInto("h1")),
      },
      {
        id: "h2",
        title: "Heading 2",
        description: "Medium section heading",
        icon: "heading-2",
        key: "##",
        group: "Basic blocks",
        run: () => runCommand(turnInto("h2")),
      },
      {
        id: "h3",
        title: "Heading 3",
        description: "Small section heading",
        icon: "heading-3",
        key: "###",
        group: "Basic blocks",
        run: () => runCommand(turnInto("h3")),
      },
      {
        id: "task",
        title: "To-do list",
        description: "Track tasks with checkboxes",
        icon: "list-todo",
        key: "[]",
        keywords: "todo checkbox task",
        group: "Basic blocks",
        run: () => runCommand(turnInto("task")),
      },
      {
        id: "bullet",
        title: "Bulleted list",
        description: "A simple list",
        icon: "list",
        key: "-",
        keywords: "ul unordered",
        group: "Basic blocks",
        run: () => runCommand(turnInto("bullet")),
      },
      {
        id: "ordered",
        title: "Numbered list",
        description: "A list with numbers",
        icon: "list-ordered",
        key: "1.",
        keywords: "ol ordered",
        group: "Basic blocks",
        run: () => runCommand(turnInto("ordered")),
      },
      {
        id: "quote",
        title: "Quote",
        description: "Capture a quote",
        icon: "quote",
        key: ">",
        keywords: "blockquote",
        group: "Basic blocks",
        run: () => runCommand(turnInto("quote")),
      },
      {
        id: "callout",
        title: "Callout",
        description: "Make text stand out",
        icon: "info",
        key: "!>",
        keywords: "note warning info",
        group: "Basic blocks",
        run: () => runCommand(turnInto("callout")),
      },
      {
        id: "code",
        title: "Code",
        description: "Syntax-highlighted snippet",
        icon: "code",
        key: "```",
        keywords: "snippet pre",
        group: "Basic blocks",
        run: () => runCommand(turnInto("code")),
      },
      {
        id: "divider",
        title: "Divider",
        description: "Separate sections",
        icon: "minus",
        key: "---",
        keywords: "hr rule line",
        group: "Basic blocks",
        run: () => runCommand(insertBlock(schema.nodes.horizontal_rule!.create())),
      },
      {
        id: "table",
        title: "Table",
        description: "Rows and columns",
        icon: "table",
        keywords: "grid",
        group: "Basic blocks",
        run: () => runCommand(insertBlock(makeTable())),
      },
    ]
    if (s.upload) {
      items.push(
        {
          id: "image",
          title: "Image",
          description: "Upload or paste a picture",
          icon: "image",
          keywords: "picture photo",
          group: "Media",
          run: () => pickFiles("image/*"),
        },
        {
          id: "file",
          title: "File",
          description: "Attach a file",
          icon: "file",
          keywords: "attachment upload",
          group: "Media",
          run: () => pickFiles("*/*"),
        },
      )
    }
    if (s.searchMentions) {
      items.push({
        id: "mention",
        title: "Mention",
        description: "Link a person, page or anything",
        icon: "at-sign",
        key: "@",
        keywords: "link person entity",
        group: "Media",
        run: () => {
          if (!view) return
          view.dispatch(openTrigger(view.state.tr.insertText("@"), "@"))
          view.focus()
        },
      })
    }
    if (s.ai)
      items.push({
        id: "ai",
        title: aiCopy().label,
        description: aiCopy().description,
        icon: "sparkle",
        key: "⌘J",
        keywords: "ai assistant write generate",
        group: aiCopy().group,
        run: () => openAi(),
      })
    if (s.dictate)
      items.push({
        id: "dictate",
        title: "Dictate",
        description: "Speak to write at the cursor",
        icon: "mic",
        key: "⌘⇧␣",
        keywords: "voice speech microphone",
        group: aiCopy().group,
        run: () => toggleDictation(),
      })
    for (const b of s.blocks?.() ?? []) {
      if (!b.available || !b.component) continue
      items.push({
        id: `block:${b.id}`,
        title: b.title,
        description: b.description,
        icon: b.icon !== undefined && b.icon in ICON_PATHS ? (b.icon as IconName) : "box",
        keywords: [b.id, ...(b.keywords ?? [])].join(" "),
        group: "Plugins",
        run: () =>
          runCommand(
            insertBlock(schema.nodes.plugin_block!.create({ type: b.id, attrs: { ...(b.defaults ?? {}) } })),
          ),
      })
    }
    return items
  })

  const slashItems = createMemo(() => {
    const t = trigger()
    return t?.kind === "/" ? filterItems(insertItems(), t.query) : []
  })

  const [mentionItems, setMentionItems] = createSignal<MentionItem[]>([])
  const [active, setActive] = createSignal(0)
  let searchTimer: ReturnType<typeof setTimeout> | undefined
  let searchSeq = 0
  createEffect(
    () => {
      const t = trigger()
      return t?.kind === "@" || t?.kind === "[[" ? `${t.kind} ${t.query}` : null
    },
    (key) => {
      setActive(0)
      clearTimeout(searchTimer)
      if (key == null) {
        setMentionItems([])
        return
      }
      const kind = key.startsWith("[[") ? "[[" : "@"
      const q = key.slice(kind.length + 1)
      const search = kind === "[[" ? services().links?.search : services().searchMentions
      if (!search) {
        setMentionItems([])
        return
      }
      const seq = ++searchSeq
      searchTimer = setTimeout(() => {
        search(q)
          .then((r) => seq === searchSeq && setMentionItems(r.slice(0, 8)))
          .catch(() => seq === searchSeq && setMentionItems([]))
      }, 80)
    },
  )
  createEffect(
    () => trigger()?.kind === "/" && trigger()?.query,
    () => {
      setActive(0)
    },
  )

  const clearTriggerText = (t: Trigger) => {
    if (!view) return
    view.dispatch(closeTrigger(view.state.tr.delete(t.from, t.to)))
  }
  const pickInsert = (item: InsertItem) => {
    const t = trigger()
    if (t) clearTriggerText(t)
    item.run(view!)
  }
  /** `[[` offers to make a page when the query matches no title exactly. */
  const createOption = () => {
    const t = trigger()
    const q = t?.kind === "[[" ? t.query.trim() : ""
    if (!q || !services().links?.create) return null
    const lower = q.toLowerCase()
    return mentionItems().some((m) => m.title.trim().toLowerCase() === lower) ? null : q
  }
  const pickCreate = async (title: string) => {
    const t = trigger()
    const create = services().links?.create
    if (!t || !view || !create) return
    const typed = view.state.doc.textBetween(t.from, t.to)
    view.dispatch(closeTrigger(view.state.tr))
    try {
      const m = await create(title)
      if (!view) return
      const node = schema.nodes.mention!.create({ uri: m.uri, label: m.title })
      const doc = view.state.doc
      // Where `[[title` was typed, unless the document changed there meanwhile.
      const same = t.to <= doc.content.size && doc.textBetween(t.from, t.to) === typed
      const tr = same
        ? view.state.tr.replaceWith(t.from, t.to, [node, schema.text(" ")])
        : view.state.tr.replaceSelectionWith(node)
      view.dispatch(tr.scrollIntoView())
      view.focus()
    } catch (e: any) {
      props.onError?.(`The page could not be made: ${e?.message ?? e}`)
    }
  }
  const pickMention = (m: MentionItem) => {
    const t = trigger()
    if (!t || !view) return
    const node = schema.nodes.mention!.create({ uri: m.uri, label: m.title })
    const tr = view.state.tr.replaceWith(t.from, t.to, [node, schema.text(" ")])
    view.dispatch(closeTrigger(tr).scrollIntoView())
    view.focus()
  }

  const menuOpen = () => {
    const t = trigger()
    if (!t || readOnly()) return false
    if (t.kind === "/") return slashItems().length > 0
    return t.kind === "[[" ? !!services().links : !!services().searchMentions
  }

  createEffect(menuOpen, (open) => {
    if (!open) {
      if (menuKeys.current === triggerKeys) menuKeys.current = null
      return
    }
    menuKeys.current = triggerKeys
  })
  function triggerKeys(e: KeyboardEvent): boolean {
    const t = trigger()
    if (!t || !view) return false
    const count =
      t.kind === "/"
        ? slashItems().length
        : mentionItems().length + (t.kind === "[[" && createOption() ? 1 : 0)
    if (e.key === "ArrowDown") {
      setActive((a) => (count ? (a + 1) % count : 0))
      return true
    }
    if (e.key === "ArrowUp") {
      setActive((a) => (count ? (a - 1 + count) % count : 0))
      return true
    }
    if (e.key === "Enter" || e.key === "Tab") {
      if (!count) return false
      if (t.kind === "/") pickInsert(slashItems()[active()]!)
      else if (active() < mentionItems().length) pickMention(mentionItems()[active()]!)
      else void pickCreate(createOption()!)
      return true
    }
    if (e.key === "Escape") {
      view.dispatch(closeTrigger(view.state.tr))
      return true
    }
    return false
  }

  const triggerPos = createMemo(() => {
    tick()
    const t = trigger()
    if (!t || !view) return null
    try {
      return rel(view.coordsAtPos(t.from))
    } catch {
      return null
    }
  })

  // ── Format bar ───────────────────────────────────────────────────────────────────────────────────

  const [linkOpen, setLinkOpen] = createSignal<{ href: string } | null>(null)
  const [aiOpen, setAiOpen] = createSignal(false)

  const formatPos = createMemo(() => {
    tick()
    if (!view || readOnly() || aiOpen()) return null
    const sel = view.state.selection
    if (sel.empty || sel instanceof NodeSelection || !(focused() || linkOpen())) return null
    if (sel.$from.parent.type.spec.code) return null
    try {
      const a = view.coordsAtPos(sel.from)
      const b = view.coordsAtPos(sel.to)
      const top = Math.min(a.top, b.top)
      const oneLine = a.top === b.top
      const left = oneLine ? (a.left + b.left) / 2 : a.left
      return { ...rel({ left, top, bottom: Math.max(a.bottom, b.bottom) }), oneLine }
    } catch {
      return null
    }
  })

  // The bar is centred over a one-line selection and starts at a longer one, inside the editor either way.
  const [barWidth, setBarWidth] = createSignal(360)
  const barLeft = (p: { left: number; oneLine: boolean }) => {
    const w = barWidth()
    const want = p.oneLine ? p.left : p.left + w / 2
    const max = Math.max(w / 2, root.clientWidth - w / 2)
    return Math.min(Math.max(want, w / 2), max)
  }

  const isActive = (mark: string) => {
    tick()
    return view ? markActive(view.state, schema.marks[mark]!) : false
  }
  const toggle = (mark: string) => () => {
    if (!view) return
    const t = schema.marks[mark]!
    const { from, to } = view.state.selection
    const has = markActive(view.state, t)
    view.dispatch(has ? view.state.tr.removeMark(from, to, t) : view.state.tr.addMark(from, to, t.create()))
    view.focus()
  }

  const [textButton, setTextButton] = createSignal<HTMLButtonElement>()
  const [kindMenu, setKindMenu] = createSignal(false)
  const kind = () => {
    tick()
    return view ? blockKind(view.state) : "text"
  }

  const openLink = () => {
    if (!view) return
    const { $from } = view.state.selection
    const link =
      schema.marks.link!.isInSet($from.marks()) ??
      schema.marks.link!.isInSet(view.state.doc.resolve(view.state.selection.from + 1).marks())
    setLinkOpen({ href: String(link?.attrs.href ?? "") })
  }

  // ── Block handles ────────────────────────────────────────────────────────────────────────────────
  // Every block has a handle, nested ones too (a block in a callout, a list item). Dragging it is a pointer
  // gesture of our own, not the browser's drag and drop: the block dims in place, a 2px line shows where it
  // lands and at which level, a small chip follows the pointer, the page scrolls near its edges and Escape
  // cancels. A touch drag starts with a long press. Where it lands is decided in `blockdrag.ts`.

  /** From a block's handle to its content edge: the handle column's width and the gap after it. */
  const GUTTER = 44
  const LONG_PRESS = 500
  const [hover, setHover] = createSignal<{ pos: number; top: number; left: number } | null>(null)
  const [blockMenu, setBlockMenu] = createSignal<number | null>(null)
  const [dragButton, setDragButton] = createSignal<HTMLButtonElement>()
  const handles = () => variant() === "page" && !readOnly()
  const isItem = (n: PMNode | null | undefined) =>
    n?.type.name === "list_item" || n?.type.name === "task_item"

  const geometry: BlockGeometry = (pos) => {
    const dom = view?.nodeDOM(pos)
    return dom instanceof HTMLElement ? dom.getBoundingClientRect() : null
  }

  /** Where the handle of the block at `pos` sits: left of the block, or of a list item's marker. */
  const handleFor = (pos: number) => {
    if (!view || pos > view.state.doc.content.size) return null
    const r = geometry(pos)
    if (!r) return null
    const $pos = view.state.doc.resolve(pos)
    const anchor = isItem($pos.nodeAfter) ? (geometry($pos.before())?.left ?? r.left) : r.left
    const box = root.getBoundingClientRect()
    // A full-width block starts at the editor's edge: its handle sits inside it.
    return { pos, top: r.top - box.top, left: Math.max(0, anchor - GUTTER - box.left) }
  }

  let hoverFrame = 0
  // A mouse shows the handle of the block it is over; a touch screen, of the block last touched.
  const onMouseMove = (e: MouseEvent | PointerEvent) => {
    if (!handles() || blockMenu() != null || gesture) return
    if ("pointerType" in e && e.pointerType !== "touch") return
    if ((e.target as HTMLElement).closest("[data-part=block-handle]")) return
    const { clientX, clientY } = e
    cancelAnimationFrame(hoverFrame)
    hoverFrame = requestAnimationFrame(() => {
      if (!view || gesture) return
      const pos = blockAt(view.state.doc, geometry, clientX, clientY, GUTTER)
      setHover(pos == null ? null : handleFor(pos))
    })
  }

  const addBelow = () => {
    const h = hover()
    if (!view || !h) return
    const node = view.state.doc.nodeAt(h.pos)
    if (!node) return
    const after = h.pos + node.nodeSize
    const tr = view.state.tr
    let at: number
    if (node.type.name === "paragraph" && node.content.size === 0) at = h.pos + 1
    else if (isItem(node)) {
      const attrs = node.type.name === "task_item" ? { checked: false } : null
      tr.insert(after, node.type.create(attrs, schema.nodes.paragraph!.create()))
      at = after + 2
    } else {
      tr.insert(after, schema.nodes.paragraph!.create())
      at = after + 1
    }
    tr.setSelection(TextSelection.create(tr.doc, at))
    tr.insertText("/")
    view.dispatch(openTrigger(tr, "/"))
    view.focus()
  }

  const selectBlock = (pos: number) => {
    if (!view) return
    view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos)))
  }

  // The drag. `gesture` is the pointer's bookkeeping from press to release; it has a `source` once the block
  // is being dragged (a mouse moved 4px, a finger held still for LONG_PRESS).
  let gesture: {
    pointerId: number
    touch: boolean
    startX: number
    startY: number
    x: number
    y: number
    source: BlockRange | null
    /** From the pointer to the dragged block's content edge, so moving straight down keeps the level. */
    grabDX: number
    target: DropTarget | null
    timer?: ReturnType<typeof setTimeout>
  } | null = null
  let swallowClick = false
  let scrollFrame = 0
  const [dragChip, setDragChip] = createSignal<{
    kind: string
    text: string
    x: number
    y: number
    touch: boolean
  } | null>(null)
  const [dropLine, setDropLine] = createSignal<{ top: number; left: number; width: number } | null>(null)

  const updateDrag = () => {
    if (!view || !gesture?.source) return
    const source = blockDragKey.getState(view.state)
    if (!source) return endGesture()
    gesture.source = source
    const { x, y } = gesture
    setDragChip((c) => c && { ...c, x, y })
    const box = root.getBoundingClientRect()
    const outside = x < box.left - GUTTER || x > box.right + GUTTER
    const t = outside ? null : dropTarget(view.state.doc, geometry, source, x + gesture.grabDX, y)
    gesture.target = t
    setDropLine(t ? { top: t.y - box.top - 1, left: t.left - box.left, width: t.right - t.left } : null)
  }

  /** The element that scrolls the editor: the nearest scrolling ancestor, or the page. */
  const scroller = (): HTMLElement | null => {
    for (let el = root.parentElement; el; el = el.parentElement) {
      const o = getComputedStyle(el).overflowY
      if ((o === "auto" || o === "scroll") && el.scrollHeight > el.clientHeight) return el
    }
    return null
  }

  const autoScroll = () => {
    const el = scroller()
    const EDGE = 56
    const step = () => {
      if (!gesture?.source) return
      const r = el?.getBoundingClientRect()
      const top = Math.max(0, r?.top ?? 0)
      const bottom = Math.min(window.innerHeight, r?.bottom ?? window.innerHeight)
      const y = gesture.y
      // Only while there is more of the editor beyond that edge: a page around it does not scroll on.
      const own = root.getBoundingClientRect()
      const near =
        y < top + EDGE && own.top < top
          ? -(top + EDGE - y)
          : y > bottom - EDGE && own.bottom > bottom
            ? y - (bottom - EDGE)
            : 0
      if (near) {
        const dy = Math.sign(near) * Math.ceil(Math.min(1.5, Math.abs(near) / EDGE) * 16)
        const before = el ? el.scrollTop : window.scrollY
        if (el) el.scrollTop += dy
        else window.scrollBy(0, dy)
        if ((el ? el.scrollTop : window.scrollY) !== before) updateDrag()
      }
      scrollFrame = requestAnimationFrame(step)
    }
    scrollFrame = requestAnimationFrame(step)
  }

  const onDragKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return
    e.preventDefault()
    e.stopPropagation()
    endGesture()
  }

  const beginDrag = () => {
    const h = hover()
    if (!view || !gesture || !h) return endGesture()
    const state = view.state
    const node = state.doc.nodeAt(h.pos)
    if (!node) return endGesture()
    let source: BlockRange = { from: h.pos, to: h.pos + node.nodeSize }
    // A selection over several blocks that takes in this one moves with it.
    if (!state.selection.empty) {
      const r = unitsAt(state)
      if (
        r &&
        r.from <= source.from &&
        r.to >= source.to &&
        state.doc.resolve(r.from).sameParent(state.doc.resolve(source.from))
      )
        source = r
    }
    const edge = geometry(isItem(node) ? source.from + 1 : source.from)
    gesture.grabDX = (edge?.left ?? gesture.startX) - gesture.startX
    gesture.source = source
    swallowClick = true
    view.dispatch(state.tr.setMeta(blockDragKey, source))
    setDragChip({ ...dragLabel(state.doc, source), x: gesture.x, y: gesture.y, touch: gesture.touch })
    window.addEventListener("keydown", onDragKey, true)
    autoScroll()
    updateDrag()
  }

  /** Ends the press: drops the block when `drop` and there is a target, otherwise puts everything back. */
  function endGesture(drop = false) {
    const g = gesture
    gesture = null
    if (!g) return
    clearTimeout(g.timer)
    cancelAnimationFrame(scrollFrame)
    window.removeEventListener("keydown", onDragKey, true)
    setDragChip(null)
    setDropLine(null)
    if (g.source && view) {
      const source = blockDragKey.getState(view.state)
      const moved = drop && source && g.target ? moveBlocks(view.state, source, g.target.pos) : null
      // The move and the end of the dimming are one transaction: one undo step, one update for others.
      view.dispatch((moved ?? view.state.tr).setMeta(blockDragKey, null))
      setHover(null)
      setTimeout(() => (swallowClick = false), 300)
    }
  }

  const onHandleDown = (e: PointerEvent) => {
    if (e.button !== 0 || !view || !hover() || gesture) return
    const touch = e.pointerType === "touch"
    // A mouse press must not start a text selection or move the caret.
    if (!touch) e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    gesture = {
      pointerId: e.pointerId,
      touch,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      source: null,
      grabDX: 0,
      target: null,
    }
    if (touch) gesture.timer = setTimeout(beginDrag, LONG_PRESS)
  }

  const onHandleMove = (e: PointerEvent) => {
    if (!gesture || e.pointerId !== gesture.pointerId) return
    gesture.x = e.clientX
    gesture.y = e.clientY
    if (!gesture.source) {
      const moved = Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY)
      if (gesture.touch) {
        if (moved > 8) endGesture()
        return
      }
      if (moved < 4) return
      beginDrag()
      return
    }
    updateDrag()
  }

  const onHandleUp = (e: PointerEvent) => {
    if (gesture && e.pointerId === gesture.pointerId) endGesture(true)
  }

  onCleanup(() => {
    cancelAnimationFrame(hoverFrame)
    if (gesture) {
      clearTimeout(gesture.timer)
      cancelAnimationFrame(scrollFrame)
      window.removeEventListener("keydown", onDragKey, true)
      gesture = null
    }
  })

  /** The block menu acts on a NodeSelection of its block; this is that state, for enabling items. */
  const withBlockSelected = (pos: number) =>
    view!.state.apply(view!.state.tr.setSelection(NodeSelection.create(view!.state.doc, pos)))

  const blockMenuItems = createMemo((): MenuEntry[] => {
    tick()
    const pos = blockMenu()
    if (pos == null || !view || pos >= view.state.doc.content.size) return []
    const node = view.state.doc.nodeAt(pos)
    if (!node) return []
    const $pos = view.state.doc.resolve(pos)
    // A list nested in an item would turn into its outer list's item; such items keep their kind.
    const nestedItem = isItem(node) && $pos.depth >= 2 && isItem($pos.node($pos.depth - 1))
    const items: MenuEntry[] = []
    if (
      !nestedItem &&
      (node.isTextblock ||
        [
          "bullet_list",
          "ordered_list",
          "task_list",
          "blockquote",
          "callout",
          "list_item",
          "task_item",
        ].includes(node.type.name))
    ) {
      items.push({ type: "label", label: "Turn into" })
      for (const k of ["text", "h1", "h2", "h3", "bullet", "ordered", "task", "quote", "callout", "code"])
        items.push({ id: `into:${k}`, label: KIND_LABEL[k]! })
      items.push({ type: "separator" })
    }
    if (node.type.name === "callout") {
      items.push({ type: "label", label: "Colour" })
      for (const t of ["info", "success", "warning", "danger"])
        items.push({
          id: `tone:${t}`,
          label: t[0]!.toUpperCase() + t.slice(1),
          checked: node.attrs.tone === t,
        })
      items.push({ type: "separator" })
    }
    if ($pos.depth === 0 && variant() === "page") {
      const choices = widthChoices(policyOf(node), forcedOf(node))
      if (choices.length) {
        const current = widthOf(node)
        items.push({ type: "label", label: "Width" })
        for (const w of choices)
          items.push({ id: `width:${w}`, label: BLOCK_WIDTH_LABEL[w], checked: current === w })
        items.push({ type: "separator" })
      }
    }
    if (node.type.name === "table") {
      items.push(
        { id: "table:row", label: "Add a row below" },
        { id: "table:col", label: "Add a column right" },
        { id: "table:delrow", label: "Delete the row" },
        { id: "table:delcol", label: "Delete the column" },
        { type: "separator" },
      )
    }
    const sel = withBlockSelected(pos)
    items.push(
      { id: "duplicate", label: "Duplicate", shortcut: "" },
      { id: "up", label: "Move up", shortcut: "Alt ↑", disabled: !moveBlock(-1)(sel) },
      { id: "down", label: "Move down", shortcut: "Alt ↓", disabled: !moveBlock(1)(sel) },
      { type: "separator" },
      { id: "delete", label: "Delete", danger: true, shortcut: "Del" },
    )
    return items
  })

  const onBlockMenu = (id: string) => {
    const pos = blockMenu()
    setBlockMenu(null)
    if (pos == null || !view) return
    const node = view.state.doc.nodeAt(pos)
    if (!node) return
    const into = (k: string) => {
      const inner = node.isAtom ? pos : pos + 1
      const $pos = view!.state.doc.resolve(pos)
      view!.dispatch(
        view!.state.tr.setSelection(
          TextSelection.near(view!.state.doc.resolve(Math.min(inner + 1, pos + node.nodeSize - 1))),
        ),
      )
      // Wrappers around the block stay: a paragraph in a callout turned into a heading stays in the callout.
      runCommand(turnInto(k, undefined, isItem(node) ? $pos.depth - 1 : $pos.depth))
    }
    if (id.startsWith("into:")) return into(id.slice(5))
    if (id.startsWith("width:")) {
      const w = id.slice(6)
      if (isBlockWidth(w))
        view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, blockWidth: w }))
      return view.focus()
    }
    if (id.startsWith("tone:")) {
      view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, tone: id.slice(5) }))
      return view.focus()
    }
    if (id.startsWith("table:")) {
      view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(pos + 3))))
      const c = { row: addRowAfter, col: addColumnAfter, delrow: deleteRow, delcol: deleteColumn }[
        id.slice(6) as "row"
      ]
      if (isInTable(view.state)) runCommand(c)
      return
    }
    switch (id) {
      case "duplicate":
        view.dispatch(view.state.tr.insert(pos + node.nodeSize, node.copy(node.content)))
        break
      case "up":
      case "down":
        selectBlock(pos)
        runCommand(moveBlock(id === "up" ? -1 : 1))
        break
      case "delete":
        view.dispatch(deleteBlocks(view.state, { from: pos, to: pos + node.nodeSize }))
        break
    }
    view.focus()
  }

  // ── Mention previews ─────────────────────────────────────────────────────────────────────────────

  const [preview, setPreview] = createSignal<{
    uri: string
    label: string
    left: number
    top: number
  } | null>(null)
  let previewTimer: ReturnType<typeof setTimeout> | undefined
  const onMouseOver = (e: MouseEvent) => {
    const el = (e.target as HTMLElement).closest("[data-mention]") as HTMLElement | null
    if (!el || !services().MentionPreview) return
    clearTimeout(previewTimer)
    previewTimer = setTimeout(() => {
      const r = el.getBoundingClientRect()
      const p = rel(r)
      setPreview({ uri: el.dataset.mention!, label: el.textContent ?? "", left: p.left, top: p.bottom + 6 })
    }, 350)
  }
  const onMouseOut = (e: MouseEvent) => {
    const to = e.relatedTarget as HTMLElement | null
    if (to?.closest("[data-part=mention-preview]") || to?.closest("[data-mention]")) return
    clearTimeout(previewTimer)
    previewTimer = setTimeout(() => setPreview(null), 200)
  }

  // ── The writing assistant ────────────────────────────────────────────────────────────────────────

  const [aiPrompt, setAiPrompt] = createSignal("")
  const [aiStatus, setAiStatus] = createSignal<"idle" | "streaming" | "done" | "error">("idle")
  const [aiText, setAiText] = createSignal("")
  const [aiError, setAiError] = createSignal("")
  const [aiAsked, setAiAsked] = createSignal("")
  let aiAbort: AbortController | null = null
  let aiInput: HTMLInputElement | undefined

  const abortAi = () => {
    aiAbort?.abort()
    aiAbort = null
  }
  const openAi = () => {
    if (!view || !services().ai || readOnly()) return
    const { from, to } = view.state.selection
    setSuggestionRange(view, { from, to })
    setAiOpen(true)
    setAiStatus("idle")
    setAiText("")
    setAiPrompt("")
    queueMicrotask(() => aiInput?.focus())
  }
  const closeAi = () => {
    abortAi()
    setAiOpen(false)
    setAiStatus("idle")
    setAiText("")
    if (view) setSuggestionRange(view, null)
    view?.focus()
  }
  const runAi = async (action: AiRequest["action"], instruction: string) => {
    const ai = services().ai
    if (!ai || !view) return
    abortAi()
    const ctrl = new AbortController()
    aiAbort = ctrl
    const range = suggestionKey.getState(view.state) ?? {
      from: view.state.selection.from,
      to: view.state.selection.to,
    }
    const doc = view.state.doc
    const selection = doc.textBetween(range.from, range.to, "\n\n", " ")
    const before = doc.textBetween(Math.max(0, range.from - 4000), range.from, "\n\n", " ")
    const after = doc.textBetween(range.to, Math.min(doc.content.size, range.to + 2000), "\n\n", " ")
    setAiAsked(instruction)
    setAiStatus("streaming")
    setAiText("")
    setAiError("")
    try {
      for await (const chunk of ai({ action, instruction, selection, before, after, signal: ctrl.signal })) {
        if (ctrl.signal.aborted) return
        setAiText((t) => t + chunk)
      }
      if (!ctrl.signal.aborted) setAiStatus("done")
    } catch (e: any) {
      if (ctrl.signal.aborted) return
      setAiStatus("error")
      setAiError(String(e?.message ?? e))
      props.onError?.(`${aiCopy().label} failed: ${e?.message ?? e}`)
    }
  }
  const acceptAi = () => {
    if (!view) return
    const range = suggestionKey.getState(view.state)
    const text = aiText().replace(/\s+$/, "")
    if (!range || !text) return closeAi()
    const tr = view.state.tr
    if (/\n\s*\n/.test(text) || looksLikeMarkdown(text)) {
      const doc = parseMarkdown(text)
      const single = doc.childCount === 1 && doc.firstChild!.type.name === "paragraph"
      tr.replaceRange(
        range.from,
        range.to,
        single ? new Slice(doc.firstChild!.content, 0, 0) : new Slice(doc.content, 1, 1),
      )
    } else {
      tr.insertText(text, range.from, range.to)
    }
    tr.setMeta(suggestionKey, { set: null })
    view.dispatch(tr.scrollIntoView())
    abortAi()
    setAiOpen(false)
    setAiStatus("idle")
    setAiText("")
    view.focus()
  }
  const aiRange = createMemo(() => {
    tick()
    return view ? suggestionKey.getState(view.state) : null
  })
  const aiPos = createMemo(() => {
    tick()
    const r = aiRange()
    if (!view || !r || !aiOpen()) return null
    try {
      const $to = view.state.doc.resolve(r.to)
      const end = $to.depth > 0 ? $to.end(1) : r.to
      const c = view.coordsAtPos(end)
      const start = view.coordsAtPos(r.from)
      const box = view.dom.getBoundingClientRect()
      return { ...rel({ left: box.left, top: c.top, bottom: c.bottom }), startTop: rel(start).top }
    } catch {
      return null
    }
  })
  const hasSelection = () => {
    const r = aiRange()
    return !!r && r.to > r.from
  }

  // ── Dictation ────────────────────────────────────────────────────────────────────────────────────

  let dictation: AbortController | null = null
  const [dictating, setDictating] = createSignal(false)
  const toggleDictation = async () => {
    const dictate = services().dictate
    if (!dictate || !view) return
    if (dictation) {
      dictation.abort()
      return
    }
    const ctrl = new AbortController()
    dictation = ctrl
    setDictating(true)
    view.focus()
    try {
      for await (const text of dictate({ signal: ctrl.signal })) {
        if (!view || readOnly()) break
        view.dispatch(view.state.tr.insertText(text).scrollIntoView())
      }
    } catch (e: any) {
      if (!ctrl.signal.aborted) props.onError?.(`Dictation failed: ${e?.message ?? e}`)
    } finally {
      dictation = null
      setDictating(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────────────────────────

  const groups = (items: InsertItem[]) => {
    const out: Array<{ group: string; items: Array<{ item: InsertItem; index: number }> }> = []
    items.forEach((item, index) => {
      let g = out.find((x) => x.group === item.group)
      if (!g) {
        g = { group: item.group, items: [] }
        out.push(g)
      }
      g.items.push({ item, index })
    })
    return out
  }

  return (
    <div
      ref={root}
      id={props.id}
      class={cx("nc-editor", `nc-editor--${variant()}`, readOnly() && "nc-editor--readonly", props.class)}
      data-part="rich-text-editor"
      data-mode={collab() ? "collaborative" : "plain"}
      data-readonly={readOnly() ? "" : undefined}
      onMouseMove={onMouseMove}
      onPointerDown={onMouseMove}
      onMouseLeave={() => blockMenu() == null && !gesture && setHover(null)}
      onPointerOver={onMouseOver}
      onPointerOut={onMouseOut}
      onClick={(e) => {
        const el = (e.target as HTMLElement).closest("[data-annotation]") as HTMLElement | null
        if (el && props.onAnnotationClick) props.onAnnotationClick(el.dataset.annotation!)
      }}
    >
      <div ref={mount} class="nc-editor__mount" />

      <Show when={handles() && hover()}>
        {(h) => (
          <div
            class={cx("nc-editor-handle", dragChip() && "nc-editor-handle--dragging")}
            data-part="block-handle"
            style={{ top: `${h().top}px`, left: `${h().left}px` }}
          >
            <button
              type="button"
              class="nc-editor-handle__btn"
              aria-label="Add a block below"
              data-part="block-add"
              onMouseDown={(e) => e.preventDefault()}
              onClick={addBelow}
            >
              <Icon name="plus" size="sm" />
            </button>
            <button
              ref={setDragButton}
              type="button"
              class="nc-editor-handle__btn nc-editor-handle__drag"
              aria-label="Drag to move, click for options"
              data-part="block-drag"
              onPointerDown={onHandleDown}
              onPointerMove={onHandleMove}
              onPointerUp={onHandleUp}
              onPointerCancel={() => endGesture()}
              onLostPointerCapture={() => gesture && endGesture()}
              onContextMenu={(e) => e.preventDefault()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => {
                if (swallowClick) return
                selectBlock(h().pos)
                setBlockMenu(h().pos)
              }}
            >
              <Icon name="grip-vertical" />
            </button>
          </div>
        )}
      </Show>
      <Show when={dropLine()}>
        {(l) => (
          <div
            class="nc-editor-drop-line"
            data-part="drop-indicator"
            style={{ top: `${l().top}px`, left: `${l().left}px`, width: `${l().width}px` }}
          />
        )}
      </Show>
      <Show when={dragChip()}>
        {(c) => (
          <Overlay anchor={root}>
            <div
              class="nc-editor-drag-chip"
              data-part="drag-chip"
              // Beside the pointer; above a finger, which would cover it.
              style={{ left: `${c().x + 14}px`, top: `${c().y + (c().touch ? -56 : 12)}px` }}
            >
              <span class="nc-editor-drag-chip__kind label">{c().kind}</span>
              <Show when={c().text}>
                <span class="nc-editor-drag-chip__text body">{c().text}</span>
              </Show>
            </div>
          </Overlay>
        )}
      </Show>
      <Menu
        open={blockMenu() != null}
        anchor={dragButton()}
        placement="bottom-start"
        label="Block"
        items={blockMenuItems()}
        onSelect={onBlockMenu}
        minWidth="220px"
        class="nc-block-menu"
        onClose={() => {
          setBlockMenu(null)
          view?.focus()
        }}
      />

      <Show when={menuOpen() && trigger()?.kind === "/" && triggerPos()}>
        {(p) => (
          <div
            class="nc-menu nc-editor-slash"
            role="listbox"
            aria-label="Insert block"
            data-part="slash-menu"
            style={{ left: `${p().left}px`, top: `${p().bottom + 6}px` }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <For each={groups(slashItems())}>
              {(g) => (
                <>
                  <span class="nc-menu__label">{g.group}</span>
                  <For each={g.items}>
                    {({ item, index }) => (
                      <button
                        type="button"
                        role="option"
                        aria-selected={aria(active() === index)}
                        class={cx(
                          "nc-editor-slash__item",
                          active() === index && "nc-editor-slash__item--active",
                        )}
                        data-item={item.id}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => pickInsert(item)}
                      >
                        <span class="nc-editor-slash__glyph">
                          <Icon name={item.icon} />
                        </span>
                        <span class="nc-editor-slash__text">
                          <span class="body">{item.title}</span>
                          <Show when={item.description}>
                            <span class="nc-editor-slash__desc section">{item.description}</span>
                          </Show>
                        </span>
                        <Show when={item.key}>
                          <span class="nc-editor-slash__key mono">{item.key}</span>
                        </Show>
                      </button>
                    )}
                  </For>
                </>
              )}
            </For>
          </div>
        )}
      </Show>

      <Show when={menuOpen() && (trigger()?.kind === "@" || trigger()?.kind === "[[") && triggerPos()}>
        {(p) => (
          <div
            class="nc-menu nc-editor-mentions"
            role="listbox"
            aria-label="Mention"
            data-part="mention-menu"
            style={{ left: `${p().left}px`, top: `${p().bottom + 6}px` }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <span class="nc-menu__label">
              {trigger()?.kind === "[["
                ? trigger()?.query
                  ? `Link to “${trigger()!.query}”`
                  : "Link to a page"
                : trigger()?.query
                  ? `Mention “${trigger()!.query}”`
                  : "Mention a person, page or anything"}
            </span>
            <Show
              when={mentionItems().length || createOption()}
              fallback={
                <span class="nc-menu__empty">{trigger()?.query ? "Nothing matches" : "Type to search"}</span>
              }
            >
              <For each={mentionItems()}>
                {(m, i) => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={aria(active() === i())}
                    class={cx("nc-editor-slash__item", active() === i() && "nc-editor-slash__item--active")}
                    data-uri={m.uri}
                    onMouseEnter={() => setActive(i())}
                    onClick={() => pickMention(m)}
                  >
                    <span class="nc-editor-mentions__icon">
                      <Icon name={(m.icon as never) ?? "file"} size="sm" />
                    </span>
                    <span class="nc-editor-slash__text">
                      <span class="body">{m.title}</span>
                      <Show when={m.subtitle}>
                        <span class="nc-editor-slash__desc section">{m.subtitle}</span>
                      </Show>
                    </span>
                    <span class="nc-editor-slash__key mono">{m.uri.split("://")[0]}</span>
                  </button>
                )}
              </For>
              <Show when={createOption()}>
                {(title) => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={aria(active() === mentionItems().length)}
                    class={cx(
                      "nc-editor-slash__item",
                      active() === mentionItems().length && "nc-editor-slash__item--active",
                    )}
                    data-part="link-create"
                    onMouseEnter={() => setActive(mentionItems().length)}
                    onClick={() => void pickCreate(title())}
                  >
                    <span class="nc-editor-mentions__icon">
                      <Icon name="plus" size="sm" />
                    </span>
                    <span class="nc-editor-slash__text">
                      <span class="body">New page “{title()}”</span>
                      <span class="nc-editor-slash__desc section">Make it and link to it</span>
                    </span>
                  </button>
                )}
              </Show>
            </Show>
          </div>
        )}
      </Show>

      <Show when={formatPos()}>
        {(p) => (
          <div
            role="toolbar"
            aria-label="Format"
            class="nc-editor-format"
            data-part="format-bar"
            ref={(el) => queueMicrotask(() => setBarWidth(el.offsetWidth))}
            style={{ left: `${barLeft(p())}px`, top: `${p().top - 8}px` }}
            onMouseDown={(e) => {
              if (!(e.target as HTMLElement).closest("input")) e.preventDefault()
            }}
          >
            <Show
              when={!linkOpen()}
              fallback={
                <form
                  class="nc-editor-format__link"
                  data-part="link-editor"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const href = (e.currentTarget.elements.namedItem("href") as HTMLInputElement).value.trim()
                    setLinkOpen(null)
                    runCommand(setLink(href))
                  }}
                >
                  <input
                    name="href"
                    class="nc-editor-format__input body"
                    aria-label="Link address"
                    placeholder="Paste or type a link"
                    value={linkOpen()!.href}
                    ref={(el) => queueMicrotask(() => el.focus())}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setLinkOpen(null)
                        view?.focus()
                      }
                    }}
                  />
                  <button type="submit" class="nc-editor-format__btn nc-editor-format__btn--text label">
                    Apply
                  </button>
                  <Show when={linkOpen()!.href}>
                    <button
                      type="button"
                      class="nc-editor-format__btn nc-editor-format__btn--text label"
                      onClick={() => {
                        setLinkOpen(null)
                        runCommand(setLink(""))
                      }}
                    >
                      Remove
                    </button>
                  </Show>
                </form>
              }
            >
              <Show when={services().ai}>
                <button type="button" class="nc-editor-format__ai label" data-part="ask-ai" onClick={openAi}>
                  <Icon name="sparkle" size="sm" />
                  {aiCopy().label}
                </button>
                <span class="nc-editor-format__sep" />
              </Show>
              <button
                ref={setTextButton}
                type="button"
                class="nc-editor-format__btn nc-editor-format__btn--text label"
                aria-haspopup="menu"
                onClick={() => setKindMenu(true)}
              >
                {KIND_LABEL[kind()] ?? "Text"}
                <Icon name="chevron-down" size="sm" />
              </button>
              <For
                each={
                  [
                    ["strong", "Bold", "bold"],
                    ["em", "Italic", "italic"],
                    ["underline", "Underline", "underline"],
                    ["strike", "Strikethrough", "strikethrough"],
                    ["code", "Code", "code"],
                  ] as const
                }
              >
                {([mark, label, icon]) => (
                  <button
                    type="button"
                    class="nc-editor-format__btn"
                    aria-label={label}
                    aria-pressed={aria(isActive(mark))}
                    onClick={toggle(mark)}
                  >
                    <Icon name={icon} />
                  </button>
                )}
              </For>
              <button
                type="button"
                class="nc-editor-format__btn"
                aria-label="Link"
                aria-pressed={aria(isActive("link"))}
                onClick={openLink}
              >
                <Icon name="link" />
              </button>
              <For each={props.selectionActions ?? []}>
                {(a) => (
                  <>
                    <span class="nc-editor-format__sep" />
                    <button
                      type="button"
                      class="nc-editor-format__btn nc-editor-format__btn--text label"
                      data-action={a.id}
                      onClick={() => view && a.run(view)}
                    >
                      <Show when={a.icon}>
                        <Icon name={a.icon as never} size="sm" />
                      </Show>
                      {a.label}
                    </button>
                  </>
                )}
              </For>
            </Show>
          </div>
        )}
      </Show>
      <Menu
        open={kindMenu()}
        anchor={textButton()}
        placement="bottom-start"
        label="Turn into"
        radio
        items={Object.entries(KIND_LABEL).map(([id, label]) => ({ id, label, checked: kind() === id }))}
        onSelect={(id) => {
          setKindMenu(false)
          runCommand(turnInto(id))
        }}
        onClose={() => setKindMenu(false)}
      />

      <Show when={aiOpen() && aiPos()}>
        {(p) => (
          <div
            class="nc-editor-ai"
            data-part="ai-panel"
            style={{ top: `${p().bottom + 8}px` }}
            data-status={aiStatus()}
          >
            <Show when={aiStatus() !== "idle"}>
              <div class="nc-editor-ai__suggestion" data-part="ai-suggestion">
                <span class="nc-editor-ai__label label">
                  <Icon name="sparkle" size="sm" />
                  {aiStatus() === "streaming"
                    ? "Writing…"
                    : hasSelection()
                      ? "Suggested edit"
                      : "Suggested text"}
                  <span class="nc-editor-ai__asked">{aiAsked()}</span>
                </span>
                <p class="nc-editor-ai__text body-lg">
                  <span class="nc-editor-ai__new">{aiText()}</span>
                  <Show when={aiStatus() === "streaming"}>
                    <span class="nc-editor-ai__caret" aria-hidden="true" />
                  </Show>
                </p>
                <Show when={aiStatus() === "error"}>
                  <span class="nc-editor-ai__error label">{aiError()}</span>
                </Show>
                <div class="nc-editor-ai__actions">
                  <Show when={aiStatus() === "streaming"}>
                    <button
                      type="button"
                      class="nc-btn nc-btn--ghost nc-btn--sm"
                      onClick={() => {
                        abortAi()
                        setAiStatus("done")
                      }}
                    >
                      Stop
                    </button>
                  </Show>
                  <button
                    type="button"
                    class="nc-btn nc-btn--secondary nc-btn--sm"
                    onClick={closeAi}
                    data-part="ai-discard"
                  >
                    Discard
                  </button>
                  <Show when={aiStatus() !== "streaming"}>
                    <button
                      type="button"
                      class="nc-btn nc-btn--ghost nc-btn--sm"
                      onClick={() => runAi("custom", aiAsked())}
                    >
                      Try again
                    </button>
                  </Show>
                  <button
                    type="button"
                    class="nc-btn nc-btn--primary nc-btn--sm"
                    disabled={!aiText() || aiStatus() === "streaming"}
                    onClick={acceptAi}
                    data-part="ai-accept"
                  >
                    Accept
                  </button>
                </div>
              </div>
            </Show>
            <Show when={aiStatus() === "idle"}>
              <form
                class="nc-editor-ai__ask"
                onSubmit={(e) => {
                  e.preventDefault()
                  const q = aiPrompt().trim()
                  if (q) void runAi("custom", q)
                }}
              >
                <Icon name="sparkle" size="sm" />
                <input
                  ref={aiInput}
                  class="nc-editor-ai__input body"
                  aria-label={aiCopy().label}
                  placeholder={hasSelection() ? aiCopy().editPlaceholder : aiCopy().writePlaceholder}
                  value={aiPrompt()}
                  onInput={(e) => setAiPrompt(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") closeAi()
                  }}
                />
                <button type="submit" class="nc-btn nc-btn--primary nc-btn--sm" disabled={!aiPrompt().trim()}>
                  Ask
                </button>
              </form>
              <div class="nc-editor-ai__actions-list">
                <For
                  each={AI_ACTIONS.filter(
                    (a) => a.selection === hasSelection() || (a.id === "continue" && !hasSelection()),
                  )}
                >
                  {(a) => (
                    <button
                      type="button"
                      class="nc-editor-slash__item"
                      onClick={() => runAi(a.id, a.instruction)}
                    >
                      <span class="body">{a.label}</span>
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </div>
        )}
      </Show>

      <Show when={preview()}>
        {(p) => (
          <div
            class="nc-editor-preview"
            data-part="mention-preview"
            style={{ left: `${p().left}px`, top: `${p().top}px` }}
            onMouseLeave={() => setPreview(null)}
          >
            <Dynamic component={services().MentionPreview} uri={p().uri} label={p().label} />
          </div>
        )}
      </Show>

      <Show when={!dictating() && !readOnly() && services().dictate && (focused() || variant() !== "page")}>
        <button
          type="button"
          class="nc-editor-dictate"
          data-part="dictate"
          aria-label="Start dictation"
          title="Dictate (Ctrl Shift Space)"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => void toggleDictation()}
        >
          <Icon name="mic" size="sm" />
        </button>
      </Show>
      <Show when={dictating()}>
        <div class="nc-editor-dictation" data-part="dictation" role="status">
          <span class="nc-dot nc-dot--live" />
          <span class="label">Listening</span>
          <button
            type="button"
            class="nc-btn nc-btn--ghost nc-btn--sm"
            aria-label="Finish dictation"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => dictation?.abort()}
          >
            Stop
          </button>
        </div>
      </Show>
    </div>
  )
}
