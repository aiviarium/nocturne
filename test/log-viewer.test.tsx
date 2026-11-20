import { afterEach, describe, expect, test } from "bun:test"
import { createSignal } from "solid-js"
import { type LogEntry, LogViewer } from "../src"
import { click, mount, one } from "./dom"

let cleanup: Array<() => void> = []
const track = <T extends { dispose: () => void }>(m: T): T => {
  cleanup.push(m.dispose)
  return m
}

afterEach(() => {
  for (const fn of cleanup) fn()
  cleanup = []
  document.body.innerHTML = ""
})

describe("LogViewer", () => {
  test("renders entries, stream state, timestamps, and empty fallback", () => {
    const [entries, setEntries] = createSignal<LogEntry[]>([])
    const { root } = track(
      mount(() => (
        <LogViewer
          title="Job output"
          streamState="live"
          entries={entries()}
          showTimestamps
          empty="Waiting for output..."
        />
      )),
    )

    const viewer = one("[data-part=log-viewer]", root)
    expect(one("[data-part=stream-state]", viewer).getAttribute("data-state")).toBe("live")
    expect(one("[data-part=log-empty]", viewer).textContent).toBe("Waiting for output...")

    setEntries([
      { id: 1, at: "2026-11-19T09:12:34Z", level: "info", text: "Step one" },
      { id: 2, at: "2026-11-19T09:12:35Z", level: "warn", text: "Heads up" },
      { id: 3, at: "2026-11-19T09:12:36Z", level: "error", text: "Failed to bind" },
    ])

    const lines = Array.from(viewer.querySelectorAll("[data-part=log-line]"))
    expect(lines).toHaveLength(3)
    expect(lines[0]?.getAttribute("data-level")).toBe("info")
    expect(lines[1]?.getAttribute("data-level")).toBe("warn")
    expect(lines[2]?.getAttribute("data-level")).toBe("error")
    expect(lines[0]?.querySelector(".nc-log__time")).not.toBeNull()
    expect(lines[2]?.textContent).toContain("Failed to bind")
  })

  test("toggles line wrapping and copies plain-text entries", async () => {
    let copied = ""
    const entries: LogEntry[] = [
      { id: 1, text: "first line" },
      { id: 2, text: "second line" },
    ]
    const { root } = track(
      mount(() => (
        <LogViewer
          entries={entries}
          onCopy={(text) => {
            copied = text
          }}
        />
      )),
    )

    const viewer = one("[data-part=log-viewer]", root)
    const wrapBtn = one<HTMLButtonElement>("[data-part=log-wrap]", viewer)
    expect(viewer.hasAttribute("data-wrap")).toBe(false)
    click(wrapBtn)
    expect(viewer.hasAttribute("data-wrap")).toBe(true)
    expect(wrapBtn.getAttribute("aria-pressed")).toBe("true")

    const copyBtn = one<HTMLButtonElement>("[data-part=log-copy]", viewer)
    click(copyBtn)
    // The copy is async: `writeText` settles in a microtask of its own, so wait a task.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(copied).toBe("first line\nsecond line")
  })

  test("pauses following when scrolled up and resumes on jump to bottom", () => {
    const entries: LogEntry[] = [
      { id: 1, text: "line 1" },
      { id: 2, text: "line 2" },
    ]
    const { root } = track(mount(() => <LogViewer entries={entries} />))
    const viewer = one("[data-part=log-viewer]", root)
    const body = one<HTMLDivElement>("[data-part=log-body]", viewer)

    Object.defineProperty(body, "scrollHeight", { value: 600, configurable: true })
    Object.defineProperty(body, "clientHeight", { value: 200, configurable: true })
    body.scrollTop = 100
    body.dispatchEvent(new Event("scroll"))

    expect(viewer.hasAttribute("data-following")).toBe(false)
    const jump = one<HTMLButtonElement>("[data-part=log-jump]", viewer)
    click(jump)

    expect(viewer.hasAttribute("data-following")).toBe(true)
    expect(body.scrollTop).toBe(600)
    expect(viewer.querySelector("[data-part=log-jump]")).toBeNull()
  })
})
