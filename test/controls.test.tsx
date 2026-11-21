import { afterEach, describe, expect, test } from "bun:test"
import { createSignal, flush } from "solid-js"
import {
  NumberField,
  QueryBuilder,
  type QueryField,
  type QueryGroup,
  RangeSlider,
  SchemaForm,
  Slider,
  UNITS,
} from "../src"
import { all, click, mount, one, press, tick } from "./dom"

let cleanup: Array<() => void> = []
afterEach(() => {
  for (const c of cleanup) c()
  cleanup = []
  document.body.innerHTML = ""
})
const view = (v: Parameters<typeof mount>[0]) => {
  const m = mount(v)
  cleanup.push(m.dispose)
  return m
}

function type(input: HTMLInputElement, text: string) {
  input.focus()
  input.value = text
  input.dispatchEvent(new InputEvent("input", { bubbles: true }))
  flush()
}

describe("NumberField", () => {
  test("evaluates a typed expression on Enter", async () => {
    const seen: Array<number | null> = []
    view(() => <NumberField label="Price" defaultValue={100} onChange={(v) => seen.push(v)} />)
    const input = one<HTMLInputElement>("input[role=spinbutton]")
    type(input, "100-15%")
    press(input, "Enter")
    await tick()
    expect(seen.at(-1)).toBe(85)
    type(input, "*2")
    press(input, "Enter")
    expect(seen.at(-1)).toBe(170)
  })

  test("invalid input keeps the old value and shows an error", async () => {
    const seen: Array<number | null> = []
    view(() => <NumberField label="Price" defaultValue={10} onChange={(v) => seen.push(v)} />)
    const input = one<HTMLInputElement>("input[role=spinbutton]")
    type(input, "2+")
    press(input, "Enter")
    await tick()
    expect(seen).toEqual([])
    expect(input.getAttribute("aria-invalid")).toBe("true")
    expect(one("[role=alert]").textContent).toContain("Missing a number")
    expect(one(".nc-number").classList.contains("nc-input--error")).toBe(true)
    // Escape puts the value back and clears the error.
    press(input, "Escape")
    await tick()
    expect(input.value).toBe("10")
    expect(input.getAttribute("aria-invalid")).toBeNull()
  })

  test("units convert to the field's unit, and clamping keeps bounds", async () => {
    const seen: Array<number | null> = []
    view(() => (
      <NumberField
        label="Timeout"
        defaultValue={0}
        min={0}
        max={240}
        units={UNITS.minutes}
        onChange={(v) => seen.push(v)}
      />
    ))
    const input = one<HTMLInputElement>("input[role=spinbutton]")
    type(input, "1h 30m")
    input.dispatchEvent(new FocusEvent("blur"))
    flush()
    await tick()
    expect(seen.at(-1)).toBe(90)
    input.focus()
    type(input, "10h")
    press(input, "Enter")
    expect(seen.at(-1)).toBe(240)
  })

  test("arrow keys step, with Shift for ten steps and Alt for a tenth", () => {
    const [v, setV] = createSignal<number | null>(5)
    view(() => <NumberField aria-label="Size" value={v()} onChange={setV} step={1} min={0} max={20} />)
    const input = one<HTMLInputElement>("input[role=spinbutton]")
    press(input, "ArrowUp")
    expect(v()).toBe(6)
    press(input, "ArrowUp", { shiftKey: true })
    expect(v()).toBe(16)
    press(input, "ArrowUp", { shiftKey: true })
    expect(v()).toBe(20)
    press(input, "ArrowDown", { altKey: true })
    expect(v()).toBe(19.9)
    press(input, "PageDown")
    expect(v()).toBe(9.9)
  })

  test("steppers step and stop at the bounds", () => {
    const [v, setV] = createSignal<number | null>(1)
    view(() => (
      <NumberField aria-label="Replicas" value={v()} onChange={setV} min={1} max={3} steppers integer />
    ))
    const down = one<HTMLButtonElement>(".nc-number__step[data-dir=down]")
    const up = one<HTMLButtonElement>(".nc-number__step[data-dir=up]")
    expect(down!.disabled).toBe(true)
    click(up!)
    click(up!)
    expect(v()).toBe(3)
    expect(up!.disabled).toBe(true)
  })

  test("steppers: stacked up over down at the end, or split around the value", () => {
    view(() => (
      <>
        <NumberField aria-label="Stacked" defaultValue={2} steppers="stacked" />
        <NumberField aria-label="Split" defaultValue={2} steppers="split" />
      </>
    ))
    const [stacked, split] = all<HTMLElement>(".nc-number")
    const kids = (el: HTMLElement) => [...el.children].map((c) => c.className.split(" ").at(-1))
    expect(kids(stacked!)).toEqual(["nc-number__input", "nc-number__steps--stacked"])
    expect([...stacked!.querySelectorAll(".nc-number__step")].map((b) => b.getAttribute("data-dir"))).toEqual(
      ["up", "down"],
    )
    expect(kids(split!)).toEqual(["nc-number__steps--start", "nc-number__input", "nc-number__steps--end"])
  })

  test("ARIA spinbutton values", () => {
    view(() => <NumberField label="Width" defaultValue={320} min={0} max={1000} unit="px" />)
    const input = one<HTMLInputElement>("input")
    expect(input.getAttribute("role")).toBe("spinbutton")
    expect(input.getAttribute("aria-valuenow")).toBe("320")
    expect(input.getAttribute("aria-valuetext")).toBe("320 px")
    expect(input.getAttribute("aria-labelledby")).toBe(one("label").id)
  })

  test("an empty required field is an error; an optional one is null", async () => {
    const seen: Array<number | null> = []
    view(() => (
      <>
        <NumberField aria-label="A" defaultValue={3} required onChange={(v) => seen.push(v)} />
        <NumberField aria-label="B" defaultValue={3} onChange={(v) => seen.push(v)} />
      </>
    ))
    const [a, b] = all<HTMLInputElement>("input")
    type(a!, "")
    press(a!, "Enter")
    expect(a!.getAttribute("aria-invalid")).toBe("true")
    type(b!, "")
    press(b!, "Enter")
    expect(seen).toEqual([null])
  })
})

/** A key pressed and let go: ui-sdk's slider commits a key's change on keyup. */
function stroke(el: Element, key: string, init: KeyboardEventInit = {}) {
  press(el, key, init)
  el.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true, cancelable: true, ...init }))
  flush()
}

describe("Slider", () => {
  test("keys move by step, large step and to the ends", () => {
    const [v, setV] = createSignal(50)
    view(() => <Slider label="Volume" value={v()} onChange={setV} />)
    const thumb = one("[role=slider]")
    stroke(thumb, "ArrowRight")
    expect(v()).toBe(51)
    stroke(thumb, "PageUp")
    expect(v()).toBe(61)
    stroke(thumb, "ArrowLeft", { shiftKey: true })
    expect(v()).toBe(51)
    stroke(thumb, "End")
    expect(v()).toBe(100)
    stroke(thumb, "ArrowUp")
    expect(v()).toBe(100)
    stroke(thumb, "Home")
    expect(v()).toBe(0)
  })

  test("a range input per thumb, named by the label, with the formatted value", () => {
    view(() => <Slider label="Opacity" defaultValue={40} format={(n) => `${n}%`} />)
    const thumb = one<HTMLInputElement>("[role=slider]")
    expect(thumb.type).toBe("range")
    expect(thumb.value).toBe("40")
    expect(thumb.min).toBe("0")
    expect(thumb.max).toBe("100")
    expect(thumb.getAttribute("aria-valuetext")).toBe("40%")
    expect(document.getElementById(thumb.getAttribute("aria-labelledby") as string)?.textContent).toBe(
      "Opacity",
    )
    expect(one(".nc-slider__value").textContent).toBe("40%")
    expect(one("[data-part=slider]").getAttribute("role")).toBe("group")
  })

  test("steps snap and decimals stay clean", () => {
    const [v, setV] = createSignal(0.7)
    view(() => <Slider aria-label="Temperature" value={v()} onChange={setV} min={0} max={2} step={0.1} />)
    const thumb = one("[role=slider]")
    stroke(thumb, "ArrowRight")
    stroke(thumb, "ArrowRight")
    expect(v()).toBe(0.9)
  })

  test("disabled ignores keys", () => {
    const [v, setV] = createSignal(10)
    view(() => <Slider aria-label="Locked" value={v()} onChange={setV} disabled />)
    const thumb = one<HTMLInputElement>("[role=slider]")
    expect(thumb.disabled).toBe(true)
    stroke(thumb, "ArrowRight")
    expect(v()).toBe(10)
  })

  test("a range keeps its thumbs apart", () => {
    const [v, setV] = createSignal<[number, number]>([9, 10])
    view(() => <RangeSlider label="Hours" value={v()} onChange={setV} min={0} max={24} minDistance={1} />)
    const [lo, hi] = all("[role=slider]")
    expect(lo!.getAttribute("aria-label")).toBe("Hours, minimum")
    stroke(lo!, "ArrowRight")
    expect(v()).toEqual([9, 10])
    stroke(hi!, "ArrowLeft")
    expect(v()).toEqual([9, 10])
    stroke(hi!, "End")
    expect(v()).toEqual([9, 24])
  })

  test("the attached field sets the value", () => {
    const [v, setV] = createSignal(2048)
    view(() => (
      <Slider label="Memory" value={v()} onChange={setV} min={256} max={8192} step={256} field unit="MB" />
    ))
    const input = one<HTMLInputElement>("input[role=spinbutton]")
    type(input, "512*2")
    press(input, "Enter")
    expect(v()).toBe(1024)
    expect(one<HTMLInputElement>("[role=slider]").value).toBe("1024")
  })
})

describe("SchemaForm numbers", () => {
  test("number schemas use NumberField and slider schemas a Slider", async () => {
    let sent: unknown
    view(() => (
      <SchemaForm
        schema={{
          type: "object",
          properties: {
            replicas: { type: "integer", minimum: 1, maximum: 9 },
            volume: { type: "integer", minimum: 0, maximum: 100, "x-control": "slider" },
          },
        }}
        onSubmit={(v) => (sent = v)}
      />
    ))
    await tick()
    const input = one<HTMLInputElement>("[data-kind=number] input[role=spinbutton]")
    type(input, "2*3")
    press(input, "Enter")
    press(one("[data-kind=number] [role=slider]"), "End")
    one<HTMLFormElement>("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
    flush()
    await tick()
    expect(sent).toEqual({ replicas: 6, volume: 100 })
  })
})

const FIELDS: QueryField[] = [
  { name: "title", label: "Title", type: "text" },
  {
    name: "state",
    label: "State",
    type: "enum",
    options: [
      { value: "open", label: "Open" },
      { value: "done", label: "Done" },
    ],
  },
  { name: "estimate", label: "Estimate", type: "number" },
]

describe("QueryBuilder", () => {
  test("a chip per rule, with its parts", () => {
    view(() => (
      <QueryBuilder
        fields={FIELDS}
        defaultValue={{
          combinator: "and",
          rules: [
            { field: "state", op: "is", value: "open" },
            { field: "estimate", op: "gt", value: 3 },
          ],
        }}
      />
    ))
    const chips = all(".nc-qchip__main")
    expect(chips.map((c) => c.getAttribute("aria-label"))).toEqual(["State is Open", "Estimate > 3"])
    expect(one("[data-part=query-builder]").getAttribute("role")).toBe("group")
    // Filter and the advanced button lead the chips, so they never wrap onto a line of their own.
    const order = all(".nc-query__add, .nc-query__advanced, .nc-qchip").map(
      (el) => el.className.split(" ")[0],
    )
    expect(order.slice(0, 2)).toEqual(["nc-btn", "nc-icon-btn"])
  })

  test("a chip opens its popover; picking an option sets the value and closes it", async () => {
    let last: QueryGroup | undefined
    view(() => (
      <QueryBuilder
        fields={FIELDS}
        defaultValue={{ combinator: "and", rules: [{ field: "state", op: "is", value: "open" }] }}
        onChange={(q) => (last = q)}
      />
    ))
    click(one(".nc-qchip__main"))
    await tick()
    expect(one("[data-part=query-popover]").getAttribute("role")).toBe("dialog")
    const list = one("[role=listbox]")
    press(list, "ArrowDown")
    press(list, "Enter")
    await tick()
    expect(last?.rules[0]).toMatchObject({ field: "state", op: "is", value: "done" })
    expect(all("[data-part=query-popover]").length).toBe(0)
  })

  test("Delete on a chip removes it; arrow keys move between chips", async () => {
    let last: QueryGroup | undefined
    view(() => (
      <QueryBuilder
        fields={FIELDS}
        defaultValue={{
          combinator: "and",
          rules: [
            { field: "state", op: "is", value: "open" },
            { field: "estimate", op: "gt", value: 3 },
          ],
        }}
        onChange={(q) => (last = q)}
      />
    ))
    const [first, second] = all(".nc-qchip__main")
    first!.focus()
    press(first!, "ArrowRight")
    expect(document.activeElement).toBe(second!)
    press(second!, "Delete")
    await tick()
    expect(last?.rules.length).toBe(1)
    expect(all(".nc-qchip__main").length).toBe(1)
  })

  test("the builder variant edits rules in lines and adds groups", async () => {
    let last: QueryGroup | undefined
    view(() => (
      <QueryBuilder
        variant="builder"
        fields={FIELDS}
        defaultValue={{ combinator: "and", rules: [{ field: "estimate", op: "gt", value: 3 }] }}
        onChange={(q) => (last = q)}
      />
    ))
    expect(all("[data-part=query-rule]").length).toBe(1)
    const addGroup = all<HTMLButtonElement>("button").find((b) => b.textContent?.includes("Add group"))!
    click(addGroup)
    await tick()
    expect(last?.rules[1]).toMatchObject({ combinator: "or" })
    expect(all("[data-part=query-group]").length).toBe(1)
    // Removing the group's last rule removes the group.
    const removes = all<HTMLButtonElement>("[data-part=query-group] [aria-label='Remove filter']")
    click(removes[0]!)
    await tick()
    expect(last?.rules.length).toBe(1)
  })
})
