// Editing commands, Markdown shortcuts and keys of the shared editor.
import {
  baseKeymap,
  chainCommands,
  exitCode,
  lift,
  selectParentNode,
  setBlockType,
  toggleMark,
  wrapIn,
} from "prosemirror-commands"
import { InputRule, inputRules, textblockTypeInputRule, wrappingInputRule } from "prosemirror-inputrules"
import { keymap } from "prosemirror-keymap"
import type { MarkType, NodeType, Node as PMNode } from "prosemirror-model"
import { Fragment } from "prosemirror-model"
import { liftListItem, sinkListItem, splitListItem, wrapInList } from "prosemirror-schema-list"
import {
  type Command,
  type EditorState,
  NodeSelection,
  type Plugin,
  Selection,
  TextSelection,
} from "prosemirror-state"
import { goToNextCell } from "prosemirror-tables"
import { indentBlock, moveBlock, outdentBlock } from "./blockdrag"
import { richTextSchema as schema } from "./schema"

const N = schema.nodes
const M = schema.marks

/** Whether a mark is active over the selection (or in the stored marks at the cursor). */
export function markActive(state: EditorState, type: MarkType): boolean {
  const { from, $from, to, empty } = state.selection
  if (empty) return !!type.isInSet(state.storedMarks || $from.marks())
  return state.doc.rangeHasMark(from, to, type)
}

/** The textblock type at the cursor, as the format bar's "Text" menu names it. */
export function blockKind(state: EditorState): string {
  const { $from } = state.selection
  for (let d = $from.depth; d > 0; d--) {
    const n = $from.node(d)
    if (n.type === N.task_item) return "task"
    if (n.type === N.list_item) return $from.node(d - 1).type === N.ordered_list ? "ordered" : "bullet"
    if (n.type === N.blockquote) return "quote"
    if (n.type === N.callout) return "callout"
  }
  const p = $from.parent
  if (p.type === N.heading) return `h${p.attrs.level}`
  if (p.type === N.code_block) return "code"
  return "text"
}

type Tr = import("prosemirror-state").Transaction

/** Runs commands one after the other on a scratch state and returns one transaction with all their steps. */
function sequence(
  state: EditorState,
  run: (s: () => EditorState, send: (tr: Tr) => void) => boolean,
): Tr | null {
  let cur = state
  const steps: Tr[] = []
  const send = (tr: Tr) => {
    steps.push(tr)
    cur = cur.apply(tr)
  }
  if (!run(() => cur, send)) return null
  const tr = state.tr
  for (const t of steps) for (const step of t.steps) tr.step(step)
  tr.setSelection(Selection.fromJSON(tr.doc, cur.selection.toJSON()))
  return tr
}

/**
 * Lifts the selection out of lists, quotes and callouts, so it can be turned into something else. Wrappers at
 * depth `floor` or above stay.
 */
function unwrapAll(s: () => EditorState, send: (tr: Tr) => void, floor = 0) {
  for (let i = 0; i < 8; i++) {
    const { $from } = s().selection
    let wrapped = false
    for (let d = $from.depth; d > floor; d--) {
      const t = $from.node(d).type
      if (t === N.list_item || t === N.task_item || t === N.blockquote || t === N.callout) wrapped = true
    }
    if (!wrapped) return
    if (!(liftListItem(N.list_item!)(s(), send) || liftListItem(N.task_item!)(s(), send) || lift(s(), send)))
      return
  }
}

/**
 * Turns the blocks of the selection into `kind` ("text", "h1", "bullet", "task", "quote", "code", ...). Lists,
 * quotes and callouts around them are taken off first, except those at depth `floor` or above (a block menu
 * keeps the containers its block sits in).
 */
export function turnInto(kind: string, attrs?: Record<string, unknown>, floor = 0): Command {
  return (state, dispatch) => {
    const tr = sequence(state, (s, send) => {
      unwrapAll(s, send, floor)
      const para = () => setBlockType(N.paragraph!)(s(), send) || true
      switch (kind) {
        case "text":
          return para()
        case "h1":
        case "h2":
        case "h3":
          return setBlockType(N.heading!, { level: Number(kind[1]) })(s(), send)
        case "code":
          return setBlockType(N.code_block!, attrs ?? {})(s(), send)
        case "bullet":
          return para() && wrapInList(N.bullet_list!)(s(), send)
        case "ordered":
          return para() && wrapInList(N.ordered_list!)(s(), send)
        case "task":
          return para() && wrapTasks(s(), send)
        case "quote":
          return para() && wrapIn(N.blockquote!)(s(), send)
        case "callout":
          return para() && wrapIn(N.callout!, attrs ?? { tone: "info" })(s(), send)
        default:
          return false
      }
    })
    if (!tr) return false
    dispatch?.(tr.scrollIntoView())
    return true
  }
}

/** Wraps the selected paragraphs in a task list. */
const wrapTasks: Command = (state, dispatch) => {
  const { $from, $to } = state.selection
  const range = $from.blockRange($to)
  if (!range) return false
  const items: PMNode[] = []
  for (let i = range.startIndex; i < range.endIndex; i++) {
    const b = range.parent.child(i)
    items.push(
      N.task_item!.create(
        { checked: false },
        b.type === N.paragraph ? b : N.paragraph!.create(null, b.content),
      ),
    )
  }
  if (!items.length) return false
  if (dispatch) {
    const list = N.task_list!.create(null, items)
    const tr = state.tr.replaceWith(range.start, range.end, list)
    // The cursor stays where it was: each block before it gained an item's open and close, and the list's.
    const k = $from.index(range.depth) - range.startIndex
    const pos = Math.min($from.pos + 2 + 2 * k, tr.doc.content.size - 1)
    tr.setSelection(TextSelection.near(tr.doc.resolve(pos)))
    dispatch(tr.scrollIntoView())
  }
  return true
}

/** Replaces the current empty paragraph (or inserts after the current block) with a block node. */
export function insertBlock(node: PMNode): Command {
  return (state, dispatch) => {
    const { $from } = state.selection
    if (!dispatch) return true
    const tr = state.tr
    const para = $from.parent
    if (para.type === N.paragraph && para.content.size === 0 && $from.depth >= 1) {
      const start = $from.before()
      tr.replaceWith(start, start + para.nodeSize, node)
      const after = start + node.nodeSize
      if (after >= tr.doc.content.size || !tr.doc.resolve(after).nodeAfter)
        tr.insert(after, N.paragraph!.create())
      selectAfterInsert(tr, start, node)
    } else {
      const end = $from.depth >= 1 ? $from.after(1) : $from.pos
      tr.insert(end, node)
      if (end + node.nodeSize >= tr.doc.content.size) tr.insert(end + node.nodeSize, N.paragraph!.create())
      selectAfterInsert(tr, end, node)
    }
    dispatch(tr.scrollIntoView())
    return true
  }
}

function selectAfterInsert(tr: import("prosemirror-state").Transaction, at: number, node: PMNode) {
  if (node.isAtom) {
    tr.setSelection(NodeSelection.create(tr.doc, at))
  } else {
    tr.setSelection(TextSelection.near(tr.doc.resolve(at + 1)))
  }
}

/** A 3 by 3 table with a header row. */
export function makeTable(rows = 3, cols = 3): PMNode {
  const cell = (header: boolean) =>
    (header ? N.table_header! : N.table_cell!).create(null, N.paragraph!.create())
  const row = (header: boolean) =>
    N.table_row!.create(null, Fragment.from(Array.from({ length: cols }, () => cell(header))))
  return N.table!.create(
    null,
    Array.from({ length: rows }, (_, i) => row(i === 0)),
  )
}

/** Sets or removes a link on the selection. An empty href removes it. */
export function setLink(href: string): Command {
  return (state, dispatch) => {
    const { from, to, empty } = state.selection
    if (!dispatch) return true
    const tr = state.tr
    if (empty) {
      // Extend to the link around the cursor.
      const $pos = state.doc.resolve(from)
      const link = M.link!.isInSet($pos.marks())
      if (!link) {
        if (!href) return false
        tr.insert(from, schema.text(href, [M.link!.create({ href })]))
        dispatch(tr)
        return true
      }
      let start = from
      let end = from
      while (start > $pos.start() && M.link!.isInSet(state.doc.resolve(start - 1).marks())) start--
      while (end < $pos.end() && M.link!.isInSet(state.doc.resolve(end + 1).marks())) end++
      tr.removeMark(start, end, M.link!)
      if (href) tr.addMark(start, end, M.link!.create({ href }))
    } else {
      tr.removeMark(from, to, M.link!)
      if (href) tr.addMark(from, to, M.link!.create({ href }))
    }
    dispatch(tr)
    return true
  }
}

/** A transaction that moves top-level block `from` to before top-level block `to` (an index). */
export function moveTopBlock(state: EditorState, from: number, to: number) {
  const doc = state.doc
  let start = 0
  for (let i = 0; i < from; i++) start += doc.child(i).nodeSize
  const node = doc.child(from)
  let target = 0
  for (let i = 0; i < to; i++) target += doc.child(i).nodeSize
  const offset = state.selection.from - start
  const tr = state.tr.delete(start, start + node.nodeSize)
  const insertAt = target > start ? target - node.nodeSize : target
  tr.insert(insertAt, node)
  const pos = Math.min(Math.max(insertAt + offset, insertAt + 1), insertAt + node.nodeSize - 1)
  if (node.isAtom) tr.setSelection(NodeSelection.create(tr.doc, insertAt))
  else tr.setSelection(TextSelection.near(tr.doc.resolve(pos)))
  return tr.scrollIntoView()
}

/** Toggles the task item at the cursor. */
const toggleTask: Command = (state, dispatch) => {
  const { $from } = state.selection
  for (let d = $from.depth; d > 0; d--) {
    const n = $from.node(d)
    if (n.type === N.task_item) {
      if (dispatch)
        dispatch(state.tr.setNodeMarkup($from.before(d), undefined, { checked: !n.attrs.checked }))
      return true
    }
  }
  return false
}

const hardBreak: Command = (state, dispatch) => {
  if (dispatch) dispatch(state.tr.replaceSelectionWith(N.hard_break!.create()).scrollIntoView())
  return true
}

const codeTab: Command = (state, dispatch) => {
  if (!state.selection.$from.parent.type.spec.code) return false
  if (dispatch) dispatch(state.tr.insertText("  ").scrollIntoView())
  return true
}

/** Leaving a code block with Enter on an empty last line twice. */
const exitCodeOnEmptyLines: Command = (state, dispatch) => {
  const { $from, empty } = state.selection
  if (!empty || !$from.parent.type.spec.code) return false
  const text = $from.parent.textContent
  if ($from.parentOffset !== text.length || !text.endsWith("\n\n")) return false
  if (dispatch) {
    const tr = state.tr.delete($from.pos - 2, $from.pos)
    const after = tr.mapping.map($from.after())
    tr.insert(after, N.paragraph!.create())
    tr.setSelection(TextSelection.create(tr.doc, after + 1))
    dispatch(tr.scrollIntoView())
  }
  return true
}

function markRule(re: RegExp, type: MarkType) {
  return new InputRule(re, (state, match, start, end) => {
    const text = match[2]!
    const tr = state.tr.replaceWith(start + match[1]!.length, end, schema.text(text, [type.create()]))
    return tr.removeStoredMark(type)
  })
}

/** Markdown shortcuts while typing. */
export function shortcuts(): Plugin {
  return inputRules({
    rules: [
      textblockTypeInputRule(/^(#{1,3})\s$/, N.heading!, (m) => ({ level: m[1]!.length })),
      wrappingInputRule(/^\s*([-+*])\s$/, N.bullet_list!),
      wrappingInputRule(
        /^(\d+)\.\s$/,
        N.ordered_list!,
        (m) => ({ order: Number(m[1]) }),
        (m, n) => n.childCount + n.attrs.order === Number(m[1]),
      ),
      new InputRule(/^\[( |x)?\]\s$/, (state, match, start, end) => {
        const $start = state.doc.resolve(start)
        if (!$start.node(-1).canReplaceWith($start.index(-1), $start.indexAfter(-1), N.task_list!))
          return null
        const tr = state.tr.delete(start, end)
        const range = tr.doc.resolve(start).blockRange()
        if (!range) return null
        const para = range.parent.child(range.startIndex)
        const list = N.task_list!.create(null, N.task_item!.create({ checked: match[1] === "x" }, para))
        tr.replaceWith(range.start, range.end, list)
        tr.setSelection(TextSelection.near(tr.doc.resolve(range.start + 3)))
        return tr
      }),
      wrappingInputRule(/^\s*>\s$/, N.blockquote!),
      wrappingInputRule(/^\s*!>\s$/, N.callout!, { tone: "info" }),
      textblockTypeInputRule(/^```([a-z0-9+#-]*)\s$/, N.code_block!, (m) => ({ language: m[1] ?? "" })),
      new InputRule(/^(---|\*\*\*)$/, (state, _m, start, end) => {
        const $start = state.doc.resolve(start)
        if ($start.parent.type !== N.paragraph || $start.depth !== 1) return null
        const tr = state.tr.replaceRangeWith($start.before(), $start.after(), N.horizontal_rule!.create())
        const after = tr.mapping.map($start.after())
        tr.insert(after, N.paragraph!.create())
        tr.setSelection(TextSelection.create(tr.doc, after + 1))
        return end > start ? tr : tr
      }),
      markRule(/(^|[^*])\*\*([^*]+)\*\*$/, M.strong!),
      markRule(/(^|[^*\w])\*([^*\s][^*]*)\*$/, M.em!),
      markRule(/(^|[^_\w])_([^_\s][^_]*)_$/, M.em!),
      markRule(/(^|[^`])`([^`]+)`$/, M.code!),
      markRule(/(^|[^~])~~([^~]+)~~$/, M.strike!),
    ],
  })
}

/** Keys of the editor. `undo` and `redo` differ between plain and collaborative mode. */
export function keys(history: { undo: Command; redo: Command }): Plugin[] {
  const listItem = (state: EditorState) => {
    const { $from } = state.selection
    for (let d = $from.depth; d > 0; d--) {
      const t = $from.node(d).type
      if (t === N.list_item || t === N.task_item) return t as NodeType
    }
    return null
  }
  const inList =
    (f: (t: NodeType) => Command): Command =>
    (state, dispatch, view) => {
      const t = listItem(state)
      return t ? f(t)(state, dispatch, view) : false
    }
  return [
    keymap({
      "Mod-z": history.undo,
      "Mod-Shift-z": history.redo,
      "Mod-y": history.redo,
      "Mod-b": toggleMark(M.strong!),
      "Mod-i": toggleMark(M.em!),
      "Mod-u": toggleMark(M.underline!),
      "Mod-Shift-s": toggleMark(M.strike!),
      "Mod-Shift-x": toggleMark(M.strike!),
      "Mod-e": toggleMark(M.code!),
      "Mod-Alt-0": turnInto("text"),
      "Mod-Alt-1": turnInto("h1"),
      "Mod-Alt-2": turnInto("h2"),
      "Mod-Alt-3": turnInto("h3"),
      "Mod-Shift-7": turnInto("ordered"),
      "Mod-Shift-8": turnInto("bullet"),
      "Mod-Shift-9": turnInto("task"),
      "Mod-Alt-c": turnInto("code"),
      "Mod-Enter": chainCommands(exitCode, toggleTask),
      "Shift-Enter": chainCommands(exitCode, hardBreak),
      Enter: chainCommands(exitCodeOnEmptyLines, inList(splitListItem)),
      Tab: chainCommands(goToNextCell(1), codeTab, inList(sinkListItem), indentBlock),
      "Shift-Tab": chainCommands(goToNextCell(-1), outdentBlock, inList(liftListItem)),
      "Alt-ArrowUp": moveBlock(-1),
      "Alt-ArrowDown": moveBlock(1),
      Escape: selectParentNode,
    }),
    keymap(baseKeymap),
  ]
}
