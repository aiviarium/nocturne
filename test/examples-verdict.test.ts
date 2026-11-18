import { describe, expect, test } from "bun:test"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

const DESIGN = join(import.meta.dir, "..", "examples", "design")

describe("design examples", () => {
  test("each one says whether it is the right way or the wrong way", () => {
    const missing = readdirSync(DESIGN)
      .filter((f) => f.endsWith(".tsx"))
      .filter((f) => !/\n {2}verdict: "(do|dont)",\n/.test(readFileSync(join(DESIGN, f), "utf8")))
    expect(missing).toEqual([])
  })
})
