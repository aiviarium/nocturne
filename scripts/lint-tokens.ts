// Fails when a .css, .tsx (or .jsx, .ts) file contains a hard-coded colour, radius or font size.
//
//   bun scripts/lint-tokens.ts [path ...] [--exclude name,name]
//
// Paths may be files or folders (default: src, gallery, examples and demo). Apps can run it on their own folders.
// The design system's own tokens.css and bundle.css are skipped by name, and so are tests and .d.ts files.
// A line can opt out with `lint-tokens-ignore`, or the next line with `lint-tokens-ignore-next-line`.
import { readdirSync, readFileSync, statSync } from "node:fs"
import { basename, extname, join, resolve } from "node:path"

export interface Finding {
  file: string
  line: number
  column: number
  rule: "colour" | "radius" | "font-size"
  message: string
  snippet: string
}

const EXTENSIONS = new Set([".css", ".tsx", ".jsx", ".ts"])
const DEFAULT_EXCLUDES = ["tokens.css", "bundle.css"]
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "coverage"])

const NAMED_COLOURS = new Set(
  "white black red green blue yellow orange purple pink gray grey silver gold cyan magenta lime navy teal maroon olive aqua fuchsia brown coral crimson indigo violet salmon tan khaki beige ivory lavender orchid plum tomato turquoise azure bisque chocolate firebrick gainsboro honeydew linen mintcyan moccasin peru sienna snow wheat".split(
    " ",
  ),
)
const COLOUR_PROP = /(^|-)color$|^background|^fill$|^stroke$|^border|^outline|shadow|^column-rule/
const COLOUR_FN = /(?<![\w-])(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|device-cmyk)\(/g
const HEX = /(?<![\w&#-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![\w-])/g
const NUMBER_UNIT = /(?<![\w.-])(?:\d+\.?\d*|\.\d+)(px|rem|em|pt|vw|vh|ch|%)(?![\w-])/g
const RADIUS_PROP = /^border(-(top|bottom)-(left|right)|-(start|end)-(start|end))?-radius$/
const CSS_WIDE = /^(inherit|initial|unset|revert|revert-layer|none|transparent|currentcolor)$/i

function kebab(prop: string): string {
  return prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
}

/** Blank out comments but keep line breaks, so reported line numbers stay right. */
function stripComments(text: string, css: boolean): string {
  let out = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
  if (!css)
    out = out.replace(/(^|[\s;,{(])\/\/[^\n]*/g, (m, lead) => lead + " ".repeat(m.length - lead.length))
  return out
}

function zeroOrKeyword(value: string): boolean {
  return value
    .trim()
    .split(/[\s/]+/)
    .every((part) => part === "" || part === "0" || /^0(px|rem|em|%)$/.test(part) || CSS_WIDE.test(part))
}

export function lintSource(file: string, text: string): Finding[] {
  const css = extname(file) === ".css"
  const clean = stripComments(text, css)
  const original = text.split("\n")
  const lines = clean.split("\n")
  const findings: Finding[] = []

  const ignored = (index: number): boolean =>
    /lint-tokens-ignore(?!-next-line)/.test(original[index] ?? "") ||
    /lint-tokens-ignore-next-line/.test(original[index - 1] ?? "")
  const add = (index: number, column: number, rule: Finding["rule"], message: string) => {
    if (ignored(index)) return
    findings.push({
      file,
      line: index + 1,
      column: column + 1,
      rule,
      message,
      snippet: (original[index] ?? "").trim().slice(0, 140),
    })
  }

  lines.forEach((line, index) => {
    for (const m of line.matchAll(HEX))
      add(index, m.index ?? 0, "colour", `hard-coded colour ${m[0]}; use a colour token (var(--...))`)
    for (const m of line.matchAll(COLOUR_FN)) {
      const rest = line.slice((m.index ?? 0) + m[0].length)
      if (m[1] === "oklch" && /^\s*from\s+var\(/.test(rest)) continue
      add(index, m.index ?? 0, "colour", `${m[1]}() colour; use a colour token (var(--...))`)
    }
    // Declarations: CSS `prop: value;` and TSX `prop: "value"`, `prop="value"`, `prop={...}`.
    const cssDecl = /()([A-Za-z][A-Za-z-]*)\s*:\s*()()()([^;}"'`\n]+)/g
    const tsxDecl =
      /(["']?)([A-Za-z][A-Za-z-]*)\1\s*[:=]\s*(?:\{\s*)?(?:"([^"]*)"|'([^']*)'|`([^`]*)`|((?![{"'`])[^;},\n]+))/g
    const seen = new Set<string>()
    const matches = css ? [...line.matchAll(cssDecl)] : [...line.matchAll(tsxDecl), ...line.matchAll(cssDecl)]
    for (const m of matches) {
      const prop = kebab(m[2] as string)
      const value = (m[3] || m[4] || m[5] || m[6] || "").trim()
      const at = m.index ?? 0
      if (seen.has(`${prop}|${value}`)) continue
      seen.add(`${prop}|${value}`)
      if (RADIUS_PROP.test(prop)) {
        if (!value.includes("var(") && !zeroOrKeyword(value) && /\d/.test(value)) {
          add(index, at, "radius", `hard-coded radius ${value}; use var(--radius-xs|sm|md|lg|xl|2xl|full)`)
        }
      } else if (prop === "font-size") {
        if (
          !value.includes("var(") &&
          !CSS_WIDE.test(value) &&
          (NUMBER_UNIT.test(value) || /^\d+\.?\d*$/.test(value))
        ) {
          add(
            index,
            at,
            "font-size",
            `hard-coded font size ${value}; use a type class (.body, .label, .section, ...) from tokens.css`,
          )
        }
        NUMBER_UNIT.lastIndex = 0
      } else if (prop === "font") {
        const literal = value.replace(/var\([^)]*\)/g, "")
        if (!CSS_WIDE.test(value) && /(?<![\w.-])\d+\.?\d*(px|rem|em|pt)(?![\w-])/.test(literal)) {
          add(
            index,
            at,
            "font-size",
            `hard-coded font size in font shorthand "${value}"; use a type class from tokens.css`,
          )
        }
      } else if (COLOUR_PROP.test(prop) && !prop.startsWith("border-radius")) {
        for (const word of value.split(/[\s,()/]+/)) {
          if (NAMED_COLOURS.has(word.toLowerCase()))
            add(index, at, "colour", `named colour ${word}; use a colour token (var(--...))`)
        }
      }
    }
  })
  return findings
}

function collect(path: string, excludes: Set<string>, out: string[]): void {
  const stat = statSync(path)
  if (stat.isDirectory()) {
    for (const entry of readdirSync(path)) {
      if (SKIP_DIRS.has(entry)) continue
      collect(join(path, entry), excludes, out)
    }
    return
  }
  const name = basename(path)
  if (
    !EXTENSIONS.has(extname(path)) ||
    excludes.has(name) ||
    name.endsWith(".d.ts") ||
    /\.(test|spec)\.[tj]sx?$/.test(name)
  )
    return
  out.push(path)
}

export function lintPaths(paths: string[], exclude: string[] = DEFAULT_EXCLUDES): Finding[] {
  const files: string[] = []
  for (const p of paths) collect(resolve(p), new Set(exclude), files)
  return files.sort().flatMap((file) => lintSource(file, readFileSync(file, "utf8")))
}

if (import.meta.main) {
  const args = process.argv.slice(2)
  const paths: string[] = []
  let exclude = DEFAULT_EXCLUDES
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--exclude")
      exclude = [...DEFAULT_EXCLUDES, ...(args[++i] ?? "").split(",").filter(Boolean)]
    else paths.push(args[i] as string)
  }
  if (paths.length === 0) paths.push("src", "gallery", "examples", "demo")
  const findings = lintPaths(paths, exclude)
  for (const f of findings) {
    console.error(
      `${f.file.replace(`${process.cwd()}/`, "")}:${f.line}:${f.column}  ${f.rule}  ${f.message}\n    ${f.snippet}`,
    )
  }
  if (findings.length > 0) {
    console.error(
      `\n${findings.length} hard-coded value${findings.length === 1 ? "" : "s"}. Use tokens (var(--...)) and the nc-* classes.`,
    )
    process.exit(1)
  }
  console.log(`lint:tokens ok (${paths.join(", ")})`)
}
