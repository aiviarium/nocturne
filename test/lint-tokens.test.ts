import { describe, expect, test } from "bun:test"
import { join } from "node:path"
import { lintPaths, lintSource } from "../scripts/lint-tokens"

const rules = (file: string, text: string) => lintSource(file, text).map((f) => f.rule)

describe("lint-tokens", () => {
  test("flags hex, rgb and hsl colours in CSS and TSX", () => {
    expect(
      rules("a.css", ".a { color: #fff; background: rgba(0,0,0,.5); border-color: hsl(10 20% 30%) }"),
    ).toEqual(["colour", "colour", "colour"])
    expect(rules("a.tsx", `<svg fill="#A1A1AA" style={{ background: "rgb(1,2,3)" }} />`)).toEqual([
      "colour",
      "colour",
    ])
  })
  test("flags named colours only where a colour is expected", () => {
    expect(rules("a.css", ".a { color: white; border: 1px solid red; background: none }")).toEqual([
      "colour",
      "colour",
    ])
    expect(rules("a.css", ".a { content: 'white'; font-family: black-sans }")).toEqual([])
    expect(rules("a.tsx", `<div style={{ color: "gray" }} />`)).toEqual(["colour"])
  })
  test("allows tokens, transparent, currentColor and colour-mix of tokens", () => {
    expect(
      rules(
        "a.css",
        ".a { color: var(--text-1); background: color-mix(in srgb, var(--accent) 20%, transparent); fill: none; stroke: currentColor }",
      ),
    ).toEqual([])
  })
  test("flags literal radii and accepts tokens, zero and calc of tokens", () => {
    expect(rules("a.css", ".a { border-radius: 6px }")).toEqual(["radius"])
    expect(rules("a.css", ".a { border-top-left-radius: 50%; border-radius: 999px }")).toEqual([
      "radius",
      "radius",
    ])
    expect(
      rules(
        "a.css",
        ".a { border-radius: var(--radius-sm); border-radius: 0; border-radius: calc(var(--radius-md) - 1px) }",
      ),
    ).toEqual([])
    expect(rules("a.tsx", `<div style={{ "border-radius": "4px", borderRadius: 8 }} />`)).toEqual([
      "radius",
      "radius",
    ])
  })
  test("flags literal font sizes and the font shorthand, accepts tokens and inherit", () => {
    expect(rules("a.css", ".a { font-size: 12px; font: 500 13px/16px var(--font-sans) }")).toEqual([
      "font-size",
      "font-size",
    ])
    expect(rules("a.tsx", `<span style={{ fontSize: 12 }} /><span style="font-size: 0.8rem" />`)).toEqual([
      "font-size",
      "font-size",
    ])
    expect(
      rules(
        "a.css",
        ".a { font-size: inherit; font: inherit; font-size: var(--x); font-weight: 600; line-height: 20px }",
      ),
    ).toEqual([])
  })
  test("ignores comments, ids that are not colours and respects the ignore markers", () => {
    expect(
      rules(
        "a.css",
        "/* color: #fff; border-radius: 4px */\n#header { top: 0 }\n.a { color: var(--text-1) }",
      ),
    ).toEqual([])
    expect(rules("a.tsx", `// fill="#fff"\n<a href="#" />`)).toEqual([])
    expect(rules("a.tsx", `<ListRow title="Merged PR #418" meta="#418 fixes the runner" />`)).toEqual([])
    expect(rules("a.tsx", `<rect fill="#222" />`)).toEqual(["colour"])
    expect(rules("a.css", ".a { color: #123 }")).toEqual(["colour"])
    expect(rules("a.css", ".a { color: #fff } /* lint-tokens-ignore */")).toEqual([])
    expect(rules("a.css", "/* lint-tokens-ignore-next-line */\n.a { color: #fff }")).toEqual([])
  })
  test("reports line numbers of the offending line", () => {
    const [f] = lintSource("a.css", ".a {\n  color: var(--text-1);\n  border-radius: 7px;\n}")
    expect(f?.line).toBe(3)
  })
})

describe("lint-tokens over the repository", () => {
  const root = join(import.meta.dir, "..")
  test("the library, the gallery and the examples use tokens only", () => {
    const findings = lintPaths(["src", "gallery", "examples"].map((p) => join(root, p)))
    expect(findings.map((f) => `${f.file}:${f.line} ${f.message}`)).toEqual([])
  })
  test("tokens.css and bundle.css, which define the values, are skipped", () => {
    const styles = join(root, "src/styles")
    expect(lintPaths([styles], [])).not.toEqual([])
    expect(lintPaths([styles]).filter((f) => /(tokens|bundle)\.css$/.test(f.file))).toEqual([])
  })
})
