// Line and word diffing (Myers), unified patch parsing, and the row model DiffView renders.

export interface Segment {
  text: string
  /** True for the words that differ between a removed and an added line. */
  changed: boolean
}

export type DiffKind = "context" | "add" | "del"

export interface DiffLine {
  kind: DiffKind
  /** Line number in the old text, for context and removed lines. */
  oldNo?: number
  /** Line number in the new text, for context and added lines. */
  newNo?: number
  text: string
  /** Word-level segments, set on removed and added lines that were paired. */
  segments?: Segment[]
}

export interface DiffHunk {
  /** The `@@ -8,4 +8,6 @@ context` header line. */
  header: string
  lines: DiffLine[]
}

export interface FileDiff {
  oldPath?: string
  newPath?: string
  hunks: DiffHunk[]
}

type Op = { type: "equal" | "add" | "del"; a?: number; b?: number }

/** Myers shortest edit script between two arrays of strings. */
export function myers(a: readonly string[], b: readonly string[]): Op[] {
  const n = a.length
  const m = b.length
  const max = n + m
  if (max === 0) return []
  const offset = max
  const v = new Int32Array(2 * max + 2)
  const trace: Int32Array[] = []
  let found = false
  for (let d = 0; d <= max && !found; d++) {
    trace.push(v.slice())
    for (let k = -d; k <= d; k += 2) {
      let x: number
      if (k === -d || (k !== d && (v[offset + k - 1] as number) < (v[offset + k + 1] as number)))
        x = v[offset + k + 1] as number
      else x = (v[offset + k - 1] as number) + 1
      let y = x - k
      while (x < n && y < m && a[x] === b[y]) {
        x++
        y++
      }
      v[offset + k] = x
      if (x >= n && y >= m) {
        found = true
        break
      }
    }
  }
  const ops: Op[] = []
  let x = n
  let y = m
  for (let d = trace.length - 1; d >= 0; d--) {
    const vd = trace[d] as Int32Array
    const k = x - y
    let prevK: number
    if (k === -d || (k !== d && (vd[offset + k - 1] as number) < (vd[offset + k + 1] as number)))
      prevK = k + 1
    else prevK = k - 1
    const prevX = vd[offset + prevK] as number
    const prevY = prevX - prevK
    while (x > prevX && y > prevY) {
      x--
      y--
      ops.push({ type: "equal", a: x, b: y })
    }
    if (d > 0) {
      if (x === prevX) {
        y--
        ops.push({ type: "add", b: y })
      } else {
        x--
        ops.push({ type: "del", a: x })
      }
    }
  }
  return ops.reverse()
}

const TOKEN = /\s+|[A-Za-z0-9_]+|[^\sA-Za-z0-9_]/g

/** Word-level diff of two lines: the segments of each side, with the differing words marked. */
export function diffWords(oldText: string, newText: string): { old: Segment[]; new: Segment[] } {
  const a = oldText.match(TOKEN) ?? []
  const b = newText.match(TOKEN) ?? []
  const ops = myers(a, b)
  const left: Segment[] = []
  const right: Segment[] = []
  const push = (list: Segment[], text: string, changed: boolean) => {
    const last = list[list.length - 1]
    if (last && last.changed === changed) last.text += text
    else list.push({ text, changed })
  }
  for (const op of ops) {
    if (op.type === "equal") {
      push(left, a[op.a as number] as string, false)
      push(right, b[op.b as number] as string, false)
    } else if (op.type === "del") push(left, a[op.a as number] as string, true)
    else push(right, b[op.b as number] as string, true)
  }
  // Whitespace-only changes inside a changed run read better as part of the run.
  return { old: left, new: right }
}

function splitLines(text: string): string[] {
  if (text === "") return []
  const lines = text.split("\n")
  if (lines[lines.length - 1] === "") lines.pop()
  return lines
}

/** Pair removed and added lines that sit next to each other and add word-level segments to them. */
function pairWords(lines: DiffLine[]): void {
  let i = 0
  while (i < lines.length) {
    if ((lines[i] as DiffLine).kind !== "del") {
      i++
      continue
    }
    let j = i
    while (j < lines.length && (lines[j] as DiffLine).kind === "del") j++
    let k = j
    while (k < lines.length && (lines[k] as DiffLine).kind === "add") k++
    const dels = j - i
    const adds = k - j
    for (let p = 0; p < Math.min(dels, adds); p++) {
      const del = lines[i + p] as DiffLine
      const add = lines[j + p] as DiffLine
      const words = diffWords(del.text, add.text)
      // Skip pairs that share nothing: marking the whole line adds no information.
      if (words.old.some((s) => !s.changed) || words.new.some((s) => !s.changed)) {
        del.segments = words.old
        add.segments = words.new
      }
    }
    i = k
  }
}

/** Diff two strings into hunks with `context` unchanged lines around each change (default 3). */
export function diffStrings(before: string, after: string, options: { context?: number } = {}): DiffHunk[] {
  const context = options.context ?? 3
  const a = splitLines(before)
  const b = splitLines(after)
  const ops = myers(a, b)
  const all: DiffLine[] = ops.map((op) =>
    op.type === "equal"
      ? {
          kind: "context",
          oldNo: (op.a as number) + 1,
          newNo: (op.b as number) + 1,
          text: a[op.a as number] as string,
        }
      : op.type === "del"
        ? { kind: "del", oldNo: (op.a as number) + 1, text: a[op.a as number] as string }
        : { kind: "add", newNo: (op.b as number) + 1, text: b[op.b as number] as string },
  )
  const changed = all.map((l) => l.kind !== "context")
  if (!changed.some(Boolean)) return []
  const keep = new Array<boolean>(all.length).fill(false)
  changed.forEach((isChanged, i) => {
    if (!isChanged) return
    for (let d = -context; d <= context; d++) if (i + d >= 0 && i + d < all.length) keep[i + d] = true
  })
  const hunks: DiffHunk[] = []
  let current: DiffLine[] | undefined
  for (let i = 0; i < all.length; i++) {
    if (keep[i]) {
      if (!current) {
        current = []
        hunks.push({ header: "", lines: current })
      }
      current.push(all[i] as DiffLine)
    } else current = undefined
  }
  for (const hunk of hunks) {
    pairWords(hunk.lines)
    hunk.header = hunkHeader(hunk.lines)
  }
  return hunks
}

function hunkHeader(lines: DiffLine[]): string {
  const old = lines.filter((l) => l.kind !== "add")
  const next = lines.filter((l) => l.kind !== "del")
  const oldStart = old[0]?.oldNo ?? lines.find((l) => l.oldNo)?.oldNo ?? 0
  const newStart = next[0]?.newNo ?? lines.find((l) => l.newNo)?.newNo ?? 0
  return `@@ -${oldStart},${old.length} +${newStart},${next.length} @@`
}

/** Parse a unified patch (one or several files) into hunks. Lines outside hunks are ignored. */
export function parsePatch(patch: string): FileDiff[] {
  const files: FileDiff[] = []
  let file: FileDiff | undefined
  let hunk: DiffHunk | undefined
  let oldNo = 0
  let newNo = 0
  const ensureFile = () => {
    if (!file) {
      file = { hunks: [] }
      files.push(file)
    }
    return file
  }
  for (const raw of patch.replace(/\r\n/g, "\n").split("\n")) {
    if (raw.startsWith("diff --git ")) {
      file = { hunks: [] }
      files.push(file)
      hunk = undefined
    } else if (raw.startsWith("--- ") && !hunk) {
      ensureFile().oldPath = stripPrefix(raw.slice(4))
    } else if (raw.startsWith("+++ ") && !hunk) {
      ensureFile().newPath = stripPrefix(raw.slice(4))
    } else if (raw.startsWith("@@")) {
      const m = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw)
      if (!m) continue
      oldNo = Number(m[1])
      newNo = Number(m[2])
      hunk = { header: raw, lines: [] }
      ensureFile().hunks.push(hunk)
    } else if (hunk) {
      if (raw.startsWith("\\")) continue
      const sign = raw[0]
      const text = raw.slice(1)
      if (sign === "+") hunk.lines.push({ kind: "add", newNo: newNo++, text })
      else if (sign === "-") hunk.lines.push({ kind: "del", oldNo: oldNo++, text })
      else if (sign === " ") hunk.lines.push({ kind: "context", oldNo: oldNo++, newNo: newNo++, text })
      else if (raw === "") continue
      else hunk = undefined
    }
  }
  for (const f of files) for (const h of f.hunks) pairWords(h.lines)
  return files.filter((f) => f.hunks.length > 0)
}

function stripPrefix(path: string): string {
  const clean = path.split("\t")[0] as string
  return clean === "/dev/null" ? clean : clean.replace(/^[ab]\//, "")
}

export interface SplitRow {
  left?: DiffLine
  right?: DiffLine
}

/** Lay a hunk's lines out in two columns: removed lines on the left, added on the right, paired in order. */
export function toSplitRows(lines: DiffLine[]): SplitRow[] {
  const rows: SplitRow[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i] as DiffLine
    if (line.kind === "context") {
      rows.push({ left: line, right: line })
      i++
    } else {
      const dels: DiffLine[] = []
      const adds: DiffLine[] = []
      while (i < lines.length && (lines[i] as DiffLine).kind === "del") dels.push(lines[i++] as DiffLine)
      while (i < lines.length && (lines[i] as DiffLine).kind === "add") adds.push(lines[i++] as DiffLine)
      for (let p = 0; p < Math.max(dels.length, adds.length); p++)
        rows.push({ left: dels[p], right: adds[p] })
    }
  }
  return rows
}

/** Count of added and removed lines across hunks. */
export function countChanges(hunks: DiffHunk[]): { added: number; removed: number } {
  let added = 0
  let removed = 0
  for (const h of hunks)
    for (const l of h.lines) {
      if (l.kind === "add") added++
      else if (l.kind === "del") removed++
    }
  return { added, removed }
}
