// The arithmetic a NumberField accepts: `12*4`, `(3+4)/2`, `100-15%` (15% off), `+5` / `-5` / `*2` / `/2`
// applied to the current value, and amounts in the field's units (`10px`, `1.5h`, `1h 30m`). A recursive-descent
// parser over a token list; nothing is evaluated as code.
//
//   input    := "=" expr | ("+" | "-" | "*" | "/") expr | expr
//               (with a current value, a leading operator continues from it; "=" makes "-5" mean minus five)
//   expr     := term (("+" | "-") term)*          (`a - b%` is a less b percent of a, as on a calculator)
//   term     := unary (("*" | "/" | "x") unary)*
//   unary    := ("-" | "+") unary | primary "%"*  (`b%` anywhere else is b / 100)
//   primary  := amount+ | "(" expr ")" [unit]
//   amount   := number [unit]                     (amounts in a row add up: `1h 30m`; a decimal comma reads as a point)

/** Units a field takes: each name and how many of the field's own unit it is (`{ m: 1, h: 60 }` for minutes). */
export type Units = Readonly<Record<string, number>>

/** Unit tables for the common cases. The value is in the first unit of each. */
export const UNITS = {
  /** A duration kept in minutes. */
  minutes: { m: 1, min: 1, h: 60, hr: 60, d: 1440 },
  /** A duration kept in seconds. */
  seconds: { s: 1, sec: 1, m: 60, min: 60, h: 3600 },
  /** A duration kept in hours. */
  hours: { h: 1, hr: 1, m: 1 / 60, min: 1 / 60, d: 24 },
  /** Pixels. */
  px: { px: 1 },
  /** A percentage kept as 0–100: `%` is then the unit, not "percent of". */
  percent: { "%": 1 },
  /** Bytes, with binary multiples. */
  bytes: { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 },
} as const satisfies Record<string, Units>

export interface EvaluateOptions {
  /** The field's value before the edit; `+5`, `-5`, `*2` and `/2` apply to it. */
  current?: number | null
  /** The units the field accepts. Without them a unit is an error. */
  units?: Units
}

export type EvaluateResult = { ok: true; value: number | null } | { ok: false; error: string }

type Tok =
  | { t: "num"; v: number; at: number }
  | { t: "op"; v: "+" | "-" | "*" | "/" | "(" | ")" | "%" | "="; at: number }
  | { t: "unit"; v: string; at: number }

class ExprError extends Error {}

const OPS: Record<string, "+" | "-" | "*" | "/" | "(" | ")" | "%" | "="> = {
  "+": "+",
  "-": "-",
  "−": "-",
  "*": "*",
  "×": "*",
  x: "*",
  "/": "/",
  "÷": "/",
  "(": "(",
  ")": ")",
  "%": "%",
  "=": "=",
}

function tokenize(src: string, units: Units | undefined): Tok[] {
  const out: Tok[] = []
  let i = 0
  const percentIsUnit = units !== undefined && "%" in units
  while (i < src.length) {
    const ch = src[i]!
    if (/\s/.test(ch)) {
      i++
      continue
    }
    const num = /^(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?/i.exec(src.slice(i))
    if (num) {
      const v = Number(num[0].replace(",", "."))
      if (!Number.isFinite(v)) throw new ExprError(`“${num[0]}” is not a number`)
      out.push({ t: "num", v, at: i })
      i += num[0].length
      continue
    }
    // A word: a unit (or `x` for times, between two numbers).
    const word = /^[a-zA-Zµ°]+/.exec(src.slice(i))
    if (word) {
      const w = word[0]
      const prev = out[out.length - 1]
      if (
        w === "x" &&
        prev &&
        (prev.t === "num" || (prev.t === "op" && prev.v === ")") || prev.t === "unit")
      ) {
        out.push({ t: "op", v: "*", at: i })
      } else out.push({ t: "unit", v: w, at: i })
      i += w.length
      continue
    }
    if (ch === "%" && percentIsUnit) {
      out.push({ t: "unit", v: "%", at: i })
      i++
      continue
    }
    const op = OPS[ch]
    if (op && ch !== "x") {
      out.push({ t: "op", v: op, at: i })
      i++
      continue
    }
    throw new ExprError(`Unexpected “${ch}”`)
  }
  return out
}

function unitFactor(name: string, units: Units | undefined): number {
  if (!units) throw new ExprError(`This field takes no units (“${name}”)`)
  if (name in units) return units[name]!
  const lower = name.toLowerCase()
  const hit = Object.keys(units).find((k) => k.toLowerCase() === lower)
  if (hit) return units[hit]!
  throw new ExprError(`Unknown unit “${name}”; use ${Object.keys(units).join(", ")}`)
}

type Node =
  | { k: "num"; v: number }
  | { k: "pct"; of: Node }
  | { k: "neg"; of: Node }
  | { k: "bin"; op: "+" | "-" | "*" | "/"; l: Node; r: Node }

class Parser {
  i = 0
  constructor(
    private toks: Tok[],
    private units: Units | undefined,
  ) {}
  peek(): Tok | undefined {
    return this.toks[this.i]
  }
  isOp(v: string): boolean {
    const t = this.peek()
    return !!t && t.t === "op" && t.v === v
  }
  take(): Tok {
    return this.toks[this.i++]!
  }
  done(): boolean {
    return this.i >= this.toks.length
  }
  expr(): Node {
    let l = this.term()
    while (this.isOp("+") || this.isOp("-")) {
      const op = (this.take() as { v: "+" | "-" }).v
      l = { k: "bin", op, l, r: this.term() }
    }
    return l
  }
  term(): Node {
    let l = this.unary()
    while (this.isOp("*") || this.isOp("/")) {
      const op = (this.take() as { v: "*" | "/" }).v
      l = { k: "bin", op, l, r: this.unary() }
    }
    return l
  }
  unary(): Node {
    if (this.isOp("-")) {
      this.i++
      return { k: "neg", of: this.unary() }
    }
    if (this.isOp("+")) {
      this.i++
      return this.unary()
    }
    let v = this.primary()
    while (this.isOp("%")) {
      this.i++
      v = { k: "pct", of: v }
    }
    return v
  }
  primary(): Node {
    const t = this.peek()
    if (!t) throw new ExprError("Missing a number")
    if (t.t === "op" && t.v === "(") {
      this.i++
      const v = this.expr()
      if (!this.isOp(")")) throw new ExprError("Missing “)”")
      this.i++
      const u = this.peek()
      if (u && u.t === "unit") {
        this.i++
        return { k: "bin", op: "*", l: v, r: { k: "num", v: unitFactor(u.v, this.units) } }
      }
      return v
    }
    if (t.t === "num") {
      // Amounts in a row add up (`1h 30m`); each then needs its unit.
      let total = 0
      let count = 0
      while (this.peek()?.t === "num") {
        const n = this.take() as { v: number }
        const u = this.peek()
        if (u && u.t === "unit") {
          this.i++
          total += n.v * unitFactor(u.v, this.units)
        } else if (count > 0) throw new ExprError("Each amount needs a unit, as in 1h 30m")
        else {
          total += n.v
          if (this.peek()?.t === "num") throw new ExprError("Missing an operator between numbers")
          return { k: "num", v: total }
        }
        count++
      }
      return { k: "num", v: total }
    }
    if (t.t === "unit") {
      const known = this.units && Object.keys(this.units).some((k) => k.toLowerCase() === t.v.toLowerCase())
      throw new ExprError(known ? `“${t.v}” needs a number before it` : `“${t.v}” is not a number`)
    }
    const prev = this.toks[this.i - 1]
    if (t.t === "op" && t.v === ")" && !(prev?.t === "op" && prev.v === "("))
      throw new ExprError("Unexpected “)”")
    throw new ExprError("Missing a number")
  }
}

function evaluate(n: Node): number {
  switch (n.k) {
    case "num":
      return n.v
    case "neg":
      return -evaluate(n.of)
    case "pct":
      return evaluate(n.of) / 100
    case "bin": {
      const l = evaluate(n.l)
      // `a + b%` and `a - b%`: b percent of a, as on a calculator. Elsewhere `b%` is b / 100.
      if ((n.op === "+" || n.op === "-") && n.r.k === "pct") {
        const d = (l * evaluate(n.r.of)) / 100
        return n.op === "+" ? l + d : l - d
      }
      const r = evaluate(n.r)
      if (n.op === "+") return l + r
      if (n.op === "-") return l - r
      if (n.op === "*") return l * r
      if (r === 0) throw new ExprError("Division by zero")
      return l / r
    }
  }
}

/**
 * Evaluates what a person typed into a number field. Empty input gives `null` (the caller decides whether a
 * field may be empty); anything it cannot read gives an error message and no value, so the field keeps its old
 * value and shows the error. With a current value, input that starts with `+`, `-`, `*` or `/` continues from
 * it (`-15%` is 15% off, `*2` doubles); `=` at the start makes the rest absolute (`=-5`).
 */
export function evaluateExpression(input: string, options: EvaluateOptions = {}): EvaluateResult {
  const src = input.trim()
  if (!src) return { ok: true, value: null }
  try {
    let toks = tokenize(src, options.units)
    const first = toks[0]!
    const cur = options.current
    const hasCurrent = cur !== null && cur !== undefined && Number.isFinite(cur)
    if (first.t === "op" && first.v === "=") toks = toks.slice(1)
    else if (first.t === "op" && (first.v === "*" || first.v === "/")) {
      if (!hasCurrent) throw new ExprError(`“${first.v}” needs a value to apply to`)
      toks = [{ t: "num", v: cur as number, at: -1 }, ...toks]
    } else if (first.t === "op" && (first.v === "+" || first.v === "-") && hasCurrent) {
      toks = [{ t: "num", v: cur as number, at: -1 }, ...toks]
    }
    if (toks.some((t) => t.t === "op" && t.v === "=")) throw new ExprError("Unexpected “=”")
    const p = new Parser(toks, options.units)
    if (p.done()) throw new ExprError("Missing a number")
    const tree = p.expr()
    if (!p.done()) throw trailing(p)
    const v = evaluate(tree)
    if (!Number.isFinite(v)) throw new ExprError("The result is not a number")
    return { ok: true, value: tidy(v) }
  } catch (e) {
    if (e instanceof ExprError) return { ok: false, error: e.message }
    throw e
  }
}

function trailing(p: Parser): ExprError {
  const t = p.peek()
  if (t?.t === "op" && t.v === ")") return new ExprError("Unexpected “)”")
  if (t?.t === "unit") return new ExprError(`Unexpected “${t.v}”`)
  if (t?.t === "num") return new ExprError("Missing an operator between numbers")
  return new ExprError("Unexpected input after the number")
}

/** Rounds away binary noise: `0.1 + 0.2` is 0.3. */
export function tidy(v: number): number {
  return Number.parseFloat(v.toPrecision(12))
}

/** Decimal places of a step: 0.25 has 2, 5 has 0. */
export function decimalsOf(step: number): number {
  if (!Number.isFinite(step)) return 0
  const s = String(step)
  const e = /e-(\d+)$/.exec(s)
  if (e) return Number(e[1])
  const dot = s.indexOf(".")
  return dot < 0 ? 0 : s.length - dot - 1
}

/** Clamps to `[min, max]` (either may be missing). */
export function clamp(v: number, min?: number, max?: number): number {
  if (min !== undefined && v < min) return min
  if (max !== undefined && v > max) return max
  return v
}

/** Snaps to the nearest step counted from `min` (or 0), at the step's precision. */
export function snap(v: number, step: number, min = 0): number {
  if (!(step > 0)) return v
  const n = Math.round((v - min) / step)
  return Number((min + n * step).toFixed(Math.max(decimalsOf(step), decimalsOf(min))))
}

/** Writes a value in the largest units that divide it, for fields with units: 90 minutes is `1h 30m`. */
export function formatWithUnits(v: number, units: Units, pick?: string[]): string {
  const names = pick ?? Object.keys(units)
  const order = [...new Set(names)]
    .map((n) => [n, units[n]!] as const)
    .filter(([, f]) => f !== undefined)
    // One name per factor (m and min are the same unit), largest first.
    .filter(([, f], i, all) => all.findIndex(([, g]) => g === f) === i)
    .sort((a, b) => b[1] - a[1])
  if (!order.length || v === 0) return `${tidy(v)}${order.at(-1)?.[0] ?? ""}`
  const sign = v < 0 ? "-" : ""
  let rest = Math.abs(v)
  const parts: string[] = []
  for (const [name, f] of order) {
    const isLast = order[order.length - 1]![1] === f
    const n = isLast ? tidy(rest / f) : Math.floor(rest / f + 1e-9)
    if (n > 0) {
      parts.push(`${n}${name}`)
      rest = tidy(rest - n * f)
    }
    if (rest <= 0) break
  }
  return sign + parts.join(" ")
}
