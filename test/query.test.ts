import { describe, expect, test } from "bun:test"
import {
  describeRule,
  fromWhere,
  isComplete,
  matchQuery,
  operatorsFor,
  parseQueryText,
  printQueryText,
  QueryError,
  type QueryField,
  type QueryGroup,
  type QueryNode,
  type QueryRule,
  toWhere,
  valueForOperator,
} from "../src/lib/query"
// A store's filter: every `where` the builder writes must parse there and pick the same rows as the builder's
// own matcher.
import { parseWhere } from "./support/where"

const FIELDS: QueryField[] = [
  { name: "title", label: "Title", type: "text" },
  {
    name: "state",
    label: "State",
    type: "enum",
    options: [
      { value: "open", label: "Open" },
      { value: "started", label: "In progress" },
      { value: "done", label: "Done" },
    ],
  },
  { name: "estimate", label: "Estimate", type: "number", unit: "pt" },
  { name: "due", label: "Due date", type: "date", key: "due" },
  { name: "updatedAt", label: "Updated", type: "date", datetime: true, key: "updated" },
  { name: "archived", label: "Archived", type: "boolean" },
  {
    name: "assignee",
    label: "Assignee",
    type: "person",
    options: [
      { value: "user://ana", label: "Ana Lima" },
      { value: "user://bo", label: "Bo Chen" },
    ],
  },
  {
    name: "labels",
    label: "Labels",
    type: "relation",
    multiple: true,
    options: [
      { value: "label://bug", label: "Bug" },
      { value: "label://ui", label: "UI" },
    ],
  },
]

// The fields as the store sees them (`updatedAt` is a system field).
const STORE_FIELDS = ["title", "state", "estimate", "due", "updatedAt", "archived", "assignee", "labels"]

const ROWS: Array<Record<string, unknown>> = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    title: "Fix login",
    state: "open",
    estimate: 3,
    due: "2026-11-10",
    updatedAt: "2026-11-15T09:00:00+00:00",
    archived: false,
    assignee: "user://ana",
    labels: ["label://bug"],
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    title: "Sign-in page polish",
    state: "started",
    estimate: 5,
    due: "2026-11-20",
    updatedAt: "2026-11-01T12:00:00+00:00",
    archived: false,
    assignee: "user://bo",
    labels: ["label://ui", "label://bug"],
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    title: "Billing export",
    state: "done",
    estimate: 8,
    due: null,
    updatedAt: "2026-10-01T00:00:00+00:00",
    archived: true,
    assignee: null,
    labels: [],
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    title: "",
    state: "open",
    estimate: null,
    due: "2026-11-16",
    updatedAt: "2026-11-16T00:00:00+00:00",
    archived: false,
    assignee: "user://ana",
    labels: ["label://ui"],
  },
]

const NOW = new Date("2026-11-16T10:00:00Z")
const OPTS = { now: NOW, utc: true }

const r = (field: string, op: QueryRule["op"], value?: QueryRule["value"]): QueryRule =>
  value === undefined ? { field, op } : { field, op, value }
const and = (...rules: QueryNode[]): QueryGroup => ({ combinator: "and", rules })
const or = (...rules: QueryNode[]): QueryGroup => ({ combinator: "or", rules })

/** Ids are for the builder's rows, not the filter: compare without them. */
function strip(n: QueryNode): QueryNode {
  if ("combinator" in n) return { combinator: n.combinator, rules: n.rules.map(strip) }
  const { id: _, ...rest } = n
  return rest
}

const ids = (rows: Array<Record<string, unknown>>) => rows.map((x) => Number(String(x.id).slice(-1)))

/** Rows the store would return for the query, then the residual applied in memory. */
function viaStore(q: QueryGroup): number[] {
  const { where, residual } = toWhere(q, FIELDS, OPTS)
  const f = parseWhere(STORE_FIELDS, where)
  return ids(ROWS.filter((row) => f.matches(row) && (!residual || matchQuery(residual, FIELDS, row, OPTS))))
}
const inMemory = (q: QueryGroup) => ids(ROWS.filter((row) => matchQuery(q, FIELDS, row, OPTS)))

// The cases every conversion is checked on: one per operator and field type, and groups.
const CASES: Array<[string, QueryGroup, number[]]> = [
  ["enum is", and(r("state", "is", "open")), [1, 4]],
  ["enum is not", and(r("state", "isNot", "open")), [2, 3]],
  ["enum any of", and(r("state", "anyOf", ["open", "done"])), [1, 3, 4]],
  ["enum none of", and(r("state", "noneOf", ["open", "done"])), [2]],
  ["number >", and(r("estimate", "gt", 3)), [2, 3]],
  ["number ≥", and(r("estimate", "gte", 5)), [2, 3]],
  ["number <", and(r("estimate", "lt", 5)), [1]],
  ["number ≤", and(r("estimate", "lte", 5)), [1, 2]],
  ["number is", and(r("estimate", "is", 5)), [2]],
  ["number is not", and(r("estimate", "isNot", 5)), [1, 3, 4]],
  ["number between", and(r("estimate", "between", [3, 5])), [1, 2]],
  ["number is empty", and(r("estimate", "isEmpty")), [4]],
  ["number is not empty", and(r("estimate", "isNotEmpty")), [1, 2, 3]],
  ["date is", and(r("due", "is", "2026-11-16")), [4]],
  ["date before", and(r("due", "before", "2026-11-16")), [1]],
  ["date after", and(r("due", "after", "2026-11-10")), [2, 4]],
  ["date between", and(r("due", "between", ["2026-11-10", "2026-11-16"])), [1, 4]],
  ["date within the last", and(r("due", "withinLast", 7)), [1, 4]],
  ["date is empty", and(r("due", "isEmpty")), [3]],
  ["boolean is", and(r("archived", "is", true)), [3]],
  ["boolean is no", and(r("archived", "is", false)), [1, 2, 4]],
  ["person is", and(r("assignee", "is", "user://ana")), [1, 4]],
  ["person is not", and(r("assignee", "isNot", "user://ana")), [2, 3]],
  ["person any of", and(r("assignee", "anyOf", ["user://ana", "user://bo"])), [1, 2, 4]],
  ["person is empty", and(r("assignee", "isEmpty")), [3]],
  ["text is", and(r("title", "is", "Fix login")), [1]],
  ["text is empty", and(r("title", "isEmpty")), [4]],
  ["text is not empty", and(r("title", "isNotEmpty")), [1, 2, 3]],
  ["refs is (includes)", and(r("labels", "is", "label://bug")), [1, 2]],
  ["refs is not", and(r("labels", "isNot", "label://bug")), [3, 4]],
  ["refs any of", and(r("labels", "anyOf", ["label://bug", "label://ui"])), [1, 2, 4]],
  ["refs none of", and(r("labels", "noneOf", ["label://bug", "label://ui"])), [3]],
  ["two rules, AND", and(r("state", "is", "open"), r("estimate", "isNotEmpty")), [1]],
  ["two rules on one field", and(r("estimate", "gt", 2), r("estimate", "lt", 8)), [1, 2]],
  ["OR", or(r("state", "is", "done"), r("estimate", "lt", 4)), [1, 3]],
  [
    "AND with a nested OR",
    and(r("archived", "is", false), or(r("state", "is", "started"), r("due", "is", "2026-11-16"))),
    [2, 4],
  ],
  [
    "OR of AND groups",
    or(
      and(r("state", "is", "open"), r("estimate", "is", 3)),
      and(r("state", "is", "done"), r("archived", "is", true)),
    ),
    [1, 3],
  ],
  ["empty query", and(), [1, 2, 3, 4]],
]

describe("toWhere: the store agrees with the builder", () => {
  test.each(CASES)("%s", (_, q, want) => {
    expect(inMemory(q)).toEqual(want)
    expect(viaStore(q)).toEqual(want)
  })
})

describe("toWhere: shape", () => {
  test("AND merges conditions into one object while keys do not collide", () => {
    expect(toWhere(and(r("state", "is", "open"), r("estimate", "gt", 3)), FIELDS).where).toEqual({
      state: "open",
      estimate: { gt: 3 },
    })
    expect(toWhere(and(r("estimate", "gt", 1), r("estimate", "lt", 8)), FIELDS).where).toEqual({
      and: [{ estimate: { gt: 1 } }, { estimate: { lt: 8 } }],
    })
  })
  test("operators map to the store's", () => {
    const w = (rule: QueryRule) => toWhere(and(rule), FIELDS, OPTS).where
    expect(w(r("estimate", "between", [1, 5]))).toEqual({ estimate: { gte: 1, lte: 5 } })
    expect(w(r("state", "anyOf", ["open"]))).toEqual({ state: { in: ["open"] } })
    expect(w(r("assignee", "isEmpty"))).toEqual({ assignee: { eq: null } })
    expect(w(r("title", "isEmpty"))).toEqual({ title: { in: [null, ""] } })
    expect(w(r("due", "before", "2026-11-01"))).toEqual({ due: { lt: "2026-11-01" } })
    expect(w(r("due", "withinLast", 7))).toEqual({ due: { gte: "2026-11-09", lte: "2026-11-16" } })
    expect(w(r("labels", "noneOf", ["label://a", "label://b"]))).toEqual({
      not: { or: [{ labels: { contains: "label://a" } }, { labels: { contains: "label://b" } }] },
    })
  })
  test("date-time fields compare from the start of the chosen days", () => {
    const w = (rule: QueryRule) => toWhere(and(rule), FIELDS, OPTS).where
    expect(w(r("updatedAt", "is", "2026-11-15"))).toEqual({
      updatedAt: { gte: "2026-11-15T00:00:00Z", lt: "2026-11-16T00:00:00Z" },
    })
    expect(w(r("updatedAt", "after", "2026-11-15"))).toEqual({ updatedAt: { gte: "2026-11-16T00:00:00Z" } })
    expect(w(r("updatedAt", "between", ["2026-11-01", "2026-11-15"]))).toEqual({
      updatedAt: { gte: "2026-11-01T00:00:00Z", lt: "2026-11-16T00:00:00Z" },
    })
    // A where on a system date-time field parses in the store.
    const f = parseWhere(STORE_FIELDS, w(r("updatedAt", "withinLast", 7)))
    expect(ids(ROWS.filter((row) => f.matches(row)))).toEqual([1, 4])
    expect(inMemory(and(r("updatedAt", "withinLast", 7)))).toEqual([1, 4])
  })
  test("rules without a value yet are left out", () => {
    expect(toWhere(and(r("state", "is"), r("estimate", "gt", 3)), FIELDS).where).toEqual({
      estimate: { gt: 3 },
    })
    expect(toWhere(and(r("state", "anyOf", [])), FIELDS).where).toEqual({})
    expect(toWhere(and(or(r("state", "is"))), FIELDS).where).toEqual({})
    expect(inMemory(and(r("state", "is")))).toEqual([1, 2, 3, 4])
  })
  test("text contains is left for memory: only those rules in AND, the whole query in OR", () => {
    const a = toWhere(and(r("state", "is", "open"), r("title", "contains", "LOGIN")), FIELDS)
    expect(a.where).toEqual({ state: "open" })
    expect(a.residual && strip(a.residual)).toEqual(and(r("title", "contains", "LOGIN")))
    expect(viaStore(and(r("state", "is", "open"), r("title", "contains", "LOGIN")))).toEqual([1])
    const o = toWhere(or(r("state", "is", "done"), r("title", "contains", "sign")), FIELDS)
    expect(o.where).toEqual({})
    expect(o.residual && strip(o.residual)).toEqual(
      or(r("state", "is", "done"), r("title", "contains", "sign")),
    )
    expect(viaStore(or(r("state", "is", "done"), r("title", "contains", "sign")))).toEqual([2, 3])
    expect(viaStore(and(r("title", "notContains", "i")))).toEqual([4])
  })
})

describe("fromWhere: round trips", () => {
  // `withinLast` reads back as the days it stood for; everything else comes back as it was.
  const roundTrip = CASES.filter(([name]) => !name.includes("within"))
  test.each(roundTrip)("%s", (_, q) => {
    const back = fromWhere(toWhere(q, FIELDS, OPTS).where, FIELDS, OPTS)
    expect(strip(back)).toEqual(strip(q))
  })
  test("date-time days come back", () => {
    for (const rule of [
      r("updatedAt", "is", "2026-11-15"),
      r("updatedAt", "before", "2026-11-15"),
      r("updatedAt", "after", "2026-11-15"),
      r("updatedAt", "between", ["2026-11-01", "2026-11-15"]),
    ]) {
      const back = fromWhere(toWhere(and(rule), FIELDS, OPTS).where, FIELDS, OPTS)
      expect(strip(back)).toEqual(and(rule))
    }
  })
  test("within the last N days reads back as between", () => {
    const back = fromWhere(toWhere(and(r("due", "withinLast", 7)), FIELDS, OPTS).where, FIELDS, OPTS)
    expect(strip(back)).toEqual(and(r("due", "between", ["2026-11-09", "2026-11-16"])))
  })
  test("a group of one rule comes back as the rule", () => {
    const q = or(and(r("state", "is", "done")), r("estimate", "is", 3))
    expect(strip(fromWhere(toWhere(q, FIELDS).where, FIELDS))).toEqual(
      or(r("state", "is", "done"), r("estimate", "is", 3)),
    )
  })
  test("hand-written filters", () => {
    expect(strip(fromWhere({ state: "open", estimate: { gte: 1, lt: 8 } }, FIELDS))).toEqual(
      and(r("state", "is", "open"), r("estimate", "gte", 1), r("estimate", "lt", 8)),
    )
    expect(strip(fromWhere({ due: { gte: "2026-11-02" } }, FIELDS))).toEqual(
      and(r("due", "after", "2026-11-01")),
    )
    expect(strip(fromWhere({ assignee: null }, FIELDS))).toEqual(and(r("assignee", "isEmpty")))
    expect(strip(fromWhere({ labels: { contains: ["label://a", "label://b"] } }, FIELDS))).toEqual(
      and(r("labels", "is", "label://a"), r("labels", "is", "label://b")),
    )
    expect(strip(fromWhere({}, FIELDS))).toEqual(and())
    expect(strip(fromWhere(null, FIELDS))).toEqual(and())
  })
  test("what the builder cannot show is an error", () => {
    expect(() => fromWhere({ nope: 1 }, FIELDS)).toThrow(QueryError)
    expect(() => fromWhere({ not: { state: "open" } }, FIELDS)).toThrow(QueryError)
    expect(() => fromWhere({ state: { like: "x" } }, FIELDS)).toThrow(QueryError)
    expect(() =>
      fromWhere({ or: [{ and: [{ or: [{ state: "open" }, { state: "done" }] }, { estimate: 1 }] }] }, FIELDS),
    ).toThrow(QueryError)
  })
})

describe("operators and values", () => {
  test("each type offers its operators", () => {
    const ops = (name: string) => operatorsFor(FIELDS.find((f) => f.name === name)!).map((o) => o.op)
    expect(ops("title")).toEqual(["contains", "notContains", "is", "isNot", "isEmpty", "isNotEmpty"])
    expect(ops("estimate")).toContain("between")
    expect(ops("due")).toContain("withinLast")
    expect(ops("archived")).toEqual(["is"])
    expect(ops("labels")).not.toContain("isEmpty")
  })
  test("a value is kept when the operator changes and it still fits", () => {
    const estimate = FIELDS[2]!
    const state = FIELDS[1]!
    expect(valueForOperator(estimate, "between", 3)).toEqual([3, 3])
    expect(valueForOperator(estimate, "gt", [1, 5])).toBe(1)
    expect(valueForOperator(state, "anyOf", "open")).toEqual(["open"])
    expect(valueForOperator(state, "is", ["open", "done"])).toBe("open")
    expect(valueForOperator(state, "isEmpty", "open")).toBeUndefined()
    expect(valueForOperator(FIELDS[3]!, "withinLast", "2026-01-01")).toBe(7)
  })
  test("completeness", () => {
    expect(isComplete(r("estimate", "is", Number.NaN), FIELDS[2])).toBe(false)
    expect(isComplete(r("due", "is", "soon"), FIELDS[3])).toBe(false)
    expect(isComplete(r("due", "between", ["2026-01-01", null as unknown as string]), FIELDS[3])).toBe(false)
    expect(isComplete(r("archived", "is", false), FIELDS[5])).toBe(true)
    expect(isComplete(r("state", "gt", "open"), FIELDS[1])).toBe(false)
  })
  test("describeRule gives a chip's parts", () => {
    const d = (rule: QueryRule) =>
      describeRule(
        rule,
        FIELDS.find((f) => f.name === rule.field),
      )
    expect(d(r("state", "is", "started"))).toEqual({ field: "State", op: "is", value: "In progress" })
    expect(d(r("estimate", "gt", 3))).toEqual({ field: "Estimate", op: ">", value: "3 pt" })
    expect(d(r("estimate", "between", [1, 5])).value).toBe("1 pt and 5 pt")
    expect(d(r("due", "withinLast", 14)).value).toBe("14 days")
    expect(d(r("archived", "is", true)).value).toBe("Yes")
    expect(d(r("assignee", "isEmpty"))).toEqual({ field: "Assignee", op: "is empty", value: "" })
  })
})

describe("the text form", () => {
  const parse = (s: string) => {
    const res = parseQueryText(s, FIELDS)
    return { query: strip(res.query), unknown: res.unknown }
  }
  test("fields, negation, lists, comparisons and free text", () => {
    expect(parse("state:open -assignee:ana estimate:>3 due:<2026-12-01 fix login").query).toEqual(
      and(
        r("state", "is", "open"),
        r("assignee", "isNot", "user://ana"),
        r("estimate", "gt", 3),
        r("due", "before", "2026-12-01"),
        r("title", "contains", "fix login"),
      ),
    )
    expect(parse('state:open,"in progress"').query).toEqual(and(r("state", "anyOf", ["open", "started"])))
    expect(parse("-state:open,done").query).toEqual(and(r("state", "noneOf", ["open", "done"])))
    expect(parse("state:open state:done").query).toEqual(and(r("state", "anyOf", ["open", "done"])))
    expect(parse("estimate:1..5 updated:-7d").query).toEqual(
      and(r("estimate", "between", [1, 5]), r("updatedAt", "withinLast", 7)),
    )
    expect(parse("assignee:none -due:none archived:yes").query).toEqual(
      and(r("assignee", "isEmpty"), r("due", "isNotEmpty"), r("archived", "is", true)),
    )
    expect(parse("labels:bug,ui").query).toEqual(and(r("labels", "anyOf", ["label://bug", "label://ui"])))
    expect(parse('title:="Fix login"').query).toEqual(and(r("title", "is", "Fix login")))
  })
  test("labels of fields and options are matched case-insensitively", () => {
    expect(parse("STATE:Done duedate:2026-11-16").query).toEqual(
      and(r("state", "is", "done"), r("due", "is", "2026-11-16")),
    )
  })
  test("unknown values are reported, not dropped silently", () => {
    expect(parse("state:nope estimate:>x").unknown).toEqual(["state:nope", "estimate:>x"])
  })
  test("a word that is not a field is free text", () => {
    expect(parse("foo:bar").query).toEqual(and(r("title", "contains", "foo:bar")))
  })
  test("print and parse round-trip", () => {
    const queries = [
      and(r("state", "is", "open"), r("estimate", "gte", 2), r("title", "contains", "fix login")),
      and(r("state", "noneOf", ["open", "started"]), r("assignee", "isEmpty")),
      and(r("due", "between", ["2026-11-01", "2026-11-30"]), r("updatedAt", "withinLast", 7)),
      and(r("archived", "is", false), r("labels", "is", "label://bug")),
      and(r("title", "notContains", "draft"), r("title", "is", "Fix login")),
    ]
    for (const q of queries) {
      const text = printQueryText(q, FIELDS)
      expect(text).not.toBeNull()
      expect(strip(parseQueryText(text!, FIELDS).query)).toEqual(q)
    }
    expect(printQueryText(and(r("state", "anyOf", ["open", "started"])), FIELDS)).toBe(
      'state:Open,"In progress"',
    )
  })
  test("OR and groups have no text form", () => {
    expect(printQueryText(or(r("state", "is", "open"), r("estimate", "gt", 1)), FIELDS)).toBeNull()
    expect(printQueryText(and(or(r("state", "is", "open"))), FIELDS)).toBeNull()
  })
})
