// The field kinds' newer parts: an instant in a filter, the pickers as sheets on a phone, the explanation behind
// an info button, a file's upload and the shared rich text editor in a field.
import { afterEach, describe, expect, test } from "bun:test"
import type { JSX } from "@solidjs/web"
import { createSignal, flush } from "solid-js"
import {
  configureFields,
  FieldEditor,
  FieldFilter,
  type FieldSpec,
  FormField,
  PhoneOverride,
  type RichTextJSON,
} from "../src"
import { formatDate } from "../src/fields/format"
import { all, click, mount, one, tick } from "./dom"

let cleanup: Array<() => void> = []
afterEach(() => {
  for (const c of cleanup) c()
  cleanup = []
  document.body.innerHTML = ""
  configureFields({})
})
const show = (view: () => JSX.Element) => {
  const m = mount(view)
  cleanup.push(m.dispose)
  return m
}

describe("the date and time filter", () => {
  const spec: FieldSpec = { name: "at", title: "At", kind: "datetime" }
  test("reads an instant like every other mode and edits it through the calendar", async () => {
    const instant = "2026-03-04T10:30:00.000Z"
    const m = show(() => <FieldFilter spec={spec} value={instant} label="At" onChange={() => {}} />)
    await tick()
    const trigger = one("[data-part=date-picker]", m.root)
    expect(trigger.textContent).toBe(formatDate(instant, true))
    expect(trigger.textContent).not.toContain("T10:30")
    click(trigger)
    await tick()
    expect(document.querySelector("[data-part=calendar]")).toBeTruthy()
    expect(document.querySelector("input[type=time]")).toBeTruthy()
  })
  test("a day stays a day", async () => {
    const m = show(() => <FieldFilter spec={spec} value="2026-03-04" label="At" onChange={() => {}} />)
    await tick()
    expect(one("[data-part=date-picker]", m.root).textContent).toBe(formatDate("2026-03-04", false))
  })
})

describe("pickers", () => {
  const date: FieldSpec = { name: "d", title: "Due", kind: "date" }
  test("the calendar is a popover on a desktop and a bottom sheet with a close control on a phone", async () => {
    const desk = show(() => (
      <FieldEditor spec={date} value="2026-03-04" onCommit={() => {}} variant="boxed" />
    ))
    click(one("[data-part=date-picker]", desk.root))
    await tick()
    expect(document.querySelector("[data-part=popover]")).toBeTruthy()
    expect(document.querySelector("[data-part=sheet]")).toBeNull()
    cleanup.pop()?.()
    document.body.innerHTML = ""

    const phone = show(() => (
      <PhoneOverride value={true}>
        <FieldEditor spec={date} value="2026-03-04" onCommit={() => {}} variant="boxed" />
      </PhoneOverride>
    ))
    click(one("[data-part=date-picker]", phone.root))
    await tick(4)
    expect(document.querySelector("[data-part=popover]")).toBeNull()
    expect(document.querySelector("[data-part=sheet]")).toBeTruthy()
    expect(document.querySelector("[data-part=sheet-close]")).toBeTruthy()
    expect(one("[data-part=sheet]").querySelector("[data-part=calendar]")).toBeTruthy()
  })
  test("the search of a reference is a sheet on a phone", async () => {
    configureFields({ searchRefs: async () => [{ uri: "customer://acme", title: "Acme" }] })
    const ref: FieldSpec = { name: "c", title: "Customer", kind: "ref", scheme: "customer" }
    const m = show(() => (
      <PhoneOverride value={true}>
        <FieldEditor spec={ref} value={null} onCommit={() => {}} variant="boxed" />
      </PhoneOverride>
    ))
    click(one("[aria-label=Customer]", m.root))
    await tick(4)
    expect(document.querySelector("[data-part=popover]")).toBeNull()
    expect(one("[data-part=sheet]").textContent).toContain("Acme")
  })
})

describe("an explanation", () => {
  test("is behind an info button, not on the page", async () => {
    const m = show(() => (
      <FormField spec={{ name: "n", title: "Name", kind: "text", help: "Who to greet" }}>
        <input />
      </FormField>
    ))
    expect(m.root.textContent).not.toContain("Who to greet")
    click(one("[data-part=info-tip] button", m.root))
    await tick()
    expect(one("[role=dialog]").textContent).toBe("Who to greet")
  })
  test("a field without one has no button", () => {
    const m = show(() => (
      <FormField spec={{ name: "n", title: "Name", kind: "text" }}>
        <input />
      </FormField>
    ))
    expect(m.root.querySelector("[data-part=info-tip]")).toBeNull()
  })
})

describe("a file", () => {
  const spec: FieldSpec = { name: "f", title: "Source", kind: "blob" }
  test("is uploaded, replaced and removed", async () => {
    const stored: unknown[] = []
    configureFields({
      uploadBlob: async (file) => ({
        id: `id-${file.name}`,
        name: file.name,
        size: file.size,
        url: "/blobs/x",
      }),
      blobInfo: async (id) => ({ id, name: "plan.pdf", size: 2048, url: `/blobs/${id}` }),
    })
    const [value, setValue] = createSignal<unknown>(null)
    const m = show(() => (
      <FieldEditor
        spec={spec}
        value={value()}
        variant="boxed"
        onCommit={(v) => {
          stored.push(v)
          setValue(v)
          flush()
        }}
      />
    ))
    const input = one<HTMLInputElement>("input[type=file]", m.root)
    const file = new File(["hello"], "notes.txt", { type: "text/plain" })
    Object.defineProperty(input, "files", { value: [file], configurable: true })
    input.dispatchEvent(new Event("change", { bubbles: true }))
    flush()
    await tick(4)
    expect(stored).toEqual(["id-notes.txt"])
    expect(m.root.textContent).toContain("plan.pdf")
    expect(m.root.textContent).toContain("2 KB")
    // Replace and Remove are in the file's menu.
    click(one("[aria-label='Source, file actions']", m.root))
    await tick()
    const items = all("[role=menuitem]").map((i) => i.textContent)
    expect(items).toEqual(["Replace…", "Remove"])
    click(all("[role=menuitem]")[1]!)
    await tick()
    expect(stored.at(-1)).toBeNull()
  })
  test("a field that is not editable only shows the file", () => {
    const m = show(() => <FieldEditor spec={spec} value="b1" disabled onCommit={() => {}} />)
    expect(m.root.querySelector("input[type=file]")).toBeTruthy()
    expect(m.root.querySelector("[aria-label='Source, file actions']")).toBeNull()
  })
})

describe("bytes", () => {
  const spec: FieldSpec = { name: "thumb", title: "Thumbnail", kind: "bytes", maxBytes: 8 }
  const put = async (m: ReturnType<typeof show>, file: File) => {
    const input = one<HTMLInputElement>("input[type=file]", m.root)
    Object.defineProperty(input, "files", { value: [file], configurable: true })
    input.dispatchEvent(new Event("change", { bubbles: true }))
    flush()
    await tick(4)
  }
  test("is uploaded as bytes, replaced and cleared, and shows its size", async () => {
    const stored: unknown[] = []
    const [value, setValue] = createSignal<unknown>(null)
    const m = show(() => (
      <FieldEditor
        spec={spec}
        value={value()}
        variant="boxed"
        onCommit={(v) => {
          stored.push(v)
          setValue(v)
          flush()
        }}
      />
    ))
    await put(m, new File([new Uint8Array([1, 2, 3, 4])], "a.bin"))
    expect(stored).toHaveLength(1)
    expect(Array.from(stored[0] as Uint8Array)).toEqual([1, 2, 3, 4])
    expect(m.root.textContent).toContain("4 B")
    click(one("[aria-label='Thumbnail, content actions']", m.root))
    await tick()
    expect(all("[role=menuitem]").map((i) => i.textContent)).toEqual(["Replace…", "Clear"])
    click(all("[role=menuitem]")[1]!)
    await tick()
    expect(stored.at(-1)).toBeNull()
  })
  test("refuses a file over the field's limit and says so", async () => {
    const stored: unknown[] = []
    const m = show(() => (
      <FieldEditor spec={spec} value={null} variant="boxed" onCommit={(v) => stored.push(v)} />
    ))
    await put(m, new File([new Uint8Array(9)], "big.bin"))
    expect(stored).toEqual([])
    expect(one("[role=alert]", m.root).textContent).toContain("more than this field takes (8 B)")
  })
  test("a field with no limit takes 1 MiB; a required one cannot be cleared; a read-only one can be downloaded", async () => {
    const m = show(() => (
      <FieldEditor
        spec={{ ...spec, maxBytes: undefined as never, required: true }}
        value="AQID"
        variant="boxed"
        onCommit={() => {}}
      />
    ))
    click(one("[aria-label='Thumbnail, content actions']", m.root))
    await tick()
    expect(all("[role=menuitem]").map((i) => i.textContent)).toEqual(["Replace…"])
    const ro = show(() => <FieldEditor spec={spec} value="AQID" disabled onCommit={() => {}} />)
    expect(ro.root.textContent).toContain("3 B")
    expect(ro.root.querySelector("[data-action=download]")).toBeTruthy()
    expect(ro.root.querySelector("[aria-label='Thumbnail, content actions']")).toBeNull()
  })
})

describe("a vector", () => {
  const spec: FieldSpec = { name: "e", title: "Embedding", kind: "vector", dimensions: 3 }
  test("shows its dimensions, never edits, and copies its numbers", async () => {
    let copied = ""
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (t: string) => {
          copied = t
        },
      },
      configurable: true,
    })
    const m = show(() => (
      <FieldEditor spec={spec} value={new Float32Array([0.5, 1, 2])} onCommit={() => {}} />
    ))
    expect(m.root.textContent).toContain("3 dimensions")
    expect(m.root.querySelector("input")).toBeNull()
    click(one("[data-action=copy]", m.root))
    await tick(3)
    expect(copied).toBe("[0.5,1,2]")
  })
  test("an empty vector is a dash with nothing to copy", () => {
    const m = show(() => <FieldEditor spec={spec} value={null} onCommit={() => {}} />)
    expect(m.root.querySelector("[data-action=copy]")).toBeNull()
  })
})

describe("formatted text", () => {
  const spec: FieldSpec = { name: "body", title: "Notes", kind: "richtext" }
  const doc: RichTextJSON = {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "A formatted note" }] }],
  }
  test("opens in the shared editor, read only when the field is", async () => {
    const m = show(() => <FieldEditor spec={spec} value={doc} disabled onCommit={() => {}} />)
    await tick(3)
    expect(one("[data-part=richtext-field]", m.root).textContent).toContain("A formatted note")
    expect(m.root.querySelector("[contenteditable=true]")).toBeNull()
  })
  test("is editable in the editor otherwise", async () => {
    const m = show(() => <FieldEditor spec={spec} value={doc} variant="boxed" onCommit={() => {}} />)
    await tick(3)
    expect(m.root.querySelector(".nc-editor--field")).toBeTruthy()
    expect(m.root.querySelector("[contenteditable=true]")).toBeTruthy()
  })
})
