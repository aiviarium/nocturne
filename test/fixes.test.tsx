// Fixes found while building the demo: each part works in context the way the demo needs it.
import { afterEach, describe, expect, test } from "bun:test"
import { createEffect, createSignal, flush } from "solid-js"
import {
  type Dictation,
  LogViewer,
  MetaLine,
  ToolStep,
  type Transcriber,
  TranscriberProvider,
  useDictation,
  WidgetMeters,
  WidgetStats,
} from "../src"
import { all, click, mount, one, tick } from "./dom"

let cleanup: Array<() => void> = []
afterEach(() => {
  for (const c of cleanup) c()
  cleanup = []
  document.body.innerHTML = ""
})
const track = <T extends { dispose: () => void }>(m: T) => {
  cleanup.push(m.dispose)
  return m
}

describe("lists keep their rows when the data is made afresh", () => {
  test("WidgetMeters and WidgetStats key their rows by label", () => {
    const [n, setN] = createSignal(10, { ownedWrite: true })
    const { root } = track(
      mount(() => (
        <div>
          <WidgetMeters
            label="Load"
            items={[
              { label: "CPU", value: n() },
              { label: "Memory", value: 50 },
            ]}
          />
          <WidgetStats items={[{ label: "p50", value: String(n()) }]} />
        </div>
      )),
    )
    const row = one(".nc-wmeters__row", root)
    const stat = one(".nc-wstats__item", root)
    setN(70)
    flush()
    expect(one(".nc-wmeters__row", root)).toBe(row)
    expect(one(".nc-wstats__item", root)).toBe(stat)
    expect(one("[role=progressbar]", row).getAttribute("aria-valuenow")).toBe("70")
    expect(stat.textContent).toContain("70")
  })

  test("LogViewer keys its lines by id", () => {
    const [entries, setEntries] = createSignal([{ id: 1, text: "boot" }], { ownedWrite: true })
    const { root } = track(mount(() => <LogViewer entries={entries()} />))
    const first = one("[data-part=log-line]", root)
    setEntries([
      { id: 1, text: "boot" },
      { id: 2, text: "ready" },
    ])
    flush()
    const lines = all("[data-part=log-line]")
    expect(lines.length).toBe(2)
    expect(lines[0]).toBe(first)
  })

  test("MetaLine keeps its parts by position", () => {
    const [who, setWho] = createSignal("Mira", { ownedWrite: true })
    const { root } = track(mount(() => <MetaLine items={[who(), "2h ago"]} />))
    const part = one(".nc-metaline__item", root)
    setWho("Jon")
    flush()
    expect(one(".nc-metaline__item", root)).toBe(part)
    expect(one("[data-part=meta-line]", root).textContent).toBe("Jon·2h ago")
  })
})

describe("one-time reads", () => {
  test("ToolStep opens with defaultOpen from data, and later data leaves it as the person set it", () => {
    const [status, setStatus] = createSignal<"error" | "ok">("error", { ownedWrite: true })
    const { root } = track(
      mount(() => (
        <ToolStep
          verb="Ran"
          arg="tests"
          status={status()}
          output="1 failed"
          defaultOpen={status() === "error"}
        />
      )),
    )
    const button = one("[aria-expanded]", root)
    expect(button.getAttribute("aria-expanded")).toBe("true")
    setStatus("ok")
    flush()
    expect(button.getAttribute("aria-expanded")).toBe("true")
    click(button)
    flush()
    expect(button.getAttribute("aria-expanded")).toBe("false")
  })

  test("a dictation started from an effect records", async () => {
    const transcriber: Transcriber = {
      available: () => true,
      start: async () => ({ finish: async () => "hello", cancel: () => {} }),
    }
    let voice!: Dictation
    const [ask, setAsk] = createSignal(0, { ownedWrite: true })
    const Probe = () => {
      voice = useDictation({ insert: () => {} })
      createEffect(ask, (n) => {
        if (n) void voice.start()
      })
      return <span data-test="phase">{voice.state().state}</span>
    }
    const { root } = track(
      mount(() => (
        <TranscriberProvider transcriber={transcriber}>
          <Probe />
        </TranscriberProvider>
      )),
    )
    setAsk(1)
    flush()
    await tick()
    flush()
    expect(one("[data-test=phase]", root).textContent).toBe("recording")
  })
})
