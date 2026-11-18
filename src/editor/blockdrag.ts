// Moving blocks: by their handle (drag), by Alt ↑/↓ and by Tab/Shift Tab. Every block at every level is a unit
// that moves: a top-level block, a block inside a quote or callout, a list item, a block under a list item's first
// line. Where a dragged block lands is a gap between two units, picked like Notion: the pointer's height picks the
// line between blocks and its horizontal position picks the nesting level among the gaps on that line (the end of a
// callout and the gap after it are one line, the further left the shallower). The geometry comes from a callback, so
// the decisions are plain functions of the document and some rectangles (tested in test/blockdrag.test.ts).
import { Fragment, type NodeType, type Node as PMNode, type ResolvedPos } from "prosemirror-model"
import {
  type Command,
  type EditorState,
  NodeSelection,
  Plugin,
  PluginKey,
  Selection,
  TextSelection,
  type Transaction,
} from "prosemirror-state"
import { canJoin, liftTarget } from "prosemirror-transform"
import { Decoration, DecorationSet } from "prosemirror-view"
import { richTextSchema as schema } from "./schema"

const N = schema.nodes
const LISTS = new Set<NodeType>([N.bullet_list!, N.ordered_list!, N.task_list!])
const ITEMS = new Set<NodeType>([N.list_item!, N.task_item!])
/** Containers of any blocks. */
const BOXES = new Set<NodeType>([N.blockquote!, N.callout!])

/** A run of sibling units: `from` is before the first, `to` after the last. */
export interface BlockRange {
  from: number
  to: number
}

export interface Rect {
  left: number
  right: number
  top: number
  bottom: number
}

/** The client rectangle of the block node that starts at `pos`, or null when it has none. */
export type BlockGeometry = (pos: number) => Rect | null

/** How far a list nests: a dropped block that becomes a nested list sits this much further in. */
export const NEST_STEP = 24

const isContainer = (t: NodeType) => t === N.doc || BOXES.has(t) || LISTS.has(t) || ITEMS.has(t)

/** Whether the child at `index` of `parent` is a unit (has a handle, moves). A list item's first line is the item. */
export function isUnitAt(parent: PMNode, index: number): boolean {
  const t = parent.type
  return t === N.doc || BOXES.has(t) || LISTS.has(t) || (ITEMS.has(t) && index >= 1)
}

/** Whether `$p` is a gap a unit can be dropped into. */
function isGap($p: ResolvedPos): boolean {
  return isContainer($p.parent.type) && !(ITEMS.has($p.parent.type) && $p.index() === 0)
}

/** Whether a node can become a list item (a paragraph or heading becomes one; items and lists already are). */
const listable = (n: PMNode) =>
  ITEMS.has(n.type) || LISTS.has(n.type) || n.type === N.paragraph || n.type === N.heading

function unitNodes(doc: PMNode, r: BlockRange): { parent: PMNode; nodes: PMNode[]; $from: ResolvedPos } {
  const $from = doc.resolve(r.from)
  const nodes: PMNode[] = []
  for (let i = $from.index(), pos = r.from; pos < r.to && i < $from.parent.childCount; i++) {
    const n = $from.parent.child(i)
    nodes.push(n)
    pos += n.nodeSize
  }
  return { parent: $from.parent, nodes, $from }
}

/** Whether `r` still is a run of sibling units (a remote change can break one mid-drag). */
export function isUnitRange(doc: PMNode, r: BlockRange): boolean {
  if (r.from < 0 || r.to > doc.content.size || r.from >= r.to) return false
  const $f = doc.resolve(r.from)
  const $t = doc.resolve(r.to)
  return (
    $f.sameParent($t) &&
    !$f.parent.inlineContent &&
    isContainer($f.parent.type) &&
    isUnitAt($f.parent, $f.index())
  )
}

/**
 * The units the selection covers: the innermost unit around the cursor, or every sibling unit a selection over
 * several blocks touches. A list item's first line stands for the item.
 */
export function unitsAt(state: EditorState): BlockRange | null {
  const { $from, $to } = state.selection
  const range = $from.blockRange($to, (n) => isContainer(n.type))
  if (!range) return null
  if (ITEMS.has(range.parent.type) && range.startIndex === 0) {
    if (range.depth < 1) return null
    return { from: $from.before(range.depth), to: $from.after(range.depth) }
  }
  return { from: range.start, to: range.end }
}

/** The units of one node's children with their positions; `start` is where its content starts. */
function kids(node: PMNode, start: number) {
  const out: Array<{ node: PMNode; pos: number; index: number }> = []
  node.forEach((c, off, index) => {
    out.push({ node: c, pos: start + off, index })
  })
  return out
}

/**
 * The unit whose handle shows for a pointer at (x, y): the innermost block on that line whose handle area reaches
 * the pointer. A block's handle sits `gutter` pixels left of it (a list item's, left of its marker), so the pointer
 * over a nested block's handle still picks that block, and further left picks its container.
 */
export function blockAt(
  doc: PMNode,
  rect: BlockGeometry,
  x: number,
  y: number,
  gutter: number,
): number | null {
  let node = doc
  let start = 0
  let best: number | null = null
  for (;;) {
    const live = kids(node, start)
      .map((k) => ({ ...k, r: rect(k.pos) }))
      .filter((k): k is typeof k & { r: Rect } => !!k.r)
    if (!live.length) break
    let pick = live[live.length - 1]!
    for (let i = 0; i < live.length - 1; i++) {
      if (y < (live[i]!.r.bottom + live[i + 1]!.r.top) / 2) {
        pick = live[i]!
        break
      }
    }
    if (ITEMS.has(node.type) && pick.index === 0) break
    if (!LISTS.has(pick.node.type)) {
      const anchor = ITEMS.has(pick.node.type) ? (rect(start - 1)?.left ?? pick.r.left) : pick.r.left
      if (best != null && anchor - gutter > x) break
      best = pick.pos
    }
    if (!isContainer(pick.node.type)) break
    node = pick.node
    start = pick.pos + 1
  }
  return best
}

/** The gap nearest a pointer at height `y`, at the deepest level: which line between blocks it points at. */
export function gapAt(doc: PMNode, rect: BlockGeometry, y: number): number {
  let node = doc
  let start = 0
  descend: for (;;) {
    for (const k of kids(node, start)) {
      const r = rect(k.pos)
      if (!r) continue
      const firstLine = ITEMS.has(node.type) && k.index === 0
      if (y < r.top) return firstLine ? start - 1 : k.pos
      if (y > r.bottom) continue
      const upper = y < (r.top + r.bottom) / 2
      if (firstLine) return upper ? start - 1 : k.pos + k.node.nodeSize
      if (isContainer(k.node.type)) {
        node = k.node
        start = k.pos + 1
        continue descend
      }
      return upper ? k.pos : k.pos + k.node.nodeSize
    }
    return start + node.content.size
  }
}

/**
 * Every gap on the same visual line as `p0`, shallowest last: the end of a container is the same line as the gap
 * after it, the start of one the same as the gap before it, and the gap after a container the same as its end.
 */
export function lineGaps(doc: PMNode, p0: number): number[] {
  const seen = new Set<number>()
  const out: number[] = []
  const queue = [p0]
  while (queue.length) {
    const p = queue.shift()!
    if (seen.has(p) || p < 0 || p > doc.content.size) continue
    seen.add(p)
    const $p = doc.resolve(p)
    if (!isContainer($p.parent.type)) continue
    if (isGap($p)) out.push(p)
    if ($p.depth > 0) {
      if ($p.index() === 0) queue.push($p.before())
      if ($p.index() === $p.parent.childCount) queue.push($p.after())
    }
    const before = $p.nodeBefore
    const after = $p.nodeAfter
    if (before && isContainer(before.type)) queue.push(p - 1)
    if (after && isContainer(after.type) && !ITEMS.has(after.type)) queue.push(p + 1)
  }
  return out
}

/** Whether the units of `source` can go into the gap at `p` (lists take items, paragraphs and headings). */
export function accepts(doc: PMNode, p: number, source: BlockRange): boolean {
  if (p > source.from && p < source.to) return false
  const $p = doc.resolve(p)
  if (!isGap($p)) return false
  if (LISTS.has($p.parent.type)) return unitNodes(doc, source).nodes.every(listable)
  return true
}

/** Whether units dropped at `p` become a nested list (a list item's children, for blocks that can be items). */
export function nests(doc: PMNode, p: number, source: BlockRange): boolean {
  const $p = doc.resolve(p)
  return ITEMS.has($p.parent.type) && unitNodes(doc, source).nodes.every(listable)
}

export interface DropTarget {
  /** Where the units go. */
  pos: number
  /** The left edge of the indicator, in client pixels: the content edge of the level they land at. */
  left: number
  right: number
  /** The indicator's vertical centre, in client pixels. */
  y: number
}

/** The indicator's place for the gap at `p`, or null when the blocks around it have no geometry. */
export function gapLine(doc: PMNode, rect: BlockGeometry, p: number, source: BlockRange): DropTarget | null {
  const $p = doc.resolve(p)
  const parent = $p.parent
  const first = $p.start()
  // The level's content edge: its first child's left (a list's or item's: the first line's text).
  const edge = rect(LISTS.has(parent.type) ? first + 1 : first)
  if (!edge) return null
  const left = edge.left + (nests(doc, p, source) ? NEST_STEP : 0)
  const before = $p.nodeBefore ? rect(p - $p.nodeBefore.nodeSize) : null
  const after = $p.nodeAfter ? rect(p) : null
  // Between two blocks, midway; at a level's start or end, just outside its first or last block's edge.
  const y =
    before && after
      ? (before.bottom + after.top) / 2
      : before
        ? before.bottom + 2
        : after
          ? after.top - 2
          : null
  if (y == null) return null
  return { pos: p, left, right: Math.max(left + 24, edge.right), y }
}

/**
 * Where units dragged with the pointer at (x, y) land. `x` is the dragged block's left edge as the pointer carries
 * it (the pointer plus where on the block it was grabbed), so moving straight down keeps the level.
 */
export function dropTarget(
  doc: PMNode,
  rect: BlockGeometry,
  source: BlockRange,
  x: number,
  y: number,
): DropTarget | null {
  let best: DropTarget | null = null
  for (const p of lineGaps(doc, gapAt(doc, rect, y))) {
    if (!accepts(doc, p, source)) continue
    const line = gapLine(doc, rect, p, source)
    if (!line) continue
    if (!best || Math.abs(line.left - x) < Math.abs(best.left - x)) best = line
  }
  return best
}

// ── Moving ────────────────────────────────────────────────────────────────────────────────────────────

const itemType = (list: NodeType) => (list === N.task_list ? N.task_item! : N.list_item!)

function toItems(n: PMNode, item: NodeType): PMNode[] {
  const attrs = item === N.task_item ? { checked: n.type === N.task_item ? n.attrs.checked : false } : null
  if (LISTS.has(n.type)) return n.children.flatMap((c) => toItems(c, item))
  if (ITEMS.has(n.type)) return [item.create(attrs, n.content)]
  if (n.type === N.paragraph) return [item.create(attrs, n)]
  if (n.isTextblock) return [item.create(attrs, N.paragraph!.create(null, n.content))]
  return [item.create(attrs, Fragment.from([N.paragraph!.create(), n]))]
}

/** What the units become in the gap at `$at`: items in a list, a nested list under an item, plain blocks elsewhere. */
function convert(nodes: PMNode[], $at: ResolvedPos): Fragment {
  const pt = $at.parent.type
  if (LISTS.has(pt)) return Fragment.from(nodes.flatMap((n) => toItems(n, itemType(pt))))
  if (ITEMS.has(pt) && nodes.every(listable)) {
    const list = $at.node($at.depth - 1).type
    return Fragment.from(
      list.create(
        null,
        nodes.flatMap((n) => toItems(n, itemType(list))),
      ),
    )
  }
  // Out of a list, an item is its content again.
  return Fragment.from(nodes.flatMap((n) => (ITEMS.has(n.type) ? n.children : [n])))
}

/** The k-th textblock in [from, to) and the offset in it, for keeping the caret in a block that moved. */
function caretPlace(doc: PMNode, r: BlockRange, pos: number): { k: number; offset: number } | null {
  const $pos = doc.resolve(pos)
  if (!$pos.parent.isTextblock) return null
  const start = $pos.start()
  let k = 0
  let found: number | null = null
  doc.nodesBetween(r.from, r.to, (n, p) => {
    if (found != null) return false
    if (n.isTextblock) {
      if (p + 1 === start) found = k
      k++
      return false
    }
    return true
  })
  return found == null ? null : { k: found, offset: pos - start }
}

function caretAt(doc: PMNode, from: number, to: number, place: { k: number; offset: number }): number | null {
  let k = 0
  let out: number | null = null
  doc.nodesBetween(from, to, (n, p) => {
    if (out != null) return false
    if (n.isTextblock) {
      if (k === place.k) out = p + 1 + Math.min(place.offset, n.content.size)
      k++
      return false
    }
    return true
  })
  return out
}

/**
 * The range a move or delete of `r` takes out: a quote or list it leaves empty goes too, a callout stays with an
 * empty paragraph (`fill`), and the document keeps one. `keep` is a position the range must not swallow.
 */
function removal(doc: PMNode, r: BlockRange, keep?: number): { from: number; to: number; fill: boolean } {
  const $from = doc.resolve(r.from)
  let from = r.from
  let to = r.to
  for (let d = $from.depth; d >= 0; d--) {
    if (from !== $from.start(d) || to !== $from.end(d)) break
    const t = $from.node(d).type
    if (d === 0 || t === N.callout) return { from, to, fill: true }
    if (!(LISTS.has(t) || t === N.blockquote)) break
    const before = $from.before(d)
    const after = $from.after(d)
    if (keep != null && keep > before && keep < after) break
    from = before
    to = after
  }
  return { from, to, fill: false }
}

/**
 * One transaction that moves the units of `source` to the gap `target`: items become plain blocks outside a list
 * and blocks become items inside one, an emptied container goes or stays by its kind, lists that end up side by
 * side join, and a caret inside the moved blocks moves with them. Null when the move would change nothing.
 */
export function moveBlocks(state: EditorState, source: BlockRange, target: number): Transaction | null {
  const doc = state.doc
  if (target >= source.from && target <= source.to) return null
  if (!isUnitRange(doc, source) || !accepts(doc, target, source)) return null
  const { nodes } = unitNodes(doc, source)
  const r = removal(doc, source, target)
  const tr = state.tr
  let at: number
  let content: Fragment
  if (target === r.from || target === r.to) {
    // The units take the place of the container they emptied: one replace step.
    const $at = doc.resolve(target)
    content = convert(nodes, $at)
    tr.replaceWith(r.from, r.to, content)
    at = r.from
  } else {
    if (r.fill) tr.replaceWith(r.from, r.to, N.paragraph!.create())
    else tr.delete(r.from, r.to)
    at = tr.mapping.map(target)
    content = convert(nodes, tr.doc.resolve(at))
    tr.insert(at, content)
  }
  // [at, end) holds the moved blocks; joining lists takes the tokens between them out.
  let end = at + content.size
  // Lists of one kind that now touch become one.
  const join = (pos: number) => {
    const $p = tr.doc.resolve(pos)
    const a = $p.nodeBefore
    const b = $p.nodeAfter
    if (a && b && a.type === b.type && LISTS.has(a.type) && canJoin(tr.doc, pos)) {
      tr.join(pos)
      return true
    }
    return false
  }
  if (join(end)) end -= 1
  if (join(at)) {
    at -= 1
    end -= 2
  }
  if (tr.doc.eq(doc)) return null
  // Keep the selection on what it was on.
  const sel = state.selection
  const inside = (p: number) => p >= source.from && p <= source.to
  if (
    sel instanceof NodeSelection &&
    sel.from === source.from &&
    sel.to === source.to &&
    nodes.length === 1
  ) {
    const n = tr.doc.nodeAt(at)
    if (n && n.type === sel.node.type) tr.setSelection(NodeSelection.create(tr.doc, at))
  } else if (inside(sel.anchor) || inside(sel.head)) {
    const place = (p: number) => {
      if (!inside(p)) return tr.mapping.map(p)
      const c = caretPlace(doc, source, p)
      return (c && caretAt(tr.doc, at, end, c)) ?? at
    }
    const anchor = place(sel.anchor)
    const head = place(sel.head)
    const $a = tr.doc.resolve(anchor)
    const $h = tr.doc.resolve(head)
    tr.setSelection(
      $a.parent.isTextblock && $h.parent.isTextblock
        ? TextSelection.between($a, $h)
        : Selection.near(tr.doc.resolve(Math.min(at + 1, tr.doc.content.size))),
    )
  }
  return tr
}

/** One transaction that deletes the units of `r`, with the same rules for the container they empty. */
export function deleteBlocks(state: EditorState, r: BlockRange): Transaction {
  const rm = removal(state.doc, r)
  const tr = state.tr
  if (rm.fill) tr.replaceWith(rm.from, rm.to, N.paragraph!.create())
  else tr.delete(rm.from, rm.to)
  return tr
}

// ── Keys ──────────────────────────────────────────────────────────────────────────────────────────────

/** Gaps a keyboard move stops at: not under a list item the units are not in (Tab nests). */
function keyGap(doc: PMNode, p: number, source: BlockRange): boolean {
  if (!accepts(doc, p, source)) return false
  const $p = doc.resolve(p)
  if (!ITEMS.has($p.parent.type)) return true
  return source.from >= $p.start() && source.to <= $p.end()
}

/** The next gap a keyboard move stops at above (`dir` -1) or below the units, starting the search at `start`. */
export function nextGap(doc: PMNode, source: BlockRange, dir: -1 | 1, start?: number): number | null {
  let p = start ?? (dir < 0 ? source.from - 1 : source.to + 1)
  while (p >= 0 && p <= doc.content.size) {
    const $p = doc.resolve(p)
    if ($p.parent.inlineContent) {
      p = dir < 0 ? $p.start() - 1 : $p.end() + 1
      continue
    }
    if (keyGap(doc, p, source)) return p
    p += dir
  }
  return null
}

/** Alt ↑ and Alt ↓: moves the block at the cursor (or the selected blocks) past the next block, into and out of containers. */
export function moveBlock(dir: -1 | 1): Command {
  return (state, dispatch) => {
    const src = unitsAt(state)
    if (!src) return false
    // The first gap where the move changes something (re-wrapping an item in place does not).
    for (let p = nextGap(state.doc, src, dir); p != null; p = nextGap(state.doc, src, dir, p + dir)) {
      const tr = moveBlocks(state, src, p)
      if (!tr) continue
      dispatch?.(tr.scrollIntoView())
      return true
    }
    return false
  }
}

/** Tab outside a list: the block goes into the container before it (a quote, a callout, a list as its last item). */
export const indentBlock: Command = (state, dispatch) => {
  const src = unitsAt(state)
  if (!src) return false
  const $from = state.doc.resolve(src.from)
  if (LISTS.has($from.parent.type)) return false
  const prev = $from.nodeBefore
  if (!prev || !isContainer(prev.type) || ITEMS.has(prev.type)) return false
  let target = src.from - 1
  if (LISTS.has(prev.type) && !accepts(state.doc, target, src)) target = src.from - 2
  const tr = moveBlocks(state, src, target)
  if (!tr) return false
  dispatch?.(tr.scrollIntoView())
  return true
}

/** Shift Tab in a quote or callout: the block leaves it, splitting it when blocks follow. */
export const outdentBlock: Command = (state, dispatch) => {
  const src = unitsAt(state)
  if (!src) return false
  const $from = state.doc.resolve(src.from)
  if (!BOXES.has($from.parent.type)) return false
  const range = $from.blockRange(state.doc.resolve(src.to))
  const to = range && liftTarget(range)
  if (!range || to == null) return false
  if (dispatch) {
    const tr = state.tr.lift(range, to)
    dispatch(tr.scrollIntoView())
  }
  return true
}

// ── The drag's look ───────────────────────────────────────────────────────────────────────────────────

export const blockDragKey = new PluginKey<BlockRange | null>("nc-editor-block-drag")

/** Dims the units being dragged (a local decoration: nothing is sent to collaborators). */
export function blockDrag(): Plugin<BlockRange | null> {
  return new Plugin<BlockRange | null>({
    key: blockDragKey,
    state: {
      init: () => null,
      apply(tr, value) {
        const meta = tr.getMeta(blockDragKey) as BlockRange | null | undefined
        if (meta !== undefined) return meta
        if (!value || !tr.docChanged) return value
        const r = { from: tr.mapping.map(value.from, 1), to: tr.mapping.map(value.to, -1) }
        return isUnitRange(tr.doc, r) ? r : null
      },
    },
    props: {
      decorations(state) {
        const r = blockDragKey.getState(state)
        if (!r) return null
        const { nodes } = unitNodes(state.doc, r)
        const decos: Decoration[] = []
        let pos = r.from
        for (const n of nodes) {
          decos.push(Decoration.node(pos, pos + n.nodeSize, { class: "nc-editor-drag-source" }))
          pos += n.nodeSize
        }
        return DecorationSet.create(state.doc, decos)
      },
    },
  })
}

const KIND: Record<string, string> = {
  paragraph: "Text",
  blockquote: "Quote",
  callout: "Callout",
  code_block: "Code",
  horizontal_rule: "Divider",
  bullet_list: "List",
  ordered_list: "List",
  task_list: "To-do list",
  task_item: "To-do",
  table: "Table",
  image: "Image",
  file: "File",
  plugin_block: "Block",
}

/** The drag chip's words: the block's kind and the start of its text. */
export function dragLabel(doc: PMNode, r: BlockRange): { kind: string; text: string } {
  const { parent, nodes } = unitNodes(doc, r)
  if (nodes.length > 1) return { kind: `${nodes.length} blocks`, text: "" }
  const n = nodes[0]
  if (!n) return { kind: "", text: "" }
  const kind =
    n.type === N.heading
      ? `Heading ${n.attrs.level}`
      : n.type === N.list_item
        ? parent.type === N.ordered_list
          ? "Numbered"
          : "Bullet"
        : n.type === N.file
          ? String(n.attrs.name || "File")
          : (KIND[n.type.name] ?? "Block")
  const text = n.type === N.file ? "" : n.textContent.replace(/\s+/g, " ").trim().slice(0, 60)
  return { kind, text }
}
