// A small, dependency-free tokenizer that maps source text to the `syn-*` classes of CodeBlock.

/** `k` keyword, `s` string, `f` function, `t` type, `n` number, `c` comment, `p` punctuation. */
export type TokenKind = "k" | "s" | "f" | "t" | "n" | "c" | "p"

export interface CodeToken {
  text: string
  kind?: TokenKind
  /** Marks the token with a wavy diagnostic underline. */
  error?: boolean
}

interface LangSpec {
  keywords: Set<string>
  lineComment?: string[]
  blockComment?: [string, string]
  quotes: string[]
  /** Capitalised identifiers are types. */
  types: boolean
}

const words = (s: string) => new Set(s.split(/\s+/).filter(Boolean))
const JS = words(
  "const let var function return if else for while do switch case break continue new class extends import export from default async await try catch finally throw typeof instanceof in of this super static get set void delete yield interface type enum implements public private protected readonly as satisfies null undefined true false",
)
const RUST = words(
  "fn let mut const static struct enum impl trait pub use mod crate self Self super match if else for while loop break continue return async await move ref where type as in dyn unsafe extern true false",
)
const PY = words(
  "def class return if elif else for while break continue import from as with try except finally raise pass lambda yield async await in is not and or None True False global nonlocal assert del",
)
const SH = words(
  "if then else elif fi for while do done case esac function in export local return echo cd set unset source",
)
const GO = words(
  "func var const type struct interface map chan package import return if else for range switch case default break continue go defer select fallthrough nil true false",
)

const LANGS: Record<string, LangSpec> = {
  ts: { keywords: JS, lineComment: ["//"], blockComment: ["/*", "*/"], quotes: ['"', "'", "`"], types: true },
  rust: { keywords: RUST, lineComment: ["//"], blockComment: ["/*", "*/"], quotes: ['"'], types: true },
  py: { keywords: PY, lineComment: ["#"], quotes: ['"', "'"], types: true },
  sh: { keywords: SH, lineComment: ["#"], quotes: ['"', "'"], types: false },
  go: { keywords: GO, lineComment: ["//"], blockComment: ["/*", "*/"], quotes: ['"', "`"], types: true },
  json: { keywords: words("true false null"), quotes: ['"'], types: false },
  css: {
    keywords: words("@media @layer @import @keyframes !important"),
    blockComment: ["/*", "*/"],
    quotes: ['"', "'"],
    types: false,
  },
  text: { keywords: new Set(), quotes: [], types: false },
}
const ALIAS: Record<string, string> = {
  js: "ts",
  jsx: "ts",
  tsx: "ts",
  javascript: "ts",
  typescript: "ts",
  rs: "rust",
  python: "py",
  bash: "sh",
  shell: "sh",
  zsh: "sh",
  golang: "go",
  jsonc: "json",
  toml: "sh",
  yaml: "sh",
  yml: "sh",
}
const PUNCT = new Set("{}()[];,.:=<>+-*/%&|!?^~@".split(""))

/** Tokenise `code` as `language` (ts, js, tsx, rust, py, sh, go, json, css; anything else is plain). Returns one token list per line. */
export function highlight(code: string, language = "text"): CodeToken[][] {
  const key = ALIAS[language.toLowerCase()] ?? language.toLowerCase()
  const spec = LANGS[key] ?? (LANGS.text as LangSpec)
  const tokens: CodeToken[] = []
  const push = (text: string, kind?: TokenKind) => {
    if (!text) return
    const last = tokens[tokens.length - 1]
    if (last && last.kind === kind && kind !== "f") last.text += text
    else tokens.push({ text, kind })
  }
  let i = 0
  const n = code.length
  const at = (s: string) => code.startsWith(s, i)
  while (i < n) {
    const ch = code[i] as string
    const lc = spec.lineComment?.find((c) => at(c))
    if (lc) {
      let j = code.indexOf("\n", i)
      if (j < 0) j = n
      push(code.slice(i, j), "c")
      i = j
      continue
    }
    if (spec.blockComment && at(spec.blockComment[0])) {
      let j = code.indexOf(spec.blockComment[1], i + spec.blockComment[0].length)
      j = j < 0 ? n : j + spec.blockComment[1].length
      push(code.slice(i, j), "c")
      i = j
      continue
    }
    if (spec.quotes.includes(ch)) {
      let j = i + 1
      while (j < n && code[j] !== ch && (ch === "`" || code[j] !== "\n")) j += code[j] === "\\" ? 2 : 1
      j = Math.min(n, j + 1)
      push(code.slice(i, j), "s")
      i = j
      continue
    }
    if (/[0-9]/.test(ch) && !/[A-Za-z_$]/.test(code[i - 1] ?? "")) {
      const m = /^(0x[0-9a-fA-F_]+|\d[\d_]*(\.\d+)?([eE][+-]?\d+)?)/.exec(code.slice(i, i + 40))
      const len = m ? m[0].length : 1
      push(code.slice(i, i + len), "n")
      i += len
      continue
    }
    if (/[A-Za-z_$@]/.test(ch)) {
      const m = /^[@A-Za-z_$][\w$-]*/.exec(code.slice(i, i + 80)) as RegExpExecArray
      let word = m[0]
      if (key !== "css" && key !== "sh") word = /^[@A-Za-z_$][\w$]*/.exec(word)?.[0] ?? word
      const next = code[i + word.length]
      if (spec.keywords.has(word)) push(word, "k")
      else if (next === "(") push(word, "f")
      else if (spec.types && /^[A-Z]/.test(word)) push(word, "t")
      else push(word)
      i += word.length
      continue
    }
    if (PUNCT.has(ch)) push(ch, "p")
    else push(ch)
    i++
  }
  // Split into lines. A token that spans lines (block comment, template string) is cut at each newline.
  const lines: CodeToken[][] = [[]]
  for (const token of tokens) {
    const parts = token.text.split("\n")
    parts.forEach((part, index) => {
      if (index > 0) lines.push([])
      if (part) (lines[lines.length - 1] as CodeToken[]).push({ ...token, text: part })
    })
  }
  return lines
}

/** Apply diagnostic ranges (0-based line, column from and to) to tokenised lines by splitting tokens at the boundaries. */
export function applyErrors(
  lines: CodeToken[][],
  errors: Array<{ line: number; from: number; to: number }>,
): CodeToken[][] {
  return lines.map((tokens, lineIndex) => {
    const ranges = errors.filter((e) => e.line === lineIndex)
    if (ranges.length === 0) return tokens
    const out: CodeToken[] = []
    let col = 0
    for (const token of tokens) {
      let start = 0
      const end = token.text.length
      const cuts = new Set<number>()
      for (const r of ranges) for (const c of [r.from - col, r.to - col]) if (c > 0 && c < end) cuts.add(c)
      const points = [...cuts].sort((a, b) => a - b)
      points.push(end)
      for (const point of points) {
        const piece = token.text.slice(start, point)
        const absolute = col + start
        out.push({
          ...token,
          text: piece,
          error: ranges.some((r) => absolute >= r.from && absolute < r.to) || undefined,
        })
        start = point
      }
      col += end
    }
    return out
  })
}
