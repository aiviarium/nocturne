// The DOM side of the Composer: a contenteditable holds text nodes and atomic chips, and everything the
// component knows about it goes through the helpers here. The value is a list of segments; the DOM is
// read back into segments after every edit, and re-rendered from them only when they changed from outside.
//
// "Flat" positions count a chip as one character and every text character as one, so a caret can be named
// with a single number whatever the DOM looks like (`flatText` gives the matching string, with `CHIP` where
// a chip stands). Triggers, picks and history all work on flat positions.
import type { IconName } from "../components/Icon"
import { ICON_PATHS } from "../components/icon-data"
import type { TriggerChar } from "./triggers"

/** What fills the place of a chip in `flatText`. Not whitespace, so it ends no word. */
export const CHIP = "￼"

export type ChipKind = "person" | "doc" | "file" | "folder"

export interface ComposerChip {
  type: "chip"
  /** Which trigger made it: `/` a command, `@` a mention, `$` a skill. */
  trigger: TriggerChar
  /** The picked item's id. */
  id: string
  /** The name without the trigger character: `review`, `useTasks.ts`. */
  label: string
  /** For `@` chips: a person shows initials; everything else is a reference. */
  kind?: ChipKind
  /** The type icon on a reference chip. */
  icon?: IconName
}

export interface ComposerText {
  type: "text"
  text: string
}

/** One piece of what was written: plain text (which may hold newlines) or a picked chip. */
export type ComposerSegment = ComposerText | ComposerChip

/** The composer's value: text and chips in order. Adjacent text is always one segment. */
export type ComposerValue = ComposerSegment[]

/** The text of a value as plain text: a chip reads as its trigger and name, `/review`. */
export function segmentsToText(value: readonly ComposerSegment[]): string {
  return value.map((s) => (s.type === "text" ? s.text : `${s.trigger}${s.label}`)).join("")
}

/** Merge adjacent text and drop empty text. */
export function normalizeSegments(value: readonly ComposerSegment[]): ComposerValue {
  const out: ComposerValue = []
  for (const seg of value) {
    if (seg.type === "text") {
      if (seg.text === "") continue
      const last = out[out.length - 1]
      if (last?.type === "text") last.text += seg.text
      else out.push({ type: "text", text: seg.text })
    } else out.push({ ...seg })
  }
  return out
}

/** Whether two values hold the same text and chips. */
export function sameSegments(a: readonly ComposerSegment[], b: readonly ComposerSegment[]): boolean {
  if (a.length !== b.length) return false
  return a.every((x, i) => {
    const y = b[i] as ComposerSegment
    if (x.type === "text") return y.type === "text" && x.text === y.text
    return y.type === "chip" && x.trigger === y.trigger && x.id === y.id && x.label === y.label
  })
}

/** Nothing to send: no chip and no text but whitespace. */
export function isBlank(value: readonly ComposerSegment[]): boolean {
  return value.every((s) => s.type === "text" && s.text.trim() === "")
}

/** The text of a value in flat form: `CHIP` for each chip. */
export function flatOfSegments(value: readonly ComposerSegment[]): string {
  return value.map((s) => (s.type === "text" ? s.text : CHIP)).join("")
}

// ---------- Rendering ----------

const SVG = "http://www.w3.org/2000/svg"

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function chipClass(chip: ComposerChip): string {
  if (chip.trigger === "/") return "nc-token--cmd"
  if (chip.trigger === "$") return "nc-token--skill"
  return chip.kind === "person" ? "nc-token--person" : "nc-token--ref"
}

/** The element for a chip: atomic (`contenteditable=false`), so the caret never enters it. */
export function renderChip(chip: ComposerChip, doc: Document = document): HTMLElement {
  const el = doc.createElement("span")
  el.className = `nc-token ${chipClass(chip)} nc-token--inline`
  el.setAttribute("contenteditable", "false")
  el.setAttribute("data-chip", "")
  el.setAttribute("data-trigger", chip.trigger)
  el.setAttribute("data-id", chip.id)
  el.setAttribute("data-label", chip.label)
  if (chip.kind) el.setAttribute("data-kind", chip.kind)
  if (chip.icon) el.setAttribute("data-icon", chip.icon)
  if (chip.trigger === "@" && chip.kind === "person") {
    const avatar = doc.createElement("span")
    avatar.className = "nc-avatar nc-avatar--sm"
    avatar.setAttribute("aria-hidden", "true")
    avatar.textContent = initialsOf(chip.label)
    el.append(avatar, chip.label)
  } else if (chip.trigger === "@") {
    const path = ICON_PATHS[(chip.icon ?? "file") as keyof typeof ICON_PATHS] ?? ICON_PATHS.file
    if (path) {
      const svg = doc.createElementNS(SVG, "svg")
      svg.setAttribute("class", "nc-icon nc-icon--sm")
      svg.setAttribute("viewBox", "0 0 16 16")
      svg.setAttribute("aria-hidden", "true")
      const p = doc.createElementNS(SVG, "path")
      p.setAttribute("d", path)
      svg.append(p)
      el.append(svg)
    }
    el.append(chip.label)
  } else {
    el.textContent = `${chip.trigger}${chip.label}`
  }
  return el
}

/** Replace the editor's content with a value. */
export function renderSegments(root: HTMLElement, value: readonly ComposerSegment[]): void {
  const doc = root.ownerDocument
  const nodes: Node[] = []
  for (const seg of normalizeSegments(value))
    nodes.push(seg.type === "text" ? doc.createTextNode(seg.text) : renderChip(seg, doc))
  // A line break at the very end only shows as a new line when something follows it, so the field always
  // ends with a placeholder break. It is never part of the value.
  const end = doc.createElement("br")
  end.setAttribute("data-trailing", "")
  nodes.push(end)
  root.replaceChildren(...nodes)
}

/** Whether the field holds only text nodes and chips and ends with the one placeholder break. */
export function isCanonical(root: HTMLElement): boolean {
  const children = Array.from(root.childNodes)
  const last = children[children.length - 1] as Element | undefined
  if (last?.tagName !== "BR" || !last.hasAttribute("data-trailing")) return false
  return children.slice(0, -1).every((n) => n.nodeType === 3 || isChipNode(n))
}

// ---------- Reading ----------

export const isChipNode = (node: Node | null): boolean =>
  node?.nodeType === 1 && (node as Element).hasAttribute("data-chip")

/** The chip an element or text node is inside, if any. */
export function chipAround(node: Node | null, root: HTMLElement): HTMLElement | null {
  for (let at: Node | null = node; at && at !== root; at = at.parentNode)
    if (isChipNode(at)) return at as HTMLElement
  return null
}

function chipOf(el: HTMLElement): ComposerChip {
  const kind = el.getAttribute("data-kind") as ChipKind | null
  const icon = el.getAttribute("data-icon") as IconName | null
  return {
    type: "chip",
    trigger: (el.getAttribute("data-trigger") ?? "@") as TriggerChar,
    id: el.getAttribute("data-id") ?? "",
    label: el.getAttribute("data-label") ?? el.textContent ?? "",
    ...(kind ? { kind } : {}),
    ...(icon ? { icon } : {}),
  }
}

const ZERO_WIDTH = /​/g
const BLOCK = new Set(["DIV", "P", "LI", "PRE", "BLOCKQUOTE"])

/**
 * Read the editor back into a value. Text nodes are text, chips are chips, and anything the browser wraps
 * lines in (`<div>`) is read as a line break before it. A `<br>` is never a newline: the composer takes
 * every line break itself as a character in the text, and the browser adds a break only as a placeholder
 * in an empty field.
 */
export function readSegments(root: HTMLElement): ComposerValue {
  const out: ComposerSegment[] = []
  const text = (t: string) => out.push({ type: "text", text: t })
  const endsInNewline = () => {
    const last = out[out.length - 1]
    return last?.type === "text" && last.text.endsWith("\n")
  }
  const walk = (parent: Node, top: boolean) => {
    parent.childNodes.forEach((node, i) => {
      if (node.nodeType === 3) text((node.nodeValue ?? "").replace(ZERO_WIDTH, ""))
      else if (node.nodeType === 1) {
        const el = node as HTMLElement
        if (isChipNode(el)) out.push(chipOf(el))
        else if (el.tagName === "BR" || el.tagName === "SVG" || el.tagName === "svg") return
        else {
          const block = BLOCK.has(el.tagName)
          if (block && (!top || i > 0) && out.length > 0 && !endsInNewline()) text("\n")
          walk(el, false)
        }
      }
    })
  }
  walk(root, true)
  return normalizeSegments(out)
}

/** How long a node is in flat positions. */
export function flatLength(node: Node): number {
  if (node.nodeType === 3) return (node.nodeValue ?? "").replace(ZERO_WIDTH, "").length
  if (node.nodeType === 11 || node.nodeType === 1) {
    if (isChipNode(node)) return 1
    if ((node as Element).tagName === "BR") return 0
    let n = 0
    node.childNodes.forEach((c) => {
      n += flatLength(c)
    })
    return n
  }
  return 0
}

/** The editor's text in flat form. */
export function flatText(root: HTMLElement): string {
  return flatOfSegments(readSegments(root))
}

/** The flat position of a DOM boundary point inside the editor. */
export function flatOffset(root: HTMLElement, container: Node, offset: number): number {
  const range = root.ownerDocument.createRange()
  range.setStart(root, 0)
  try {
    range.setEnd(container, offset)
  } catch {
    return flatLength(root)
  }
  return flatLength(range.cloneContents())
}

interface Leaf {
  node: Node
  length: number
  atom: boolean
}

function leaves(root: HTMLElement): Leaf[] {
  const out: Leaf[] = []
  const walk = (parent: Node) => {
    parent.childNodes.forEach((node) => {
      if (node.nodeType === 3) out.push({ node, length: flatLength(node), atom: false })
      else if (node.nodeType === 1) {
        const el = node as HTMLElement
        if (isChipNode(el)) out.push({ node, length: 1, atom: true })
        else if (el.tagName !== "BR") walk(el)
      }
    })
  }
  walk(root)
  return out
}

/** The DOM boundary point for a flat position. Text is preferred over the edge of a chip. */
export function locate(root: HTMLElement, flat: number): { node: Node; offset: number } {
  let rest = Math.max(0, flat)
  for (const leaf of leaves(root)) {
    if (!leaf.atom) {
      if (rest <= leaf.length) return { node: leaf.node, offset: rest }
      rest -= leaf.length
    } else {
      if (rest === 0) return { node: leaf.node.parentNode as Node, offset: indexIn(leaf.node) }
      rest -= 1
    }
  }
  // The end: before the placeholder break, where the caret can sit after the last chip.
  const last = root.lastChild as Element | null
  const trailing = last?.nodeType === 1 && last.tagName === "BR" && last.hasAttribute("data-trailing")
  return { node: root, offset: root.childNodes.length - (trailing ? 1 : 0) }
}

const indexIn = (node: Node): number => Array.prototype.indexOf.call(node.parentNode?.childNodes ?? [], node)

/** A DOM range for flat positions. */
export function rangeOf(root: HTMLElement, start: number, end = start): Range {
  const range = root.ownerDocument.createRange()
  const a = locate(root, start)
  const b = end === start ? a : locate(root, end)
  range.setStart(a.node, a.offset)
  range.setEnd(b.node, b.offset)
  return range
}

// ---------- Selection ----------

/** The selection's range when it lies inside the editor. */
export function selectionRange(root: HTMLElement): Range | null {
  const sel = root.ownerDocument.defaultView?.getSelection?.()
  if (!sel || sel.rangeCount === 0) return null
  const range = sel.getRangeAt(0)
  return root.contains(range.startContainer) && root.contains(range.endContainer) ? range : null
}

/** The flat position of the caret, or the start of the selection. Null when the selection is elsewhere. */
export function caretFlat(root: HTMLElement): number | null {
  const range = selectionRange(root)
  return range ? flatOffset(root, range.startContainer, range.startOffset) : null
}

/** The flat positions of the selection, start first. Null when it is elsewhere. */
export function selectionFlat(root: HTMLElement): { start: number; end: number } | null {
  const range = selectionRange(root)
  if (!range) return null
  return {
    start: flatOffset(root, range.startContainer, range.startOffset),
    end: flatOffset(root, range.endContainer, range.endOffset),
  }
}

/** Select a flat range (a caret when `end` is omitted). */
export function selectFlat(root: HTMLElement, start: number, end = start): void {
  const sel = root.ownerDocument.defaultView?.getSelection?.()
  if (!sel) return
  sel.removeAllRanges()
  sel.addRange(rangeOf(root, start, end))
}

/**
 * Keep the selection out of chips: a boundary point inside a chip moves to the nearer edge outside it.
 * Returns true when it changed the selection.
 */
export function keepOutOfChips(root: HTMLElement): boolean {
  const doc = root.ownerDocument
  const sel = doc.defaultView?.getSelection?.()
  const range = selectionRange(root)
  if (!sel || !range) return false
  const fix = (container: Node, isStart: boolean): { node: Node; offset: number } | null => {
    const chip = chipAround(container, root)
    if (!chip) return null
    const parent = chip.parentNode as Node
    const at = indexIn(chip)
    // Anything inside the chip: a collapsed caret goes after it, a range edge goes outward.
    const after = range.collapsed || !isStart
    return { node: parent, offset: after ? at + 1 : at }
  }
  const a = fix(range.startContainer, true)
  const b = fix(range.endContainer, false)
  if (!a && !b) return false
  const next = doc.createRange()
  next.setStart(a?.node ?? range.startContainer, a?.offset ?? range.startOffset)
  next.setEnd(b?.node ?? range.endContainer, b?.offset ?? range.endOffset)
  sel.removeAllRanges()
  sel.addRange(next)
  return true
}

// ---------- Editing ----------

/** Nodes for text: one text node, newlines kept as characters. */
const textNode = (root: HTMLElement, text: string) => root.ownerDocument.createTextNode(text)

/**
 * Replace a flat range with nodes and put the caret after them. Returns the flat position of the caret.
 * Works on the DOM directly, so the editor's own undo is not used; the composer keeps its own history.
 */
export function replaceFlat(root: HTMLElement, start: number, end: number, nodes: Node[]): number {
  // Measured first: normalising merges text nodes, and the node that survives takes its neighbours' text.
  const inserted = nodes.reduce((n, node) => n + flatLength(node), 0)
  const range = rangeOf(root, start, end)
  range.deleteContents()
  // A collapsed range grows past what is inserted, so inserting the last node first keeps the order.
  for (const node of nodes.slice().reverse()) range.insertNode(node)
  root.normalize()
  const caret = start + inserted
  selectFlat(root, caret)
  return caret
}

/** Insert plain text at the selection, replacing what is selected. Returns the new caret. */
export function insertTextAtSelection(root: HTMLElement, text: string): number {
  const sel = selectionFlat(root) ?? { start: flatLength(root), end: flatLength(root) }
  return replaceFlat(root, sel.start, sel.end, text === "" ? [] : [textNode(root, text)])
}

/** Plain text from a paste or drop: CRLF and CR become LF, other control characters go. */
export function cleanPlainText(text: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: this strips control characters on purpose
  return text.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​]/g, "")
}

/**
 * What a backspace or delete key would take out whole: the chip next to a collapsed caret on the given
 * side, as a flat range, or null when the key should do its normal work.
 */
export function chipToDelete(
  root: HTMLElement,
  direction: "backward" | "forward",
): { start: number; end: number } | null {
  const sel = selectionFlat(root)
  if (!sel || sel.start !== sel.end) return null
  const at = sel.start
  const flat = flatText(root)
  const index = direction === "backward" ? at - 1 : at
  return flat[index] === CHIP ? { start: index, end: index + 1 } : null
}

// ---------- History ----------

export interface HistoryEntry {
  value: ComposerValue
  caret: number
}

/**
 * Undo and redo for the editor, kept here because the browser's own undo does not survive the DOM edits
 * the composer makes itself. Typing within `burst` ms is one step.
 */
export function createHistory(initial: HistoryEntry, options: { burst?: number; limit?: number } = {}) {
  const burst = options.burst ?? 700
  const limit = options.limit ?? 200
  let past: HistoryEntry[] = []
  let future: HistoryEntry[] = []
  let present = initial
  let lastTyped = 0
  return {
    /** Remember a new state. `typing` joins it to the previous typing step when it follows closely. */
    record(entry: HistoryEntry, typing: boolean, now = Date.now()): void {
      if (sameSegments(entry.value, present.value)) {
        present = entry
        return
      }
      if (typing && now - lastTyped < burst && past.length > 0) present = entry
      else {
        past.push(present)
        if (past.length > limit) past = past.slice(past.length - limit)
        present = entry
      }
      lastTyped = typing ? now : 0
      future = []
    },
    undo(): HistoryEntry | undefined {
      const back = past.pop()
      if (!back) return undefined
      future.push(present)
      present = back
      lastTyped = 0
      return present
    },
    redo(): HistoryEntry | undefined {
      const next = future.pop()
      if (!next) return undefined
      past.push(present)
      present = next
      lastTyped = 0
      return present
    },
    /** Forget everything and start from this state. */
    reset(entry: HistoryEntry): void {
      past = []
      future = []
      present = entry
      lastTyped = 0
    },
  }
}
