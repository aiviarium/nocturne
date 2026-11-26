import { describe, expect, test } from "bun:test"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { PAGES } from "../gallery/pages"

const EXAMPLES = join(import.meta.dir, "..", "examples")
const DESIGN = join(EXAMPLES, "design")

describe("design examples", () => {
  test("each one says whether it is the right way or the wrong way", () => {
    const missing = readdirSync(DESIGN)
      .filter((f) => f.endsWith(".tsx"))
      .filter((f) => !/\n {2}verdict: "(do|dont)",\n/.test(readFileSync(join(DESIGN, f), "utf8")))
    expect(missing).toEqual([])
  })
})

describe("gallery pages", () => {
  test("every section names an example that exists", () => {
    const ids = PAGES.flatMap((p) => p.sections.flat())
    expect(ids.filter((id) => !existsSync(join(EXAMPLES, `${id}.tsx`)))).toEqual([])
  })

  test("the shell comes first after the overview, the flagship at full size", () => {
    expect(PAGES.slice(0, 7).map((p) => p.id)).toEqual([
      "overview",
      "shell",
      "title-bar",
      "sidebar",
      "view-header",
      "panels",
      "appearance",
    ])
    const shell = PAGES[1]!
    expect(shell.full).toBe(true)
    expect(shell.sections).toEqual(["app-shell/workbench"])
  })
})
