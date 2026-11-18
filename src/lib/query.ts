// The typed filter QueryBuilder edits: rules of field, operator and value in AND/OR groups (one level of
// nesting), over fields described by a schema. It converts to and from a store's structured filter (`where`:
// field conditions with eq, ne, in, nin, gt, gte, lt, lte and contains, combined with and, or and not), matches
// rows in memory, and reads and writes a query bar's text form (`state:open -label:bug estimate:>3 login`).
import type { Units } from "./expression"

export type QueryFieldType = "text" | "number" | "date" | "enum" | "boolean" | "person" | "relation"

export interface QueryOption {
  /** The value stored in rows: an enum value, a person's id, an entity URI. */
  value: string
  /** What the builder shows. */
  label: string
  /** A core icon before the label. */
  icon?: string
  /** One line under the label in the picker. */
  description?: string
}

export interface QueryField {
  /** The field's name in rows and in `where`. */
  name: string
  /** What the builder shows: "State", "Estimate". */
  label: string
  type: QueryFieldType
  /** A core icon before the label in the field menu. */
  icon?: string
  /** The choices of an `enum`, the people of a `person` field, the targets of a `relation`. */
  options?: QueryOption[]
  /** `number`: whole numbers only. */
  integer?: boolean
  /** `number`: the bounds and step of the value editor. */
  min?: number
  max?: number
  step?: number
  /** `number`: the unit shown after values ("pt", "h") and the units typed values may use. */
  unit?: string
  units?: Units
  /** `date`: the field holds an RFC 3339 date-time (`createdAt`), not a day; the builder still picks days. */
  datetime?: boolean
  /** `person` and `relation`: the field holds a list of references (a `refs` field). */
  multiple?: boolean
  /** The field's name in the text query, when not its `name` in lower case. */
  key?: string
  /** More names the text query accepts. */
  aliases?: string[]
}

export type QueryOperator =
  | "is"
  | "isNot"
  | "contains"
  | "notContains"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "before"
  | "after"
  | "withinLast"
  | "anyOf"
  | "noneOf"
  | "isEmpty"
  | "isNotEmpty"

/** A scalar, a list (`anyOf`, `noneOf`), or a pair (`between`). Dates are `YYYY-MM-DD`; `withinLast` is days. */
export type QueryValue = string | number | boolean | string[] | [number, number] | [string, string] | null

export interface QueryRule {
  /** Stable id for the builder's rows; `createQueryId` makes one. Not part of the filter's meaning. */
  id?: string
  field: string
  op: QueryOperator
  value?: QueryValue
}

export interface QueryGroup {
  id?: string
  /** `and`: every rule must match; `or`: at least one. */
  combinator: "and" | "or"
  /** Rules, and at the top level groups of rules (one level of nesting). */
  rules: QueryNode[]
}

export type QueryNode = QueryRule | QueryGroup

/** The store's structured filter, as FILTER.md describes it. */
export type Where = { [key: string]: unknown }

export const isGroup = (n: QueryNode): n is QueryGroup => "combinator" in n

let seq = 0
/** A fresh id for a rule or group. */
export function createQueryId(): string {
  seq += 1
  return `q${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/** An empty query: AND over nothing, which matches everything. */
export function emptyQuery(): QueryGroup {
  return { id: createQueryId(), combinator: "and", rules: [] }
}

// ── operators ────────────────────────────────────────────────────────────────────────────────────────

export interface OperatorInfo {
  op: QueryOperator
  /** In the operator picker: "is greater than". */
  label: string
  /** In a chip, between the field and the value: ">" ("Estimate > 3"). */
  short: string
  /** What the value editor edits. */
  value: "none" | "one" | "many" | "pair" | "days"
}

const OP: Record<QueryOperator, Omit<OperatorInfo, "op">> = {
  is: { label: "is", short: "is", value: "one" },
  isNot: { label: "is not", short: "is not", value: "one" },
  contains: { label: "contains", short: "contains", value: "one" },
  notContains: { label: "does not contain", short: "does not contain", value: "one" },
  gt: { label: "is greater than", short: ">", value: "one" },
  gte: { label: "is at least", short: "≥", value: "one" },
  lt: { label: "is less than", short: "<", value: "one" },
  lte: { label: "is at most", short: "≤", value: "one" },
  between: { label: "is between", short: "between", value: "pair" },
  before: { label: "is before", short: "before", value: "one" },
  after: { label: "is after", short: "after", value: "one" },
  withinLast: { label: "is within the last", short: "within the last", value: "days" },
  anyOf: { label: "is any of", short: "is any of", value: "many" },
  noneOf: { label: "is none of", short: "is none of", value: "many" },
  isEmpty: { label: "is empty", short: "is empty", value: "none" },
  isNotEmpty: { label: "is not empty", short: "is not empty", value: "none" },
}

const BY_TYPE: Record<QueryFieldType, QueryOperator[]> = {
  text: ["contains", "notContains", "is", "isNot", "isEmpty", "isNotEmpty"],
  number: ["is", "isNot", "gt", "gte", "lt", "lte", "between", "isEmpty", "isNotEmpty"],
  date: ["is", "before", "after", "between", "withinLast", "isEmpty", "isNotEmpty"],
  enum: ["is", "isNot", "anyOf", "noneOf", "isEmpty", "isNotEmpty"],
  boolean: ["is"],
  person: ["is", "isNot", "anyOf", "noneOf", "isEmpty", "isNotEmpty"],
  relation: ["is", "isNot", "anyOf", "noneOf", "isEmpty", "isNotEmpty"],
}

/** The operators a field offers, in the picker's order. A list of references cannot be empty-tested. */
export function operatorsFor(field: QueryField): OperatorInfo[] {
  let ops = BY_TYPE[field.type]
  if (field.multiple) ops = ops.filter((o) => o !== "isEmpty" && o !== "isNotEmpty")
  return ops.map((op) => ({ op, ...OP[op] }))
}

export function operatorInfo(op: QueryOperator): OperatorInfo {
  return { op, ...OP[op] }
}

/** The operator a new rule on the field starts with. */
export function defaultOperator(field: QueryField): QueryOperator {
  return BY_TYPE[field.type][0]!
}

/** The value a rule takes when its operator changes: kept when it still fits, otherwise blank. */
export function valueForOperator(
  field: QueryField,
  op: QueryOperator,
  prev: QueryValue | undefined,
): QueryValue | undefined {
  const shape = OP[op].value
  if (shape === "none") return undefined
  if (field.type === "boolean") return typeof prev === "boolean" ? prev : true
  if (shape === "many") {
    if (Array.isArray(prev)) return (prev as unknown[]).filter((v) => typeof v === "string") as string[]
    return typeof prev === "string" && prev ? [prev] : []
  }
  if (shape === "pair") {
    if (
      Array.isArray(prev) &&
      prev.length === 2 &&
      typeof prev[0] === typeof prev[1] &&
      prev[0] !== undefined
    )
      return prev as QueryValue
    if (typeof prev === "number") return [prev, prev]
    if (typeof prev === "string" && field.type === "date" && prev) return [prev, prev]
    return null
  }
  if (shape === "days") return typeof prev === "number" && prev > 0 && op === "withinLast" ? prev : 7
  if (Array.isArray(prev)) {
    const first = prev[0]
    return first === undefined ? null : (first as string | number)
  }
  if (op === "withinLast") return 7
  return prev ?? null
}

/** Whether a rule has what it needs to filter. A rule still being made (no value yet) is left out of the filter. */
export function isComplete(rule: QueryRule, field: QueryField | undefined): boolean {
  if (!field) return false
  const shape = OP[rule.op]?.value
  if (!shape || !BY_TYPE[field.type].includes(rule.op)) return false
  const v = rule.value
  switch (shape) {
    case "none":
      return true
    case "many":
      return Array.isArray(v) && v.length > 0
    case "pair":
      return Array.isArray(v) && v.length === 2 && v.every((x) => x !== null && x !== "" && x !== undefined)
    case "days":
      return typeof v === "number" && v > 0
    default:
      if (field.type === "boolean") return typeof v === "boolean"
      if (field.type === "number") return typeof v === "number" && Number.isFinite(v)
      if (field.type === "date") return typeof v === "string" && DAY.test(v)
      return typeof v === "string" && v !== ""
  }
}

// ── describing a rule ────────────────────────────────────────────────────────────────────────────────

export interface QueryFormat {
  /** Writes a day (`YYYY-MM-DD`) for people. Default "Mar 4" in this year, "Mar 4, 2024" otherwise. */
  date?: (day: string) => string
  /** Writes a number. Default up to two decimals and the field's unit. */
  number?: (n: number, field: QueryField) => string
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function formatDay(day: string, now: Date = new Date()): string {
  const m = DAY.exec(day)
  if (!m) return day
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const s = `${MONTHS[mo - 1]} ${d}`
  return y === now.getFullYear() ? s : `${s}, ${y}`
}

function formatNumber(n: number, field: QueryField): string {
  const s = Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)))
  return field.unit ? `${s} ${field.unit}` : s
}

/** The label of an option value, or the value itself. */
export function optionLabel(field: QueryField, value: string): string {
  return field.options?.find((o) => o.value === value)?.label ?? value
}

/** One value as text, by field type. */
export function formatValue(field: QueryField, v: unknown, fmt: QueryFormat = {}): string {
  if (v === null || v === undefined || v === "") return ""
  if (field.type === "boolean") return v ? "Yes" : "No"
  if (field.type === "number" && typeof v === "number") return (fmt.number ?? formatNumber)(v, field)
  if (field.type === "date" && typeof v === "string") return (fmt.date ?? formatDay)(v)
  if (typeof v === "string") return field.options ? optionLabel(field, v) : v
  return String(v)
}

/** A rule's parts for a chip: "State" "is" "Open". `value` is empty for an operator without one. */
export function describeRule(
  rule: QueryRule,
  field: QueryField | undefined,
  fmt: QueryFormat = {},
): { field: string; op: string; value: string } {
  if (!field) return { field: rule.field, op: OP[rule.op]?.short ?? rule.op, value: "" }
  const info = OP[rule.op]
  const v = rule.value
  let value = ""
  if (info.value === "many" && Array.isArray(v)) value = v.map((x) => formatValue(field, x, fmt)).join(", ")
  else if (info.value === "pair" && Array.isArray(v))
    value = `${formatValue(field, v[0], fmt)} and ${formatValue(field, v[1], fmt)}`
  else if (info.value === "days" && typeof v === "number") value = v === 1 ? "1 day" : `${v} days`
  else if (info.value === "one") value = formatValue(field, v, fmt)
  // A boolean rule reads "Archived is Yes"; a number rule "Estimate > 3".
  return { field: field.label, op: info.short, value }
}

/** The whole rule in one line, for an accessible name or a tooltip. */
export function ruleText(rule: QueryRule, field: QueryField | undefined, fmt?: QueryFormat): string {
  const d = describeRule(rule, field, fmt)
  return [d.field, d.op, d.value].filter(Boolean).join(" ")
}

// ── dates ────────────────────────────────────────────────────────────────────────────────────────────

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/

/** Today as `YYYY-MM-DD`, in local time (or UTC). */
export function dayOf(d: Date, utc = false): string {
  const y = utc ? d.getUTCFullYear() : d.getFullYear()
  const m = (utc ? d.getUTCMonth() : d.getMonth()) + 1
  const day = utc ? d.getUTCDate() : d.getDate()
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/** A day moved by `n` days. */
export function addDays(day: string, n: number): string {
  const m = DAY.exec(day)
  if (!m) return day
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) + n * 86_400_000
  return dayOf(new Date(t), true)
}

/** The instant a day starts, as RFC 3339: in UTC, or at local midnight with its offset. */
function dayStart(day: string, utc: boolean): string {
  const m = DAY.exec(day)!
  if (utc) return `${day}T00:00:00Z`
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const off = -d.getTimezoneOffset()
  const sign = off >= 0 ? "+" : "-"
  const a = Math.abs(off)
  return `${day}T00:00:00${sign}${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`
}

/** The day an RFC 3339 instant falls on, if it is the start of that day (else null). */
function dayAtStart(v: unknown, utc: boolean): string | null {
  if (typeof v !== "string") return null
  const t = Date.parse(v)
  if (Number.isNaN(t)) return null
  const d = new Date(t)
  const day = dayOf(d, utc)
  return dayStart(day, utc) === v || Date.parse(dayStart(day, utc)) === t ? day : null
}

// ── to the store's filter ────────────────────────────────────────────────────────────────────────────

export interface WhereOptions {
  /** "Now" for relative dates (`withinLast`). Default the current time. */
  now?: Date
  /** Day boundaries of date-time fields in UTC instead of local time. */
  utc?: boolean
}

export interface WhereResult {
  /** The filter for `find`, `count` and live queries. `{}` matches everything. */
  where: Where
  /**
   * What the store cannot evaluate (text `contains`), to apply to the rows it returns with `matchQuery`; null
   * when `where` says it all. In an AND query only those rules are left over; an OR query that has one is
   * left over whole (and `where` is `{}`).
   */
  residual: QueryGroup | null
}

export class QueryError extends Error {}

const STORE_OPS = (rule: QueryRule) => rule.op !== "contains" && rule.op !== "notContains"

function expressible(n: QueryNode): boolean {
  return isGroup(n) ? n.rules.every(expressible) : STORE_OPS(n)
}

/** Field conditions for one rule, as a list of `where` objects (AND). */
function ruleWhere(rule: QueryRule, field: QueryField, opts: WhereOptions): Where {
  const f = field.name
  const v = rule.value
  const utc = opts.utc ?? false
  const today = () => dayOf(opts.now ?? new Date(), utc)
  if (field.multiple) {
    const list = Array.isArray(v) ? (v as string[]) : [v as string]
    const has = (x: string) => ({ [f]: { contains: x } })
    switch (rule.op) {
      case "is":
        return has(v as string)
      case "isNot":
        return { not: has(v as string) }
      case "anyOf":
        return list.length === 1 ? has(list[0]!) : { or: list.map(has) }
      case "noneOf":
        return { not: list.length === 1 ? has(list[0]!) : { or: list.map(has) } }
      default:
        throw new QueryError(`${field.label}: ${OP[rule.op].label} does not apply to a list`)
    }
  }
  const emptyList = field.type === "text" ? [null, ""] : null
  switch (rule.op) {
    case "isEmpty":
      return { [f]: emptyList ? { in: emptyList } : { eq: null } }
    case "isNotEmpty":
      return { [f]: emptyList ? { nin: emptyList } : { ne: null } }
    case "anyOf":
      return { [f]: { in: v } }
    case "noneOf":
      return { [f]: { nin: v } }
    case "gt":
    case "gte":
    case "lt":
    case "lte":
      return { [f]: { [rule.op]: v } }
  }
  if (field.type === "date" && field.datetime) {
    const start = (d: string) => dayStart(d, utc)
    switch (rule.op) {
      case "is":
        return { [f]: { gte: start(v as string), lt: start(addDays(v as string, 1)) } }
      case "before":
        return { [f]: { lt: start(v as string) } }
      case "after":
        return { [f]: { gte: start(addDays(v as string, 1)) } }
      case "between": {
        const [a, b] = v as [string, string]
        return { [f]: { gte: start(a), lt: start(addDays(b, 1)) } }
      }
      case "withinLast":
        return { [f]: { gte: start(addDays(today(), -(v as number))), lt: start(addDays(today(), 1)) } }
    }
  }
  switch (rule.op) {
    case "is":
      return { [f]: v }
    case "isNot":
      return { [f]: { ne: v } }
    case "before":
      return { [f]: { lt: v } }
    case "after":
      return { [f]: { gt: v } }
    case "between": {
      const [a, b] = v as [number, number]
      return { [f]: { gte: a, lte: b } }
    }
    case "withinLast":
      return { [f]: { gte: addDays(today(), -(v as number)), lte: today() } }
  }
  throw new QueryError(`${field.label}: the store cannot filter by ${OP[rule.op].label}`)
}

/** AND of `where` objects, merged into one object while their keys do not collide. */
function andWhere(parts: Where[]): Where {
  if (parts.length === 0) return {}
  if (parts.length === 1) return parts[0]!
  const merged: Where = {}
  for (const p of parts) {
    for (const k of Object.keys(p)) if (k in merged || k === "and" || k === "or") return { and: parts }
    Object.assign(merged, p)
  }
  return merged
}

function nodeWhere(n: QueryNode, fields: Map<string, QueryField>, opts: WhereOptions): Where | null {
  if (!isGroup(n)) {
    const field = fields.get(n.field)
    if (!isComplete(n, field)) return null
    return ruleWhere(n, field!, opts)
  }
  const parts = n.rules.map((r) => nodeWhere(r, fields, opts)).filter((w): w is Where => w !== null)
  if (!parts.length) return null
  if (n.combinator === "or") return parts.length === 1 ? parts[0]! : { or: parts }
  return andWhere(parts)
}

const fieldMap = (fields: QueryField[]) => new Map(fields.map((f) => [f.name, f]))

/**
 * The store's `where` for a query. Rules without a value yet are left out. Relative dates (`withinLast`)
 * are resolved against `now`, so convert again when the day changes; date-time fields are compared from the
 * start of the chosen days (local midnight, or UTC with `utc`).
 */
export function toWhere(query: QueryGroup, fields: QueryField[], opts: WhereOptions = {}): WhereResult {
  const map = fieldMap(fields)
  const live = pruneIncomplete(query, map)
  if (expressible(live)) return { where: nodeWhere(live, map, opts) ?? {}, residual: null }
  if (live.combinator === "or") return { where: {}, residual: live }
  const inStore = live.rules.filter(expressible)
  const rest = live.rules.filter((r) => !expressible(r))
  return {
    where: nodeWhere({ combinator: "and", rules: inStore }, map, opts) ?? {},
    residual: { id: live.id, combinator: "and", rules: rest },
  }
}

/** The query without rules that have no value yet, and without groups that are then empty. */
export function pruneIncomplete(
  query: QueryGroup,
  fields: Map<string, QueryField> | QueryField[],
): QueryGroup {
  const map = fields instanceof Map ? fields : fieldMap(fields)
  const prune = (g: QueryGroup): QueryGroup => ({
    ...g,
    rules: g.rules
      .map((n) => (isGroup(n) ? prune(n) : n))
      .filter((n) => (isGroup(n) ? n.rules.length > 0 : isComplete(n, map.get(n.field)))),
  })
  return prune(query)
}

// ── from the store's filter ──────────────────────────────────────────────────────────────────────────

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v)

/** Reads a field condition into rules (several operators in one condition are several rules, AND). */
function conditionRules(field: QueryField, cond: unknown, opts: WhereOptions): QueryRule[] {
  const id = createQueryId
  const r = (op: QueryOperator, value?: QueryValue): QueryRule =>
    value === undefined ? { id: id(), field: field.name, op } : { id: id(), field: field.name, op, value }
  const utc = opts.utc ?? false
  if (!isObj(cond)) {
    if (cond === null) return [r("isEmpty")]
    if (Array.isArray(cond)) throw new QueryError(`${field.name}: a list needs the in operator`)
    return [r("is", cond as QueryValue)]
  }
  const ops = { ...cond }
  const out: QueryRule[] = []
  const take = (k: string) => {
    const v = ops[k]
    delete ops[k]
    return v
  }
  const isNullList = (v: unknown) =>
    Array.isArray(v) && v.length === 2 && v.includes(null) && v.includes("") && field.type === "text"
  if (field.type === "date" && field.datetime) {
    const ge = "gte" in ops ? dayAtStart(ops.gte, utc) : null
    const lt = "lt" in ops ? dayAtStart(ops.lt, utc) : null
    if (ge && lt) {
      take("gte")
      take("lt")
      const last = addDays(lt, -1)
      out.push(last === ge ? r("is", ge) : r("between", [ge, last]))
    } else if (lt) {
      take("lt")
      out.push(r("before", lt))
    } else if (ge) {
      take("gte")
      out.push(r("after", addDays(ge, -1)))
    }
  }
  if ("gte" in ops && "lte" in ops && (field.type === "number" || field.type === "date")) {
    out.push(r("between", [take("gte"), take("lte")] as QueryValue))
  }
  for (const [op, v] of Object.entries(ops)) {
    switch (op) {
      case "eq":
        out.push(v === null ? r("isEmpty") : r("is", v as QueryValue))
        break
      case "ne":
        out.push(v === null ? r("isNotEmpty") : r("isNot", v as QueryValue))
        break
      case "in":
        out.push(isNullList(v) ? r("isEmpty") : r("anyOf", v as string[]))
        break
      case "nin":
        out.push(isNullList(v) ? r("isNotEmpty") : r("noneOf", v as string[]))
        break
      case "gt":
      case "lt":
        if (field.type === "date") out.push(r(op === "gt" ? "after" : "before", v as string))
        else out.push(r(op, v as number))
        break
      case "gte":
      case "lte":
        if (field.type === "date")
          out.push(op === "gte" ? r("after", addDays(v as string, -1)) : r("before", addDays(v as string, 1)))
        else out.push(r(op, v as number))
        break
      case "contains": {
        const list = Array.isArray(v) ? (v as string[]) : [v as string]
        for (const x of list) out.push(r("is", x))
        break
      }
      default:
        throw new QueryError(`${field.name}: the builder cannot show the ${op} operator`)
    }
  }
  return out
}

/** `{ or: [{ f: { contains: a } }, { f: { contains: b } }] }`: any of these references, on a list field. */
function refsAnyOf(
  items: unknown[],
  fields: Map<string, QueryField>,
): { field: string; values: string[] } | null {
  let name: string | null = null
  const values: string[] = []
  for (const item of items) {
    if (!isObj(item)) return null
    const keys = Object.keys(item)
    if (keys.length !== 1) return null
    const k = keys[0]!
    const c = item[k]
    if (
      !fields.get(k)?.multiple ||
      !isObj(c) ||
      Object.keys(c).length !== 1 ||
      typeof c.contains !== "string"
    )
      return null
    if (name !== null && name !== k) return null
    name = k
    values.push(c.contains)
  }
  return name ? { field: name, values } : null
}

function readWhere(
  where: Record<string, unknown>,
  fields: Map<string, QueryField>,
  opts: WhereOptions,
  depth: number,
): QueryNode[] {
  const out: QueryNode[] = []
  for (const [key, val] of Object.entries(where)) {
    if (key === "and" || key === "or") {
      if (!Array.isArray(val)) throw new QueryError(`${key} takes a list`)
      if (key === "or") {
        const any = refsAnyOf(val, fields)
        if (any) {
          out.push({ id: createQueryId(), field: any.field, op: "anyOf", value: any.values })
          continue
        }
      }
      const children = val.map((item) => {
        if (!isObj(item)) throw new QueryError(`${key} takes a list of objects`)
        return readWhere(item, fields, opts, depth + 1)
      })
      if (key === "and") {
        // AND inside AND flattens; a member with several conditions stays a list of rules.
        for (const c of children) out.push(...c)
      } else {
        const rules: QueryNode[] = children.map((c) => (c.length === 1 ? c[0]! : group("and", c, depth + 1)))
        out.push(group("or", rules, depth))
      }
    } else if (key === "not") {
      if (!isObj(val)) throw new QueryError("not takes an object")
      const keys = Object.keys(val)
      const k = keys[0]
      const inner = k !== undefined ? val[k] : undefined
      if (
        keys.length === 1 &&
        k !== "or" &&
        fields.get(k!)?.multiple &&
        isObj(inner) &&
        "contains" in inner
      ) {
        out.push({ id: createQueryId(), field: k!, op: "isNot", value: inner.contains as string })
      } else if (keys.length === 1 && k === "or" && Array.isArray(inner) && refsAnyOf(inner, fields)) {
        const any = refsAnyOf(inner, fields)!
        out.push({ id: createQueryId(), field: any.field, op: "noneOf", value: any.values })
      } else throw new QueryError("The builder shows not only around a list field's references")
    } else {
      const field = fields.get(key)
      if (!field) throw new QueryError(`Unknown field ${key}`)
      out.push(...conditionRules(field, val, opts))
    }
  }
  return out
}

function group(combinator: "and" | "or", rules: QueryNode[], depth: number): QueryGroup {
  // The top level and one level under it: deeper groups have no place in the builder.
  if (depth > 1 && rules.some(isGroup)) throw new QueryError("The builder nests groups one level deep")
  return { id: createQueryId(), combinator, rules }
}

/**
 * Reads a store `where` back into a query, for a filter that was saved as `where` or written by hand. Throws
 * `QueryError` for what the builder cannot show (an unknown field, `not` around anything but a list field's
 * references, groups nested deeper than one level). Dates come back absolute: a `withinLast` rule converted
 * with `toWhere` reads back as `between` the days it stood for.
 */
export function fromWhere(
  where: Where | null | undefined,
  fields: QueryField[],
  opts: WhereOptions = {},
): QueryGroup {
  if (!where || !Object.keys(where).length) return emptyQuery()
  const map = fieldMap(fields)
  const keys = Object.keys(where)
  // A lone `or` (or `and`) at the top is the query's own combinator.
  if (keys.length === 1 && (keys[0] === "or" || keys[0] === "and")) {
    const nodes = readWhere(where, map, opts, 0)
    if (nodes.length === 1 && isGroup(nodes[0]!) && keys[0] === "or")
      return checkDepth({ ...(nodes[0] as QueryGroup) })
    return checkDepth({ id: createQueryId(), combinator: "and", rules: nodes })
  }
  return checkDepth({ id: createQueryId(), combinator: "and", rules: readWhere(where, map, opts, 0) })
}

function checkDepth(q: QueryGroup): QueryGroup {
  for (const n of q.rules)
    if (isGroup(n) && n.rules.some(isGroup)) throw new QueryError("The builder nests groups one level deep")
  return q
}

// ── matching rows in memory ──────────────────────────────────────────────────────────────────────────

const empty = (v: unknown) =>
  v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0)

function cmp(a: unknown, b: unknown): number | null {
  if (typeof a === "number" && typeof b === "number") return a < b ? -1 : a > b ? 1 : 0
  if (typeof a === "string" && typeof b === "string") return a < b ? -1 : a > b ? 1 : 0
  return null
}

function ruleMatches(
  rule: QueryRule,
  field: QueryField,
  row: Record<string, unknown>,
  opts: WhereOptions,
): boolean {
  let v = row[field.name]
  const want = rule.value
  const utc = opts.utc ?? false
  if (field.type === "date" && field.datetime && typeof v === "string") {
    const t = Date.parse(v)
    v = Number.isNaN(t) ? null : dayOf(new Date(t), utc)
  }
  if (field.multiple) {
    const list = Array.isArray(v) ? (v as unknown[]) : []
    const has = (x: unknown) => list.includes(x)
    switch (rule.op) {
      case "is":
        return has(want)
      case "isNot":
        return !has(want)
      case "anyOf":
        return (want as string[]).some(has)
      case "noneOf":
        return !(want as string[]).some(has)
      default:
        return false
    }
  }
  const today = () => dayOf(opts.now ?? new Date(), utc)
  switch (rule.op) {
    case "isEmpty":
      return empty(v)
    case "isNotEmpty":
      return !empty(v)
    case "is":
      return !empty(v) && v === want
    case "isNot":
      return empty(v) || v !== want
    case "contains":
      return typeof v === "string" && v.toLowerCase().includes(String(want).toLowerCase())
    case "notContains":
      return !(typeof v === "string" && v.toLowerCase().includes(String(want).toLowerCase()))
    case "anyOf":
      return !empty(v) && (want as unknown[]).includes(v)
    case "noneOf":
      return empty(v) || !(want as unknown[]).includes(v)
    case "gt":
    case "after":
    case "gte":
    case "lt":
    case "before":
    case "lte": {
      const o = cmp(v, want)
      if (o === null) return false
      if (rule.op === "gt" || rule.op === "after") return o > 0
      if (rule.op === "gte") return o >= 0
      if (rule.op === "lte") return o <= 0
      return o < 0
    }
    case "between": {
      const [a, b] = want as [unknown, unknown]
      const lo = cmp(v, a)
      const hi = cmp(v, b)
      return lo !== null && hi !== null && lo >= 0 && hi <= 0
    }
    case "withinLast": {
      const lo = addDays(today(), -(want as number))
      return typeof v === "string" && v >= lo && v <= today()
    }
  }
}

function nodeMatches(
  n: QueryNode,
  fields: Map<string, QueryField>,
  row: Record<string, unknown>,
  opts: WhereOptions,
): boolean {
  if (isGroup(n)) {
    const live = n.rules.filter((r) => isGroup(r) || isComplete(r, fields.get(r.field)))
    if (!live.length) return true
    return n.combinator === "and"
      ? live.every((r) => nodeMatches(r, fields, row, opts))
      : live.some((r) => nodeMatches(r, fields, row, opts))
  }
  const field = fields.get(n.field)
  if (!field || !isComplete(n, field)) return true
  return ruleMatches(n, field, row, opts)
}

/**
 * Whether a row matches the query, with the store's meaning for every operator it shares (`isNot` counts an
 * empty value as different, comparisons never match an empty value) and case-insensitive `contains` on text.
 * Rules without a value yet match everything. For the rows of a list kept in memory, and for the `residual`
 * of `toWhere`.
 */
export function matchQuery(
  query: QueryGroup,
  fields: QueryField[],
  row: Record<string, unknown>,
  opts: WhereOptions = {},
): boolean {
  return nodeMatches(query, fieldMap(fields), row, opts)
}

// ── the text form (the Projects query bar's syntax) ──────────────────────────────────────────────────

/** Splits a query into tokens, keeping quoted parts together: `a "b c" d:"e f"`. */
export function tokenizeQuery(q: string): string[] {
  const out: string[] = []
  let cur = ""
  let quote = false
  for (const ch of q) {
    if (ch === '"') {
      quote = !quote
      cur += ch
    } else if (/\s/.test(ch) && !quote) {
      if (cur) out.push(cur)
      cur = ""
    } else cur += ch
  }
  if (cur) out.push(cur)
  return out
}

function splitValues(v: string): string[] {
  const out: string[] = []
  let cur = ""
  let quote = false
  for (const ch of v) {
    if (ch === '"') quote = !quote
    else if (ch === "," && !quote) {
      out.push(cur)
      cur = ""
    } else cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim()).filter(Boolean)
}

const unquote = (s: string) => s.replace(/^"|"$/g, "")
const quoteIfNeeded = (s: string) =>
  /[\s,"<>:]|^-|\.\./.test(s) || s === "" ? `"${s.replace(/"/g, "")}"` : s
const keyOf = (f: QueryField) => f.key ?? f.name.toLowerCase()

export interface TextQueryOptions {
  /** The text field that free words search (`contains`). Default the first text field. */
  textField?: string
}

export interface TextQueryResult {
  query: QueryGroup
  /** Tokens that named a field but a value it does not have, shown to the person, not silently dropped. */
  unknown: string[]
}

function optionId(field: QueryField, name: string): string | null {
  const n = name.toLowerCase()
  const o =
    field.options?.find((x) => x.value.toLowerCase() === n) ??
    field.options?.find((x) => x.label.toLowerCase() === n) ??
    field.options?.find((x) => x.label.toLowerCase().split(/\s+/)[0] === n)
  if (o) return o.value
  return field.options ? null : name
}

/**
 * Reads the text form: `field:value`, `field:a,b` (any of), `-field:value` (is not, none of), `field:>3`,
 * `>=`, `<`, `<=`, `field:1..5` (between), `field:-7d` (within the last 7 days), `field:none` / `field:any`
 * (empty, not empty), `field:yes|no`, and free words, which the text field must contain. The same syntax as the
 * query bar's text form, over any schema. The result is one AND group: the text form has no OR.
 */
export function parseQueryText(
  text: string,
  fields: QueryField[],
  opts: TextQueryOptions = {},
): TextQueryResult {
  const byKey = new Map<string, QueryField>()
  for (const f of fields) {
    byKey.set(keyOf(f), f)
    byKey.set(f.label.toLowerCase().replace(/\s+/g, ""), f)
    for (const a of f.aliases ?? []) byKey.set(a.toLowerCase(), f)
  }
  const textField = fields.find((f) => f.name === opts.textField) ?? fields.find((f) => f.type === "text")
  const rules: QueryRule[] = []
  const unknown: string[] = []
  const words: string[] = []
  const add = (rule: Omit<QueryRule, "id">) => {
    // `state:open state:started` reads as any of the two, as in the Projects bar.
    const same = rules.find(
      (r) =>
        r.field === rule.field &&
        (r.op === "is" || r.op === "anyOf") &&
        (rule.op === "is" || rule.op === "anyOf"),
    )
    const f = fields.find((x) => x.name === rule.field)
    if (same && f && f.type !== "text" && f.type !== "number" && f.type !== "date" && f.type !== "boolean") {
      const a = same.op === "is" ? [same.value as string] : (same.value as string[])
      const b = rule.op === "is" ? [rule.value as string] : (rule.value as string[])
      same.op = "anyOf"
      same.value = [...new Set([...a, ...b])]
      return
    }
    rules.push({ id: createQueryId(), ...rule })
  }
  for (const tok of tokenizeQuery(text)) {
    const m = /^(-?)([a-z][a-z0-9_]*):(.*)$/i.exec(tok)
    const field = m ? byKey.get(m[2]!.toLowerCase()) : undefined
    if (!m || !field || !m[3]) {
      words.push(unquote(tok))
      continue
    }
    const neg = m[1] === "-"
    const raw = m[3]!
    const name = field.name
    const plain = unquote(raw).toLowerCase()
    if (plain === "none" || plain === "any") {
      const isNone = (plain === "none") !== neg
      if (!field.multiple) add({ field: name, op: isNone ? "isEmpty" : "isNotEmpty" })
      else unknown.push(tok)
      continue
    }
    switch (field.type) {
      case "text": {
        const exact = raw.startsWith("=")
        const v = unquote(exact ? raw.slice(1) : raw)
        add({ field: name, op: exact ? (neg ? "isNot" : "is") : neg ? "notContains" : "contains", value: v })
        break
      }
      case "boolean": {
        const yes = ["yes", "true", "1", "on"].includes(plain)
        const no = ["no", "false", "0", "off"].includes(plain)
        if (!yes && !no) unknown.push(tok)
        else add({ field: name, op: "is", value: yes !== neg })
        break
      }
      case "number":
      case "date": {
        const isNum = field.type === "number"
        const read = (s: string): number | string | null => {
          const u = unquote(s)
          if (isNum) {
            const n = Number(u)
            return u !== "" && Number.isFinite(n) ? n : null
          }
          return DAY.test(u) ? u : null
        }
        const rel = /^-(\d+)d$/.exec(raw)
        const range = /^(.+)\.\.(.+)$/.exec(raw)
        const cmpOp = /^(>=|<=|>|<)(.+)$/.exec(raw)
        if (!isNum && rel && !neg) add({ field: name, op: "withinLast", value: Number(rel[1]) })
        else if (range && !neg) {
          const a = read(range[1]!)
          const b = read(range[2]!)
          if (a === null || b === null) unknown.push(tok)
          else add({ field: name, op: "between", value: [a, b] as QueryValue })
        } else if (cmpOp && !neg) {
          const v = read(cmpOp[2]!)
          const sym = cmpOp[1]!
          if (v === null || (!isNum && sym.length === 2)) unknown.push(tok)
          else if (isNum)
            add({
              field: name,
              op: ({ ">": "gt", ">=": "gte", "<": "lt", "<=": "lte" } as const)[sym]!,
              value: v,
            })
          else add({ field: name, op: sym === ">" ? "after" : "before", value: v })
        } else {
          const v = read(raw)
          if (v === null || (!isNum && neg)) unknown.push(tok)
          else add({ field: name, op: neg ? "isNot" : "is", value: v })
        }
        break
      }
      default: {
        const ids: string[] = []
        for (const n of splitValues(raw)) {
          const id = optionId(field, n)
          if (id === null) unknown.push(`${keyOf(field)}:${n}`)
          else if (!ids.includes(id)) ids.push(id)
        }
        if (!ids.length) break
        if (ids.length === 1) add({ field: name, op: neg ? "isNot" : "is", value: ids[0]! })
        else add({ field: name, op: neg ? "noneOf" : "anyOf", value: ids })
      }
    }
  }
  const free = words.join(" ").trim()
  if (free && textField)
    rules.push({ id: createQueryId(), field: textField.name, op: "contains", value: free })
  else if (free) unknown.push(free)
  return { query: { id: createQueryId(), combinator: "and", rules }, unknown }
}

/**
 * Writes a query in the text form; `parseQueryText(printQueryText(q))` gives `q` back. Null when the query
 * has what the text form cannot say: OR, groups, or a rule on a field it does not know.
 */
export function printQueryText(
  query: QueryGroup,
  fields: QueryField[],
  opts: TextQueryOptions = {},
): string | null {
  const map = fieldMap(fields)
  const textField = fields.find((f) => f.name === opts.textField) ?? fields.find((f) => f.type === "text")
  const live = pruneIncomplete(query, map)
  if (live.rules.length > 1 && live.combinator === "or") return null
  const parts: string[] = []
  let free: string | null = null
  for (const n of live.rules) {
    if (isGroup(n)) return null
    const f = map.get(n.field)
    if (!f) return null
    const k = keyOf(f)
    const v = n.value
    const name = (x: unknown) => quoteIfNeeded(f.options ? optionLabel(f, String(x)) : String(x))
    switch (n.op) {
      case "isEmpty":
        parts.push(`${k}:none`)
        break
      case "isNotEmpty":
        parts.push(`${k}:any`)
        break
      case "contains":
        if (f === textField && free === null && !/[:"]/.test(String(v)) && !String(v).startsWith("-"))
          free = String(v)
        else parts.push(`${k}:${quoteIfNeeded(String(v))}`)
        break
      case "notContains":
        parts.push(`-${k}:${quoteIfNeeded(String(v))}`)
        break
      case "is":
      case "isNot": {
        const neg = n.op === "isNot" ? "-" : ""
        if (f.type === "boolean") parts.push(`${k}:${(v as boolean) !== (n.op === "isNot") ? "yes" : "no"}`)
        else if (f.type === "text") parts.push(`${neg}${k}:=${quoteIfNeeded(String(v))}`)
        else if (f.type === "date" && neg) return null
        else parts.push(`${neg}${k}:${name(v)}`)
        break
      }
      case "anyOf":
      case "noneOf":
        parts.push(`${n.op === "noneOf" ? "-" : ""}${k}:${(v as string[]).map(name).join(",")}`)
        break
      case "gt":
        parts.push(`${k}:>${v}`)
        break
      case "gte":
        parts.push(`${k}:>=${v}`)
        break
      case "lt":
        parts.push(`${k}:<${v}`)
        break
      case "lte":
        parts.push(`${k}:<=${v}`)
        break
      case "before":
        parts.push(`${k}:<${v}`)
        break
      case "after":
        parts.push(`${k}:>${v}`)
        break
      case "between": {
        const [a, b] = v as [unknown, unknown]
        parts.push(`${k}:${a}..${b}`)
        break
      }
      case "withinLast":
        parts.push(`${k}:-${v}d`)
        break
    }
  }
  if (free !== null) parts.push(free)
  return parts.join(" ")
}
