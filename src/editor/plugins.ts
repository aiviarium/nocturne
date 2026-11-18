// ProseMirror plugins of the shared editor that hold state: the `/` and `@` triggers, placeholders, code
// highlighting, the range a writing assistant suggestion will replace, and the hook menus use to take keys.
import type { Node as PMNode } from "prosemirror-model"
import { type EditorState, Plugin, PluginKey, type Transaction } from "prosemirror-state"
import { Decoration, DecorationSet, type EditorView } from "prosemirror-view"
import { highlight } from "../lib/highlight"

// ── Triggers ────────────────────────────────────────────────────────────────────────────────────────

export type TriggerKind = "/" | "@" | "[["

export interface Trigger {
  kind: TriggerKind
  /** Where the trigger character is. */
  from: number
  /** The cursor. */
  to: number
  /** What was typed after the trigger. */
  query: string
}

export const triggerKey = new PluginKey<Trigger | null>("nc-editor-trigger")

/** Closes the open trigger menu (Escape, or a pick). */
export function closeTrigger(tr: Transaction): Transaction {
  return tr.setMeta(triggerKey, { close: true })
}

/** Opens a trigger at the cursor as if its character had just been typed (the block handle's "+"). */
export function openTrigger(tr: Transaction, kind: TriggerKind): Transaction {
  return tr.setMeta(triggerKey, { open: kind })
}

function textBefore(state: EditorState): { text: string; start: number } | null {
  const { $from, empty } = state.selection
  if (!empty || !$from.parent.isTextblock || $from.parent.type.spec.code) return null
  const start = $from.start()
  return { text: state.doc.textBetween(start, $from.pos, "\n", "￼"), start }
}

const QUERY: Record<TriggerKind, RegExp> = {
  "/": /(^|\s)\/([^\s/]{0,40})$/,
  "@": /(^|\s)@([^\s@]{0,40})$/,
  // A page link: `[[` and a title, which may have spaces.
  "[[": /()\[\[([^\]\n[]{0,80})$/,
}

export function triggers(): Plugin<Trigger | null> {
  return new Plugin<Trigger | null>({
    key: triggerKey,
    state: {
      init: () => null,
      apply(tr, prev, _old, state) {
        const meta = tr.getMeta(triggerKey) as { close?: boolean; open?: TriggerKind } | undefined
        if (meta?.close) return null
        const before = textBefore(state)
        if (!before) return null
        if (meta?.open) {
          const pos = state.selection.from
          return { kind: meta.open, from: pos - meta.open.length, to: pos, query: "" }
        }
        if (prev) {
          const from = tr.mapping.map(prev.from)
          const m = QUERY[prev.kind].exec(before.text)
          if (!m || before.start + m.index + m[1]!.length !== from) return null
          return { kind: prev.kind, from, to: state.selection.from, query: m[2]! }
        }
        // Opens only when the trigger character was just typed.
        if (!tr.docChanged || tr.getMeta("y-sync$") || tr.getMeta("addToHistory") === false) return null
        const pos = state.selection.from
        if (before.text.endsWith("[[")) return { kind: "[[", from: pos - 2, to: pos, query: "" }
        const last = before.text.slice(-1)
        if (last !== "/" && last !== "@") return null
        const m = QUERY[last].exec(before.text)
        if (m?.[2] !== "") return null
        return { kind: last, from: pos - 1, to: pos, query: "" }
      },
    },
  })
}

// ── Keys for open menus ─────────────────────────────────────────────────────────────────────────────

/** A plugin that gives keys to whoever holds `hook.current` first, before the editor's own keys. */
export function keyHook(hook: { current: ((e: KeyboardEvent) => boolean) | null }): Plugin {
  return new Plugin({
    props: {
      handleKeyDown: (_view, e) => (hook.current ? hook.current(e) : false),
    },
  })
}

// ── Placeholders ────────────────────────────────────────────────────────────────────────────────────

/** The empty block at the cursor says what to do; an empty document says `placeholder`. */
export function placeholders(opts: { block: () => string | null; doc: () => string | null }): Plugin {
  return new Plugin({
    props: {
      decorations(state) {
        const doc = state.doc
        const decos: Decoration[] = []
        const onlyEmpty =
          doc.childCount === 1 && doc.firstChild!.isTextblock && doc.firstChild!.content.size === 0
        const docText = opts.doc()
        if (onlyEmpty && docText) {
          decos.push(
            Decoration.node(0, doc.firstChild!.nodeSize, {
              class: "nc-editor-empty",
              "data-placeholder": docText,
            }),
          )
          return DecorationSet.create(doc, decos)
        }
        const text = opts.block()
        const { $from, empty } = state.selection
        if (text && empty && $from.parent.type.name === "paragraph" && $from.parent.content.size === 0) {
          const pos = $from.before()
          decos.push(
            Decoration.node(pos, pos + $from.parent.nodeSize, {
              class: "nc-editor-empty",
              "data-placeholder": text,
            }),
          )
        }
        return decos.length ? DecorationSet.create(doc, decos) : DecorationSet.empty
      },
    },
  })
}

// ── Code highlighting ───────────────────────────────────────────────────────────────────────────────

function codeDecorations(doc: PMNode): DecorationSet {
  const decos: Decoration[] = []
  doc.descendants((node, pos) => {
    if (node.type.name !== "code_block") return !node.isTextblock
    const lang = String(node.attrs.language || "text")
    if (lang === "text" || !node.textContent) return false
    let at = pos + 1
    const lines = highlight(node.textContent, lang)
    for (const line of lines) {
      for (const t of line) {
        if (t.kind) decos.push(Decoration.inline(at, at + t.text.length, { class: `syn-${t.kind}` }))
        at += t.text.length
      }
      at += 1
    }
    return false
  })
  return DecorationSet.create(doc, decos)
}

const codeKey = new PluginKey<DecorationSet>("nc-editor-code")

/** Syntax colours in code blocks, recomputed when a code block changes. */
export function codeHighlight(): Plugin<DecorationSet> {
  return new Plugin<DecorationSet>({
    key: codeKey,
    state: {
      init: (_c, state) => codeDecorations(state.doc),
      apply(tr, set) {
        if (!tr.docChanged) return set
        // Rebuild only when a change touches a code block (typing in one, turning a block into one).
        let touched = false
        const maps = tr.mapping.maps
        maps.forEach((map, i) => {
          map.forEach((_a, _b, start, end) => {
            if (touched) return
            const rest = tr.mapping.slice(i + 1)
            const from = Math.max(0, rest.map(start, -1) - 1)
            const to = Math.min(tr.doc.content.size, rest.map(end, 1) + 1)
            tr.doc.nodesBetween(from, to, (n) => {
              if (n.type.name === "code_block") touched = true
              return !touched && !n.isTextblock
            })
          })
        })
        return touched ? codeDecorations(tr.doc) : set.map(tr.mapping, tr.doc)
      },
    },
    props: { decorations: (state) => codeKey.getState(state) },
  })
}

// ── Writing assistant ───────────────────────────────────────────────────────────────────────────────────────────────────

export interface SuggestionRange {
  from: number
  to: number
}

export const suggestionKey = new PluginKey<SuggestionRange | null>("nc-editor-suggestion")

/** Keeps the range a suggestion would replace in step with edits (anyone's), and marks it. */
export function suggestion(): Plugin<SuggestionRange | null> {
  return new Plugin<SuggestionRange | null>({
    key: suggestionKey,
    state: {
      init: () => null,
      apply(tr, prev) {
        const meta = tr.getMeta(suggestionKey) as { set?: SuggestionRange | null } | undefined
        if (meta && "set" in meta) return meta.set ?? null
        if (!prev) return null
        const from = tr.mapping.map(prev.from, 1)
        const to = Math.max(from, tr.mapping.map(prev.to, -1))
        return { from, to }
      },
    },
    props: {
      decorations(state) {
        const r = suggestionKey.getState(state)
        if (!r || r.to <= r.from) return DecorationSet.empty
        return DecorationSet.create(state.doc, [
          Decoration.inline(r.from, r.to, { class: "nc-editor-suggest-old" }),
        ])
      },
    },
  })
}

export function setSuggestionRange(view: EditorView, range: SuggestionRange | null) {
  view.dispatch(view.state.tr.setMeta(suggestionKey, { set: range }).setMeta("addToHistory", false))
}

// ── Annotations ─────────────────────────────────────────────────────────────────────────────────────

/**
 * A highlighted stretch of text found by what it says (a comment's quote), not by position, so it survives
 * edits elsewhere and needs no shared position type: the quote, and the text just before it to tell repeated
 * quotes apart. A quote whose text was edited away is not shown.
 */
export interface Annotation {
  id: string
  quote: string
  /** Some text just before the quote (up to a few dozen characters). */
  prefix?: string
  /** Shown stronger (the one being read). */
  active?: boolean
}

/** The document's text with block breaks as "\n", and the document position of each character. */
function flatten(doc: PMNode): { text: string; pos: number[] } {
  let text = ""
  const pos: number[] = []
  doc.descendants((node, at) => {
    if (node.isText) {
      text += node.text
      for (let i = 0; i < node.text!.length; i++) pos.push(at + i)
      return false
    }
    if (node.isBlock && text && !text.endsWith("\n")) {
      text += "\n"
      pos.push(-1)
    }
    return true
  })
  return { text, pos }
}

/** Where a quote is in the document: the occurrence whose preceding text best matches `prefix`. */
export function findQuote(doc: PMNode, quote: string, prefix = ""): { from: number; to: number } | null {
  if (!quote) return null
  const { text, pos } = flatten(doc)
  let best: { at: number; score: number } | null = null
  for (let at = text.indexOf(quote); at >= 0; at = text.indexOf(quote, at + 1)) {
    let score = 0
    while (
      score < prefix.length &&
      at - 1 - score >= 0 &&
      text[at - 1 - score] === prefix[prefix.length - 1 - score]
    )
      score++
    if (!best || score > best.score) best = { at, score }
  }
  if (!best) return null
  const from = pos[best.at]
  const last = pos[best.at + quote.length - 1]
  if (from === undefined || last === undefined || from < 0 || last < 0) return null
  return { from, to: last + 1 }
}

/** The quote and prefix of a selection, for an annotation of it. */
export function quoteOf(doc: PMNode, from: number, to: number): { quote: string; prefix: string } {
  const quote = doc.textBetween(from, to, "\n")
  const start = Math.max(0, from - 200)
  const before = doc.textBetween(start, from, "\n")
  return { quote, prefix: before.slice(-40) }
}

export const annotationsKey = new PluginKey<DecorationSet>("nc-editor-annotations")

/** Draws `list()`; dispatch a transaction with this key's meta (any value) when the list changes. */
export function annotations(list: () => Annotation[]): Plugin<DecorationSet> {
  const build = (doc: PMNode) => {
    const decos: Decoration[] = []
    for (const a of list()) {
      const r = findQuote(doc, a.quote, a.prefix)
      if (!r) continue
      decos.push(
        Decoration.inline(r.from, r.to, {
          class: a.active ? "nc-editor-annotation nc-editor-annotation--active" : "nc-editor-annotation",
          "data-annotation": a.id,
        }),
      )
    }
    return DecorationSet.create(doc, decos)
  }
  return new Plugin<DecorationSet>({
    key: annotationsKey,
    state: {
      init: (_c, state) => build(state.doc),
      apply: (tr, old, _o, state) =>
        tr.docChanged || tr.getMeta(annotationsKey) !== undefined ? build(state.doc) : old,
    },
    props: {
      decorations: (state) => annotationsKey.getState(state),
    },
  })
}
