// The demo (demo/) mounted in happy-dom: every place of its registry opens without an error or a warning, the parts
// the shell draws are on screen, and the docs site's links into the demo name real places.
import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { flush } from "solid-js"
import { DemoApp } from "../demo/app"
import { memoryRouter, memoryStorage, type ShellRegistry, type ShellScope } from "../src"
import { mount, tick } from "./dom"

/** Every address the registry names: each module, item, lens and place, and a place's first record. */
function addresses(shell: ShellRegistry): string[] {
  const out: string[] = []
  const flat = (places: any[]): any[] => places.flatMap((p) => [p, ...flat(p.children ?? [])])
  const walk = (scope: ShellScope, prefix: string[], item: unknown) => {
    const lenses = scope.lenses ?? [{ id: undefined, places: scope.places ?? [] }]
    for (const lens of lenses) {
      for (const place of flat(lens.places)) {
        const at = [...prefix, ...(lens.id ? [lens.id] : []), place.id]
        out.push(`/${at.join("/")}`)
        const first = place.records?.(item, undefined)?.[0]
        if (first) out.push(`/${[...at, first.id].join("/")}`)
        const entered = place.enters?.items?.(item)?.[0]
        if (entered) walk(place.enters, [...at, shell.idOf(place.enters, entered)], entered)
      }
    }
  }
  for (const m of shell.options.scopes) {
    out.push(`/${m.id}`)
    if (m.child) {
      const first = m.child.items?.()[0]
      if (first !== undefined) walk(m.child, [m.id, shell.idOf(m.child, first)], first)
    } else walk(m, [m.id], undefined)
  }
  return [...new Set(out)]
}

const problems: string[] = []
const original = { error: console.error, warn: console.warn }

beforeAll(() => {
  console.error = (...args: unknown[]) => problems.push(`error: ${args.map(String).join(" ")}`)
  console.warn = (...args: unknown[]) => problems.push(`warn: ${args.map(String).join(" ")}`)
})
afterAll(() => {
  console.error = original.error
  console.warn = original.warn
})
let mounted: Array<() => void> = []
afterEach(() => {
  for (const d of mounted) d()
  mounted = []
  document.body.innerHTML = ""
})

function start(path: string, stored: Record<string, string> = {}) {
  let shell!: ShellRegistry
  const view = mount(() => (
    <DemoApp
      router={memoryRouter(path)}
      storage={memoryStorage(stored)}
      onShell={(s) => {
        shell = s
      }}
    />
  ))
  mounted.push(view.dispose)
  return { shell }
}

const has = (part: string) => !!document.querySelector(`[data-part="${part}"]`)

describe("the demo", () => {
  test("opens every place without an error", async () => {
    const { shell } = start("/inbox")
    const failed: string[] = []
    const list = addresses(shell)
    expect(list.length).toBeGreaterThan(30)
    for (const path of list) {
      problems.length = 0
      try {
        shell.go(path)
        flush()
        await tick()
      } catch (e) {
        problems.push(`threw: ${(e as Error).message}`)
      }
      const main = document.querySelector("[data-part=shell-view]")
      if (!main?.textContent?.trim()) problems.push("the view is empty")
      if (problems.length) failed.push(`${path}: ${problems.join("; ")}`)
    }
    expect(failed).toEqual([])
  })

  test("shows the parts the shell draws", async () => {
    const { shell } = start("/projects/atlas/build/issues/WEB-142", { "demo/runsIn": "desktop" })
    await tick()
    for (const part of [
      "app-shell",
      "title-bar",
      "scope-path",
      "scope-box",
      "lens-switch",
      "history-arrows",
      "window-controls",
      "sidebar-header",
      "nav",
      "nav-item",
      "account-menu",
      "panel-rail",
      "shell-panel",
      "resize-handle",
      "trail",
    ])
      expect({ part, shown: has(part) }).toEqual({ part, shown: true })

    shell.setFilter("Iss")
    flush()
    expect(has("nav-match")).toBe(true)
    shell.setFilter("")

    shell.setPaletteOpen(true)
    flush()
    await tick()
    expect(has("command-palette")).toBe(true)
    shell.setPaletteOpen(false)
    flush()
  })

  test("plays a browser tab by default", async () => {
    start("/inbox")
    await tick()
    expect(has("history-arrows")).toBe(false)
    expect(has("window-controls")).toBe(false)
  })

  test("the site's links name real places", () => {
    const { shell } = start("/inbox")
    const dir = join(import.meta.dir, "../site/content")
    const files = (d: string): string[] =>
      readdirSync(d).flatMap((n) => {
        const p = join(d, n)
        return statSync(p).isDirectory() ? files(p) : n.endsWith(".mdx") ? [p] : []
      })
    const links = files(dir).flatMap((f) =>
      [...readFileSync(f, "utf8").matchAll(/<Demo(?:Link|Frame)\s+to="([^"]*)"/g)].map((m) => m[1]!),
    )
    expect(links.length).toBeGreaterThan(0)
    const bad = links.filter((to) => {
      const segs = to.split("/").filter(Boolean)
      const loc = shell.resolve(`/${to}`)
      // The address resolves to what it names: its last segment is the place, the view or the record.
      const named = [loc.place?.id, loc.view?.id, loc.record, ...loc.frames.map((f) => f.prefix.at(-1))]
      return segs.length > 0 && !named.includes(segs.at(-1))
    })
    expect(bad).toEqual([])
  })
})
