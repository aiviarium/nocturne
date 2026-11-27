// FormField's stable part and what it does with a refusal; the field surfaces' roots.
import { afterEach, describe, expect, test } from "bun:test"
import { createSignal, flush } from "solid-js"
import { FieldEditor, FieldFilter, type FieldSpec, FieldValue, FormField } from "../src"
import { mount, one } from "./dom"

let cleanup: Array<() => void> = []
const show = (view: Parameters<typeof mount>[0]) => {
  const m = mount(view)
  cleanup.push(m.dispose)
  return m
}
afterEach(() => {
  for (const c of cleanup) c()
  cleanup = []
  document.body.innerHTML = ""
})

describe("FormField", () => {
  test("labels its control, marks it optional, and shows a refusal as an alert", () => {
    const [error, setError] = createSignal<string | undefined>(undefined)
    const spec: FieldSpec = { name: "host", title: "Host", kind: "text" }
    const { root } = show(() => (
      <FormField spec={spec} error={error()}>
        <input class="control" />
      </FormField>
    ))
    const row = one("[data-part=field-row]", root)
    expect(row.getAttribute("data-field")).toBe("host")
    expect(row.getAttribute("data-kind")).toBe("text")
    expect(one(".nc-fieldrow__label", row).textContent).toBe("Host (optional)")
    expect(one(".nc-fieldrow__control .control", row)).toBeTruthy()
    expect(row.querySelector("[role=alert]")).toBeNull()
    setError("Already taken")
    flush()
    expect(row.hasAttribute("data-invalid")).toBe(true)
    expect(one("[role=alert]", row).textContent).toBe("Already taken")
  })

  test("a switch sits beside its label, and a required field has no marker", () => {
    const { root } = show(() => (
      <FormField spec={{ name: "on", title: "Enabled", kind: "boolean", required: true }}>
        <input type="checkbox" />
      </FormField>
    ))
    const row = one("[data-part=field-row]", root)
    expect(row.classList.contains("nc-fieldrow--row")).toBe(true)
    expect(row.querySelector(".nc-fieldrow__optional")).toBeNull()
  })
})

describe("the field surfaces", () => {
  const spec: FieldSpec = { name: "name", title: "Name", kind: "text" }
  test("FieldValue, FieldEditor and FieldFilter draw a part of the kind, and hand over what is typed", () => {
    const committed: unknown[] = []
    const filtered: unknown[] = []
    const { root } = show(() => (
      <div>
        <div class="value">
          <FieldValue spec={spec} value="Ada" />
        </div>
        <div class="editor">
          <FieldEditor spec={spec} value="Ada" onCommit={(v) => committed.push(v)} variant="boxed" />
        </div>
        <div class="filter">
          <FieldFilter spec={spec} value="" label="Name" onChange={(v) => filtered.push(v)} />
        </div>
      </div>
    ))
    expect(one(".value", root).textContent).toContain("Ada")
    expect(one(".editor [data-part]", root)).toBeTruthy()
    expect(one(".filter [data-part]", root)).toBeTruthy()
    const type = (input: HTMLInputElement, text: string) => {
      input.focus()
      input.value = text
      input.dispatchEvent(new InputEvent("input", { bubbles: true }))
      input.dispatchEvent(new Event("change", { bubbles: true }))
      flush()
    }
    type(one<HTMLInputElement>(".editor input", root), "Grace")
    type(one<HTMLInputElement>(".filter input", root), "Gr")
    expect(committed).toContain("Grace")
    expect(filtered).toContain("Gr")
  })
})
