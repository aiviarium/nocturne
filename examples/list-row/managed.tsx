import { Button, IconButton, ListRow, type RowKey, RowList, reorderItems } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A list the person manages",
  note: "A click opens a row; Cmd or Ctrl and a click adds it to the selection, Shift and a click selects the range, Shift and an arrow extends it, Space toggles the focused row, Cmd or Ctrl+A selects all and Escape clears. The bar at the foot appears only while something is selected. Drag a row to move it. Delete removes the focused row (or the selection) with Undo, and so does Delete in its menu; F2 or a double click renames.",
  toasts: true,
}

interface Page {
  id: string
  title: string
  kind: string
  edited: string
}

const PAGES: Page[] = [
  { id: "p1", title: "Launch plan", kind: "Page", edited: "4m" },
  { id: "p2", title: "Release notes 0.9", kind: "Page", edited: "1h" },
  { id: "p3", title: "On-call handbook", kind: "Page", edited: "2h" },
  { id: "p4", title: "Design review, Nov", kind: "Meeting notes", edited: "Yesterday" },
  { id: "p5", title: "Pricing experiments", kind: "Page", edited: "3d" },
  { id: "p6", title: "Hiring loop", kind: "Page", edited: "1w" },
]

let next = 7

export default function Managed() {
  const [pages, setPages] = createSignal(PAGES)
  const [selected, setSelected] = createSignal<RowKey[]>([])
  const rename = (id: string, title: string) =>
    setPages(pages().map((p) => (p.id === id ? { ...p, title } : p)))
  return (
    <RowList
      label="Pages"
      items={pages()}
      getKey={(p) => p.id}
      itemLabel={(p) => p.title}
      selectable
      selected={selected()}
      onSelectedChange={setSelected}
      onReorder={(from, to) => setPages(reorderItems(pages(), from, to))}
      onRemove={(keys) => {
        const before = pages()
        setPages(before.filter((p) => !keys.includes(p.id)))
        return () => setPages(before)
      }}
      bulkActions={(items) => (
        <Button size="sm" variant="ghost" icon="archive" onClick={() => setSelected([])}>
          Archive {items.length}
        </Button>
      )}
      onAdd={() =>
        setPages([...pages(), { id: `p${next++}`, title: "Untitled", kind: "Page", edited: "now" }])
      }
      addLabel="New page"
    >
      {(p) => (
        <ListRow
          icon="file"
          title={p.title}
          secondary={p.kind}
          meta={p.edited}
          onClick={() => {}}
          onRename={(title) => rename(p.id, title)}
          actions={<IconButton size="sm" label="Share" icon="link" />}
        />
      )}
    </RowList>
  )
}
