import { afterEach, describe, expect, test } from "bun:test"
import { SchemaForm } from "../src"
import { blankDraft, fieldNode, type JsonSchema, readForm, schemaHasFields } from "../src/lib/schema"
import { all, click, mount, one, press, tick } from "./dom"

let cleanup: Array<() => void> = []
afterEach(() => {
  for (const c of cleanup) c()
  cleanup = []
  document.body.innerHTML = ""
})

/** Merges what a person typed into a draft (nested groups merge, everything else replaces). */
function merge(draft: any, typed: Record<string, unknown>) {
  for (const [key, value] of Object.entries(typed)) {
    if (value && typeof value === "object" && !Array.isArray(value))
      merge(draft[key], value as Record<string, unknown>)
    else draft[key] = value
  }
}

const read = (schema: JsonSchema, typed: Record<string, unknown> = {}, value?: Record<string, unknown>) => {
  const node = fieldNode(schema)
  const draft = blankDraft(node, value) as any
  merge(draft, typed)
  return readForm(node, draft)
}

describe("schema reading", () => {
  const greet: JsonSchema = {
    type: "object",
    properties: {
      name: { type: "string", description: "Who to greet" },
      loud: { type: "boolean", default: false },
      times: { type: "integer", minimum: 1, maximum: 5 },
    },
    required: ["name"],
  }

  test("only an object with properties asks for anything", () => {
    expect(schemaHasFields(greet)).toBe(true)
    expect(schemaHasFields({ type: "object", properties: {} })).toBe(false)
    expect(schemaHasFields({ type: "string" })).toBe(false)
    expect(schemaHasFields(undefined)).toBe(false)
  })

  test("a required field must be filled, an optional blank one is left out", () => {
    expect(read(greet).errors).toEqual({ name: "Required" })
    const ok = read(greet, { name: "Bo" })
    expect(ok.errors).toEqual({})
    expect(ok.value).toEqual({ name: "Bo", loud: false })
  })

  test("numbers are parsed and checked against their limits", () => {
    expect(read(greet, { name: "Bo", times: "3" }).value).toEqual({
      name: "Bo",
      loud: false,
      times: 3,
    })
    expect(read(greet, { name: "Bo", times: "0" }).errors.times).toBe("At least 1")
    expect(read(greet, { name: "Bo", times: "9" }).errors.times).toBe("At most 5")
    expect(read(greet, { name: "Bo", times: "2.5" }).errors.times).toBe("Whole numbers only")
    expect(read(greet, { name: "Bo", times: "abc" }).errors.times).toBe("Not a number")
  })

  test("strings are checked for length, pattern and format", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        slug: { type: "string", minLength: 3, maxLength: 5, pattern: "^[a-z]+$" },
        mail: { type: "string", format: "email" },
        site: { type: "string", format: "uri" },
      },
    }
    expect(read(schema, { slug: "ab" }).errors.slug).toBe("At least 3 characters")
    expect(read(schema, { slug: "abcdef" }).errors.slug).toBe("At most 5 characters")
    expect(read(schema, { slug: "AB1" }).errors.slug).toBe("Not in the expected format")
    expect(read(schema, { mail: "nope" }).errors.mail).toBe("Not an email address")
    expect(read(schema, { site: "nope" }).errors.site).toContain("full URL")
    expect(read(schema, { slug: "abc", mail: "a@b.co", site: "https://x.dev" }).value).toEqual({
      slug: "abc",
      mail: "a@b.co",
      site: "https://x.dev",
    })
  })

  test("enums keep the type of the chosen option, and unions of choices are enums", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        level: { enum: [1, 2, 3] },
        mode: { anyOf: [{ const: "fast" }, { const: "safe" }] },
      },
      required: ["level"],
    }
    expect(fieldNode(schema.properties?.mode as JsonSchema).kind).toBe("enum")
    expect(read(schema).errors.level).toBe("Choose a value")
    expect(read(schema, { level: "2", mode: "safe" }).value).toEqual({
      level: 2,
      mode: "safe",
    })
  })

  test("a nullable field is shown as its real type", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: { note: { anyOf: [{ type: "string" }, { type: "null" }] } },
    }
    expect(fieldNode(schema.properties?.note as JsonSchema).kind).toBe("string")
    expect(read(schema, { note: "hi" }).value).toEqual({ note: "hi" })
    expect(read(schema).value).toEqual({})
  })

  test("nested objects: required fields of an untouched optional group do not block, a started group must be complete", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        server: {
          type: "object",
          properties: { host: { type: "string" }, port: { type: "integer" } },
          required: ["host"],
        },
      },
    }
    expect(read(schema).value).toEqual({})
    expect(read(schema, { server: { port: "80" } }).errors).toEqual({ "server.host": "Required" })
    expect(read(schema, { server: { host: "build-01", port: "22" } }).value).toEqual({
      server: { host: "build-01", port: 22 },
    })
    const required = { ...schema, required: ["server"] }
    expect(read(required).errors).toEqual({ "server.host": "Required" })
  })

  test("arrays of scalars drop blank rows and check each row and the count", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        tags: { type: "array", items: { type: "string", minLength: 2 }, minItems: 1, maxItems: 3 },
      },
    }
    expect(read(schema).errors.tags).toBe("At least 1 item")
    expect(read(schema, { tags: ["a", "", "bb"] }).errors).toEqual({
      "tags.0": "At least 2 characters",
    })
    expect(read(schema, { tags: ["aa", "", "bb"] }).value).toEqual({ tags: ["aa", "bb"] })
    expect(read(schema, { tags: ["aa", "bb", "cc", "dd"] }).errors.tags).toBe("At most 3 items")
    const numbers: JsonSchema = {
      type: "object",
      properties: { ports: { type: "array", items: { type: "integer" } } },
    }
    expect(read(numbers, { ports: ["80", "443"] }).value).toEqual({ ports: [80, 443] })
  })

  test("$ref and allOf resolve, and what a form cannot show becomes JSON", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        who: { $ref: "#/$defs/person" },
        extra: {},
        either: { anyOf: [{ type: "string" }, { type: "number" }] },
      },
      required: ["who"],
      $defs: { person: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
    }
    const node = fieldNode(schema)
    expect(node.kind === "object" && node.fields.map((f) => f.node.kind)).toEqual(["object", "json", "json"])
    expect(read(schema).errors).toEqual({ "who.name": "Required" })
    expect(read(schema, { who: { name: "A" }, extra: '{"a":1}' }).value).toEqual({
      who: { name: "A" },
      extra: { a: 1 },
    })
    expect(read(schema, { who: { name: "A" }, extra: "{oops" }).errors.extra).toBe("Not valid JSON")
  })

  test("starting values and schema defaults fill the draft", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: { name: { type: "string", default: "dev" }, n: { type: "number" } },
    }
    expect(read(schema).value).toEqual({ name: "dev" })
    expect(read(schema, {}, { name: "ann", n: 4 }).value).toEqual({ name: "ann", n: 4 })
  })
})

describe("SchemaForm", () => {
  const schema: JsonSchema = {
    type: "object",
    properties: {
      name: { type: "string", description: "Who to greet" },
      loud: { type: "boolean", title: "Loud" },
      mood: { enum: ["calm", "excited"] },
      tags: { type: "array", items: { type: "string" } },
      server: {
        type: "object",
        properties: { host: { type: "string" }, port: { type: "integer" } },
        required: ["host"],
      },
    },
    required: ["name"],
  }
  const setup = (extra: Partial<Parameters<typeof SchemaForm>[0]> = {}) => {
    const submitted: unknown[] = []
    const m = mount(() => (
      <SchemaForm
        schema={schema}
        submitLabel="Greet someone"
        onSubmit={(v) => submitted.push(v)}
        {...extra}
      />
    ))
    cleanup.push(m.dispose)
    return { ...m, submitted }
  }
  // The control a field's row holds, by its name (the label says "(optional)" beside it where the field may be left out).
  const field = (label: string) => {
    const name = label.replace(/ \(optional\)$/, "")
    const el = document.querySelector<HTMLInputElement>(`[aria-label="${name}"]`)
    if (!el) throw new Error(`no field ${label}`)
    return el
  }
  const type = (el: HTMLInputElement, value: string) => {
    el.value = value
    el.dispatchEvent(new Event("input", { bubbles: true }))
  }
  const submit = async () => {
    click(one("button[type=submit]"))
    await tick()
  }

  test("shows a labelled field for each property, with optional marked and its help behind an info button", async () => {
    setup()
    await tick()
    expect(field("Name").getAttribute("id")).toBeTruthy()
    expect(all(".nc-fieldrow__label").map((l) => l.textContent)).toEqual([
      "Name",
      "Loud",
      "Mood (optional)",
      "Host",
      "Port (optional)",
    ])
    expect(one("legend").textContent).toBe("Server (optional)")
    // The description is not text on the page: it is behind the info button of its field.
    expect(document.body.textContent).not.toContain("Who to greet")
    click(one("[data-part=info-tip] button"))
    await tick()
    expect(one("[role=dialog]").textContent).toBe("Who to greet")
    expect(all("[role=switch]").length).toBe(1)
    expect(document.activeElement).toBe(field("Name"))
  })

  test("submitting with a required field blank shows the message, focuses the field and does not submit", async () => {
    const { submitted } = setup()
    await tick()
    await submit()
    expect(submitted).toEqual([])
    expect(field("Name").getAttribute("aria-invalid")).toBe("true")
    expect(document.body.textContent).toContain("Required")
    expect(document.activeElement).toBe(field("Name"))
    // The message goes away as soon as the value is fine.
    type(field("Name"), "Bo")
    await tick()
    expect(document.body.textContent).not.toContain("Required")
  })

  test("submits the typed value: checkbox, array rows and an untouched optional group left out", async () => {
    const { submitted } = setup()
    await tick()
    type(field("Name"), "Bo")
    click(one("[role=switch]"))
    click(all("button").find((b) => b.textContent?.includes("Add tags")) as HTMLElement)
    await tick()
    // A list of strings is a DataList: a field per row, named by its row.
    type(one<HTMLInputElement>("input[aria-label='Tags 1']"), "x")
    click(all("button").find((b) => b.textContent?.includes("Add tags")) as HTMLElement)
    await tick()
    expect(all("[data-part=data-list] input").length).toBe(2)
    await submit()
    expect(submitted).toEqual([{ name: "Bo", loud: true, tags: ["x"] }])
  })

  test("removing an array row", async () => {
    const { submitted } = setup({ value: { name: "Bo", tags: ["a", "b", "c"] } })
    await tick()
    const row = one<HTMLElement>("[data-part=data-list] .nc-datalist__row[data-index='1']")
    row.focus()
    press(row, "Delete")
    await tick()
    await submit()
    expect(submitted).toEqual([{ name: "Bo", loud: false, tags: ["a", "c"] }])
  })

  test("a started nested group reports its own field", async () => {
    const { submitted } = setup({ value: { name: "Bo", server: { port: 22 } } })
    await tick()
    await submit()
    expect(submitted).toEqual([])
    expect(document.body.textContent).toContain("Required")
  })

  test("an enum is a select, and the chosen option is submitted", async () => {
    const { submitted } = setup({ value: { name: "Bo" } })
    await tick()
    click(one("button.nc-select"))
    await tick()
    const option = all("[role=menuitemradio]").find((o) => o.textContent === "excited") as HTMLElement
    click(option)
    await tick()
    await submit()
    expect(submitted).toEqual([{ name: "Bo", loud: false, mood: "excited" }])
  })

  test("a choice with a title is shown by it and stored by its value, and an empty choice replaces None", async () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        view: {
          type: "string",
          title: "Saved view",
          oneOf: [
            { const: "", title: "Default" },
            { const: "a1", title: "Mine" },
          ],
        },
      },
    }
    const node = fieldNode(schema.properties?.view as JsonSchema)
    expect(node.kind).toBe("enum")
    expect((node as { options: unknown[] }).options).toEqual(["", "a1"])
    const submitted: unknown[] = []
    const m = mount(() => (
      <SchemaForm schema={schema} value={{ view: "a1" }} onSubmit={(v) => submitted.push(v)} />
    ))
    cleanup.push(m.dispose)
    await tick()
    expect(one("button.nc-select").textContent).toContain("Mine")
    click(one("button.nc-select"))
    await tick()
    expect(all("[role=menuitemradio]").map((o) => o.textContent)).toEqual(["Default", "Mine"])
  })

  test("server problems are shown, cancel calls back, and the form can be left without buttons", async () => {
    let cancelled = 0
    setup({ problems: ["409 · Name is taken"], onCancel: () => cancelled++, cancelLabel: "Back" })
    await tick()
    expect(one("[data-part=schema-form-problems]").textContent).toBe("409 · Name is taken")
    click(all("button").find((b) => b.textContent === "Back") as HTMLElement)
    expect(cancelled).toBe(1)
    document.body.innerHTML = ""
    setup({ hideActions: true })
    await tick()
    expect(all("button[type=submit]").length).toBe(0)
  })

  test("onValueChange reports the value so far, or undefined while a field does not fit", async () => {
    const seen: unknown[] = []
    setup({ onValueChange: (v) => seen.push(v) })
    await tick()
    expect(seen.at(-1)).toBeUndefined()
    type(field("Name"), "Bo")
    await tick()
    expect(seen.at(-1)).toEqual({ name: "Bo", loud: false })
  })

  test("secret fields are password inputs; a stored one is not required and left blank keeps its value", async () => {
    const conn: JsonSchema = {
      type: "object",
      properties: {
        baseUrl: { type: "string", title: "Base URL" },
        apiKey: { type: "string", title: "API key" },
        token: { type: "string", title: "Token" },
        headers: { type: "string", title: "Extra headers", "x-multiline": true },
      },
      required: ["baseUrl", "apiKey", "token"],
    }
    const submitted: unknown[] = []
    const m = mount(() => (
      <SchemaForm
        schema={conn}
        secretFields={["apiKey", "token"]}
        storedSecrets={["apiKey"]}
        onSubmit={(v) => submitted.push(v)}
      />
    ))
    cleanup.push(m.dispose)
    await tick()
    // Stored: no longer required, shown as set. Not stored: still required.
    expect(field("API key (optional)").type).toBe("password")
    expect(field("API key (optional)").placeholder).toBe("••••••••••••")
    expect(document.body.textContent).not.toContain("Set. Leave it empty to keep it.")
    click(one("[data-part=info-tip] button"))
    await tick()
    expect(one("[role=dialog]").textContent).toBe("Set. Leave it empty to keep it.")
    expect(field("Token").type).toBe("password")
    expect(field("Token").autocomplete).toBe("new-password")
    expect(field("Base URL").type).toBe("text")
    const headers = field("Extra headers (optional)") as unknown as HTMLTextAreaElement
    expect(headers.tagName).toBe("TEXTAREA")
    type(field("Base URL"), "http://x/v1")
    type(headers as unknown as HTMLInputElement, "A: 1\nB: 2")
    await submit()
    expect(submitted).toEqual([])
    expect(document.body.textContent).toContain("Required")
    type(field("Token"), "t0k")
    await submit()
    expect(submitted).toEqual([{ baseUrl: "http://x/v1", token: "t0k", headers: "A: 1\nB: 2" }])
  })
})
