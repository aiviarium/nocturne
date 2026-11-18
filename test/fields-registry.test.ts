// One implementation per field kind: the kinds live in `src/fields`, one file each, and every surface of the
// library that shows or edits a typed value goes through them. This fails when a kind has no file or a
// file is not a kind, and when a surface draws a value with a control of its own.
import { describe, expect, test } from "bun:test"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { FIELD_KINDS } from "../src/fields"

const ROOT = resolve(import.meta.dir, "..")
const read = (p: string) => readFileSync(join(ROOT, p), "utf8")

describe("the registry", () => {
  const kindFiles = readdirSync(join(ROOT, "src/fields/kinds")).map((f) => f.replace(/\.tsx$/, ""))
  test("every kind is a file of its own, and every file is a kind", () => {
    const ids = Object.keys(FIELD_KINDS).sort()
    expect(kindFiles.sort()).toEqual(ids)
    for (const id of ids) expect(existsSync(join(ROOT, `src/fields/kinds/${id}.tsx`))).toBe(true)
  })
  test("each kind reads and edits a value and writes it as text", () => {
    for (const [id, kind] of Object.entries(FIELD_KINDS)) {
      expect(typeof kind.Value, id).toBe("function")
      expect(typeof kind.Editor, id).toBe("function")
      expect(typeof kind.text, id).toBe("function")
    }
  })
})

/** What draws a typed value: controls the surfaces must take from the registry. */
const CONTROLS = ["NumberField", "InlineField", "Slider", "Checkbox", "Switch", "Select", "TextArea"]

/** The library's surfaces that show or edit a typed value: a schema's form and the query builder's editors. */
const SURFACES = [
  "src/components/SchemaForm.tsx",
  "src/components/QueryBuilder.tsx",
  "src/components/query-editors.tsx",
]

/** Controls a surface may keep because they are not what draws a value: the builder's pickers of a field, an operator and a combinator. */
const CHROME: Record<string, string[]> = {
  "src/components/QueryBuilder.tsx": ["Select"],
}

describe("the surfaces", () => {
  for (const file of new Set(SURFACES)) {
    const src = read(file)
    test(`${file} takes no control that draws a value from outside the registry`, () => {
      const imports = [...src.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+"([^"]+)"/g)]
      for (const [, names, from] of imports) {
        if (
          !from ||
          !(
            from === "@aiviarium/nocturne" ||
            /\.\/(NumberField|InlineField|Slider|Switch|Select|TextArea)$/.test(from)
          )
        )
          continue
        const used = names!.split(",").map(
          (n) =>
            n
              .trim()
              .replace(/^type\s+/, "")
              .split(/\s+as\s+/)[0],
        )
        for (const c of CONTROLS.filter((c) => !CHROME[file]?.includes(c)))
          expect(used, `${file} imports ${c}`).not.toContain(c)
      }
      expect(src, `${file} has a native date, number or checkbox input`).not.toMatch(
        /type=["'](date|datetime-local|number|checkbox|range|time)["']/,
      )
      expect(src, `${file} has a native select or textarea`).not.toMatch(/<(select|textarea)[\s>]/)
    })
    test(`${file} formats no value of its own`, () => {
      expect(src).not.toMatch(/Intl\.NumberFormat|toLocaleDateString|toLocaleString\(|Intl\.DateTimeFormat/)
    })
  }
})
