// The overlay exports no other test renders: PopoverButton, OpenLayer and MenuEntries.
import { afterEach, describe, expect, test } from "bun:test"
import { MenuContent, Menu as MenuRoot, MenuTrigger } from "@ui-sdk/solid/menu"
import { createSignal, flush, Show } from "solid-js"
import { MenuEntries, OpenLayer, openLayers, PopoverButton } from "../src"
import { all, click, mount, one, press, tick } from "./dom"

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

describe("PopoverButton", () => {
  test("its button opens a named popover, and Escape closes it", async () => {
    const changes: boolean[] = []
    const { root } = show(() => (
      <PopoverButton
        label="Filters"
        title="Filters"
        description="Narrow the list"
        onOpenChange={(o) => changes.push(o)}
      >
        <p class="inside">Inside</p>
      </PopoverButton>
    ))
    const trigger = one<HTMLButtonElement>("[data-part=popover-button]", root)
    expect(trigger.classList.contains("nc-btn")).toBe(true)
    expect(all("[data-part=popover]").filter((p) => !p.hidden)).toHaveLength(0)
    click(trigger)
    await tick()
    const pop = one("[data-part=popover]")
    expect(pop.classList.contains("nc-popover--panel")).toBe(true)
    expect(one(".nc-popover__title", pop).textContent).toBe("Filters")
    expect(one(".nc-popover__description", pop).textContent).toBe("Narrow the list")
    expect(one(".inside", pop).textContent).toBe("Inside")
    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    press(pop, "Escape")
    await tick()
    expect(changes).toEqual([true, false])
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
  })

  test("takes a class for its trigger and a label for an icon-only one", () => {
    const { root } = show(() => <PopoverButton label="⋯" aria-label="More" triggerClass="nc-icon-btn" />)
    const trigger = one("[data-part=popover-button]", root)
    expect(trigger.getAttribute("aria-label")).toBe("More")
    expect(trigger.classList.contains("nc-icon-btn")).toBe(true)
  })
})

describe("OpenLayer", () => {
  test("counts an open layer in openLayers while it is mounted", () => {
    const [on, setOn] = createSignal(false)
    show(() => (
      <Show when={on()}>
        <OpenLayer />
      </Show>
    ))
    const before = openLayers()
    setOn(true)
    flush()
    expect(openLayers()).toBe(before + 1)
    setOn(false)
    flush()
    expect(openLayers()).toBe(before)
  })
})

describe("MenuEntries", () => {
  test("draws items, labels and separators as menu parts, each item valued by its id", async () => {
    const chosen: string[] = []
    const { root } = show(() => (
      <MenuRoot onAction={(v: string) => chosen.push(`action:${v}`)}>
        <MenuTrigger>Open</MenuTrigger>
        <MenuContent data-part="menu">
          <MenuEntries
            onSelect={(id) => chosen.push(id)}
            items={[
              { type: "label", label: "File" },
              { id: "new", label: "New", icon: "plus" },
              { id: "open", label: "Open" },
              { type: "separator" },
              { id: "delete", label: "Delete", danger: true },
            ]}
          />
        </MenuContent>
      </MenuRoot>
    ))
    click(one("button", root))
    await tick()
    const menu = one("[data-part=menu]")
    const items = all("[role=menuitem]")
    expect(items.map((i) => i.textContent)).toEqual(["New", "Open", "Delete"])
    expect(menu.querySelectorAll("[role=separator]")).toHaveLength(1)
    expect(menu.textContent).toContain("File")
    click(items[1]!)
    await tick()
    // A plain item reports through the menu's onAction, by its id.
    expect(chosen).toEqual(["action:open"])
  })
})
