// A reference evaluator for the structured filter that `toWhere` writes, standing in for a store in the tests:
// a field condition is a value (equality, `null` for empty) or an object of operators (`eq`, `ne`, `in`, `nin`,
// `gt`, `gte`, `lt`, `lte`, `contains`), combined with `and`, `or` and `not`. Unknown fields and operators are
// errors, as a store that validates its filters would report them.

export type Row = Record<string, unknown>

export interface WhereFilter {
  matches(row: Row): boolean
}

const OPS = new Set(["eq", "ne", "in", "nin", "gt", "gte", "lt", "lte", "contains"])

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v)

const empty = (v: unknown) => v === null || v === undefined

/** Date-times compare as instants (`+00:00` and `Z` are the same time); anything else by value. */
function compare(a: unknown, b: unknown): number {
  if (typeof a === "string" && typeof b === "string" && a.includes("T") && b.includes("T")) {
    const x = Date.parse(a)
    const y = Date.parse(b)
    if (!Number.isNaN(x) && !Number.isNaN(y)) return x - y
  }
  if (typeof a === "number" && typeof b === "number") return a - b
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0
}

const same = (a: unknown, b: unknown) =>
  (empty(a) && empty(b)) || (!empty(a) && !empty(b) && compare(a, b) === 0)

function condition(value: unknown, cond: unknown): boolean {
  if (!isObj(cond)) {
    if (Array.isArray(cond)) throw new Error("a list needs the in operator")
    return same(value, cond)
  }
  return Object.entries(cond).every(([op, arg]) => {
    switch (op) {
      case "eq":
        return same(value, arg)
      case "ne":
        return !same(value, arg)
      case "in":
        return (arg as unknown[]).some((x) => same(value, x))
      case "nin":
        return !(arg as unknown[]).some((x) => same(value, x))
      case "gt":
        return !empty(value) && compare(value, arg) > 0
      case "gte":
        return !empty(value) && compare(value, arg) >= 0
      case "lt":
        return !empty(value) && compare(value, arg) < 0
      case "lte":
        return !empty(value) && compare(value, arg) <= 0
      case "contains": {
        const list = Array.isArray(value) ? value : []
        const wanted = Array.isArray(arg) ? arg : [arg]
        return wanted.every((x) => list.includes(x))
      }
      default:
        throw new Error(`unknown operator ${op}`)
    }
  })
}

function check(where: unknown, fields: Set<string>): void {
  if (!isObj(where)) throw new Error("a filter is an object")
  for (const [k, v] of Object.entries(where)) {
    if (k === "and" || k === "or") {
      if (!Array.isArray(v)) throw new Error(`${k} takes a list`)
      for (const w of v) check(w, fields)
    } else if (k === "not") check(v, fields)
    else if (!fields.has(k)) throw new Error(`unknown field ${k}`)
    else if (isObj(v))
      for (const op of Object.keys(v)) if (!OPS.has(op)) throw new Error(`unknown operator ${op}`)
  }
}

function test(where: Record<string, unknown>, row: Row): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (k === "and") return (v as Record<string, unknown>[]).every((w) => test(w, row))
    if (k === "or") return (v as Record<string, unknown>[]).some((w) => test(w, row))
    if (k === "not") return !test(v as Record<string, unknown>, row)
    return condition(row[k], v)
  })
}

/** Validates `where` against the field names and returns its matcher. Throws on what a store would reject. */
export function parseWhere(fields: string[], where: unknown): WhereFilter {
  check(where, new Set(fields))
  const w = where as Record<string, unknown>
  return { matches: (row) => test(w, row) }
}
