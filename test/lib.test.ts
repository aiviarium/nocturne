import { describe, expect, test } from "bun:test"
import { countChanges, diffStrings, diffWords, myers, parsePatch, toSplitRows } from "../src/lib/diff"
import { highlight } from "../src/lib/highlight"
import { edgeEnabled, nextEnabled, typeahead } from "../src/lib/keyboard"
import { filterItems, findTrigger } from "../src/lib/triggers"

describe("keyboard helpers", () => {
  test("nextEnabled wraps and skips disabled", () => {
    const d = [false, true, false]
    expect(nextEnabled(d, 0, 1)).toBe(2)
    expect(nextEnabled(d, 2, 1)).toBe(0)
    expect(nextEnabled(d, 0, -1)).toBe(2)
    expect(nextEnabled([true, true], 0, 1)).toBe(-1)
  })
  test("edges", () => {
    expect(edgeEnabled([true, false, false, true], "first")).toBe(1)
    expect(edgeEnabled([true, false, false, true], "last")).toBe(2)
  })
  test("typeahead finds the next label by prefix", () => {
    const labels = ["Assign", "Archive", "Delete"]
    expect(typeahead(labels, [false, false, false], -1, "ar")).toBe(1)
    expect(typeahead(labels, [false, false, false], 0, "a")).toBe(1)
  })
})

describe("diff", () => {
  test("myers finds the shortest script", () => {
    const ops = myers(["a", "b", "c", "d"], ["a", "c", "d", "e"])
    expect(ops.map((o) => o.type)).toEqual(["equal", "del", "equal", "equal", "add"])
  })
  test("diffStrings builds hunks with context and numbers", () => {
    const before = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"].join("\n")
    const after = before.replace("five", "FIVE")
    const [hunk, ...more] = diffStrings(before, after, { context: 2 })
    expect(more).toHaveLength(0)
    expect(hunk?.header).toBe("@@ -3,5 +3,5 @@")
    const changed = hunk?.lines.filter((l) => l.kind !== "context")
    expect(changed?.map((l) => [l.kind, l.text])).toEqual([
      ["del", "five"],
      ["add", "FIVE"],
    ])
    expect(countChanges(hunk ? [hunk] : [])).toEqual({ added: 1, removed: 1 })
  })
  test("identical text has no hunks", () => {
    expect(diffStrings("a\nb\n", "a\nb\n")).toEqual([])
  })
  test("word diff marks only the changed words", () => {
    const { old, new: next } = diffWords("return store.tasks", "const visible = store.tasks")
    expect(old.filter((s) => s.changed).map((s) => s.text.trim())).toContain("return")
    expect(
      next
        .filter((s) => !s.changed)
        .map((s) => s.text)
        .join(""),
    ).toContain("store.tasks")
  })
  test("far-apart edits make separate hunks", () => {
    const lines = Array.from({ length: 30 }, (_, i) => `line ${i}`)
    const after = lines.slice()
    after[2] = "changed 2"
    after[25] = "changed 25"
    expect(diffStrings(lines.join("\n"), after.join("\n"), { context: 2 })).toHaveLength(2)
  })
  test("parsePatch reads paths, hunks and numbers", () => {
    const patch = [
      "diff --git a/src/a.ts b/src/a.ts",
      "--- a/src/a.ts",
      "+++ b/src/a.ts",
      "@@ -8,3 +8,4 @@ fn",
      " keep",
      "-old",
      "+new",
      "+extra",
      " tail",
    ].join("\n")
    const [file] = parsePatch(patch)
    expect(file?.newPath).toBe("src/a.ts")
    const lines = file?.hunks[0]?.lines ?? []
    expect(lines.map((l) => l.kind)).toEqual(["context", "del", "add", "add", "context"])
    expect(lines[1]?.oldNo).toBe(9)
    expect(lines[3]?.newNo).toBe(10)
  })
  test("split rows pair removed with added and pad the shorter side", () => {
    const hunk = diffStrings("a\nb\nc", "a\nB\nB2\nc", { context: 1 })[0]
    const rows = toSplitRows(hunk?.lines ?? [])
    expect(rows.map((r) => [r.left?.text, r.right?.text])).toEqual([
      ["a", "a"],
      ["b", "B"],
      [undefined, "B2"],
      ["c", "c"],
    ])
  })
})

describe("highlight", () => {
  test("classifies keywords, strings, numbers, functions and comments", () => {
    const [line] = highlight('const x = fn("a", 42) // note', "ts")
    const kinds = Object.fromEntries((line ?? []).filter((t) => t.kind).map((t) => [t.text, t.kind]))
    expect(kinds.const).toBe("k")
    expect(kinds.fn).toBe("f")
    expect(kinds['"a"']).toBe("s")
    expect(kinds["42"]).toBe("n")
    expect(kinds["// note"]).toBe("c")
  })
  test("splits multi-line tokens by line", () => {
    expect(highlight("/* a\nb */\nx", "ts")).toHaveLength(3)
  })
})

describe("composer triggers", () => {
  test("finds @ and $ after whitespace and / at a line start", () => {
    expect(findTrigger("look at @use", 12)).toEqual({ char: "@", start: 8, query: "use" })
    expect(findTrigger("then $re", 8)).toEqual({ char: "$", start: 5, query: "re" })
    expect(findTrigger("/rev", 4)).toEqual({ char: "/", start: 0, query: "rev" })
    expect(findTrigger("a/b", 3)).toBeNull()
    expect(findTrigger("and /x", 6)).toBeNull()
    expect(findTrigger("mail me@x", 9)).toBeNull()
  })
  test("filters prefix before substring before description", () => {
    const items = [
      { label: "refactor", description: "Restructure" },
      { label: "review", description: "Review changes" },
      { label: "reset", description: "Clear" },
      { label: "x", description: "Do a rev check" },
    ]
    expect(filterItems(items, "rev").map((m) => m.item.label)).toEqual(["review", "x"])
    expect(filterItems(items, "e")[0]?.item.label).toBe("refactor")
    expect(filterItems(items, "").length).toBe(4)
    expect(filterItems(items, "rev")[0]?.range).toEqual([0, 3])
  })
})
