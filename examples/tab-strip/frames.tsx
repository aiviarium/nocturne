import { Card, IconButton, type IconName, TabStrip } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "TabStrip",
  note: "Document tabs for a frame: icon, title, close. Drag a tab to the other strip, or focus one and press Alt+Arrow Left or Right. Right click (or the menu key) for the tab menu; a pinned tab is compact; a dot is unsaved changes; a spinner is loading. With many tabs they shrink, then scroll, and All tabs lists them.",
  surface: "well",
}

interface DemoTab {
  id: string
  label: string
  icon: IconName
  pinned?: boolean
  dirty?: boolean
  loading?: boolean
  detail?: string
}

const MANY: DemoTab[] = Array.from({ length: 24 }, (_, i) => ({
  id: `doc${i}`,
  label: i % 6 === 0 ? "Notes" : `Document ${i + 1}`,
  icon: "file" as IconName,
  detail: i % 6 === 0 ? `Team ${i / 6 + 1}` : undefined,
  dirty: i === 3,
}))

export default function TabStrips() {
  const [one, setOne] = createSignal<DemoTab[]>([
    { id: "home", label: "Home", icon: "home", pinned: true },
    { id: "hello", label: "Hello", icon: "file", dirty: true },
    { id: "logs", label: "Logs", icon: "terminal", loading: true },
    { id: "long", label: "A very long title that has to be cut with an ellipsis", icon: "file" },
  ])
  const [two, setTwo] = createSignal<DemoTab[]>([{ id: "agents", label: "Agents", icon: "agent" }])
  const [many, setMany] = createSignal<DemoTab[]>(MANY)
  const [active, setActive] = createSignal({ one: "home", two: "agents", many: "doc10" })
  const lists = { one: [one, setOne], two: [two, setTwo], many: [many, setMany] } as const
  const strip = (name: "one" | "two" | "many") => {
    const [items, set] = lists[name]
    return (
      <Card padding="none">
        <TabStrip
          label={`Frame ${name}`}
          stripId={name}
          dragGroup="gallery"
          items={items()}
          value={active()[name]}
          onChange={(id) => setActive({ ...active(), [name]: id })}
          onClose={(id) => set(items().filter((t) => t.id !== id))}
          menu={(id) => [
            { id: "close", label: "Close", icon: "close" },
            {
              id: "pin",
              label: items().find((t) => t.id === id)?.pinned ? "Unpin tab" : "Pin tab",
              icon: "star",
            },
            { type: "separator" },
            { id: "others", label: "Close others" },
          ]}
          onMenuSelect={(id, entry) => {
            if (entry === "close") set(items().filter((t) => t.id !== id))
            else if (entry === "others") set(items().filter((t) => t.id === id || t.pinned))
            else if (entry === "pin") set(items().map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t)))
          }}
          onNewTab={() => set([...items(), { id: `new${items().length}`, label: "New tab", icon: "home" }])}
          onDrop={(drop) => {
            const [fromItems, fromSet] = lists[drop.from as "one" | "two" | "many"]
            const from = fromItems()
            const moved = from.find((t) => t.id === drop.tabId)
            if (!moved) return
            const without = (list: typeof from) => list.filter((t) => t.id !== drop.tabId)
            const target = without(items())
            const at =
              drop.from === name
                ? drop.index - (from.findIndex((t) => t.id === drop.tabId) < drop.index ? 1 : 0)
                : drop.index
            target.splice(at, 0, moved)
            if (drop.from !== name) fromSet(without(from))
            set(target)
            setActive({ ...active(), [name]: moved.id })
          }}
          actions={<IconButton label="Split right" icon="sidebar" />}
        />
      </Card>
    )
  }
  return (
    <div class="ex-grid ex-grid--2">
      {strip("one")}
      {strip("two")}
      {strip("many")}
    </div>
  )
}
