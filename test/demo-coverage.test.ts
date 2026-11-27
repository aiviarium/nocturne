// Every exported component has to be in the demo (demo/), in a real context, so it can be tried there. This reads
// the demo's imports from the library and fails for an exported component (a PascalCase function, class or
// context) that no demo file imports. The shell draws some parts itself, and the demo's smoke test checks those on
// screen (`DRAWN_BY_SHELL`). A few exports are not parts a view draws; they are listed with the reason.
import { describe, expect, test } from "bun:test"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import * as nocturne from "../src"

const DEMO = join(import.meta.dir, "../demo")

/** Parts the `Shell` draws from the registry: an app never renders them itself. */
export const DRAWN_BY_SHELL = [
  "AccountMenu",
  "AppShell",
  "CommandPalette",
  "EntryLead",
  "HistoryArrows",
  "LensCustomise",
  "LensSwitch",
  "MatchText",
  "Nav",
  "NavItem",
  "PanelRail",
  "ResizeHandle",
  "ScopeBox",
  "ScopePath",
  "ShellPanel",
  "SidebarHeader",
  "Switcher",
  "SwitcherList",
  "TitleBar",
  "Trail",
  "WindowControls",
] as const

/** Exports that are not parts a view draws, with the reason. Keep it short. */
export const NOT_A_PART: Record<string, string> = {
  OpenLayer: "counts an open popup for the shell's Esc stack; every popup part mounts it",
  MenuEntries: "draws a menu's entries inside DropdownMenu, Menu, RowMenu and ContextMenu",
  SwipeButton: "the swipe action ListRow, DataList and InsetRow draw from their `swipe` entries",
  ViewChrome: "a context the shell's frame provides to view headers",
  ViewHeaderSlot: "a context Dock provides so a header with only actions joins its tab strip",
  ViewLayoutState: "a context ViewLayout provides to the parts inside it",
  ViewLayoutHost: "a context Shell provides so a view that lacks room folds the sidebar",
  PhoneOverride: "a context PhoneFrame provides; the gallery sets it to show phone pieces on a desktop page",
  ScreenContext: "a context NavigationScreen provides to the parts inside it",
}

const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (name === "dist" || name === "node_modules") return []
    if (statSync(path).isDirectory()) return sources(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })

/** The names demo files import from the library. */
function imported(): Set<string> {
  const names = new Set<string>()
  const from = /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*["']@aiviarium\/nocturne["']/g
  for (const file of sources(DEMO)) {
    for (const m of readFileSync(file, "utf8").matchAll(from)) {
      for (const spec of m[1]!.split(",")) {
        const name = spec
          .trim()
          .replace(/^type\s+/, "")
          .split(/\s+as\s+/)[0]!
          .trim()
        if (name) names.add(name)
      }
    }
  }
  return names
}

/** The library's exported parts: PascalCase values that are functions, classes or contexts. */
function parts(): string[] {
  return Object.entries(nocturne)
    .filter(([name, value]) => /^[A-Z][a-z]/.test(name) && (typeof value === "function" || isContext(value)))
    .map(([name]) => name)
    .sort()
}
const isContext = (v: unknown) => !!v && typeof v === "object" && "id" in v && "defaultValue" in v

describe("the demo", () => {
  test("uses every exported part", () => {
    const used = imported()
    const exempt = new Set<string>([...DRAWN_BY_SHELL, ...Object.keys(NOT_A_PART)])
    const missing = parts().filter((name) => !used.has(name) && !exempt.has(name))
    expect(missing).toEqual([])
  })

  test("lists only real exports as exempt", () => {
    const all = new Set(Object.keys(nocturne))
    const stale = [...DRAWN_BY_SHELL, ...Object.keys(NOT_A_PART)].filter((name) => !all.has(name))
    expect(stale).toEqual([])
  })

  test("doesn't import an exempt part it could list as used", () => {
    const used = imported()
    expect(Object.keys(NOT_A_PART).filter((name) => used.has(name))).toEqual([])
  })
})
