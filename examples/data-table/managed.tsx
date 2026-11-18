import { Button, DataTable, reorderItems, type SortState } from "@aiviarium/nocturne"
import { createSignal, Show } from "solid-js"
import { HOST_SESSIONS, SESSION_COLUMNS } from "../_kit/sessions"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Reorder, remove and a menu per row",
  note: "Drag a row to move it (a press that does not move opens it), or Alt and an arrow on a row. Sorting by a column turns reordering off: a sorted table's order is the column's. Cmd or Ctrl and a click selects, Shift a range; the checkboxes show on hover and while something is selected. Right-click a row, or press the Menu key or Shift+F10 on it: on a row of the selection the menu acts on all of it. Delete removes, with Undo.",
  surface: "none",
  toasts: true,
}

export default function ManagedTable() {
  const [rows, setRows] = createSignal(HOST_SESSIONS.slice(0, 6))
  const [selected, setSelected] = createSignal<string[]>([])
  const [sort, setSort] = createSignal<SortState | null>(null)
  const signal = (ids: string[]) => setSelected(ids.length ? [] : selected())
  return (
    <DataTable
      label="Sessions"
      rows={rows()}
      columns={SESSION_COLUMNS}
      getRowId={(r) => r.id}
      rowLabel={(r) => r.title}
      selectable
      selected={selected()}
      onSelectionChange={setSelected}
      sort={sort()}
      onSortChange={setSort}
      onReorder={(from, to) => setRows(reorderItems(rows(), from, to))}
      onRemove={(ids) => {
        const before = rows()
        setRows(before.filter((r) => !ids.includes(r.id)))
        return () => setRows(before)
      }}
      rowMenu={({ ids }) => {
        const n = ids.length > 1 ? ` ${ids.length}` : ""
        return [
          ...(ids.length > 1 ? [{ type: "label" as const, label: `${ids.length} selected` }] : []),
          ...(ids.length === 1 ? [{ id: "open", label: "Open", icon: "arrow-up-right" as const }] : []),
          { id: "signal", label: `Send signal${n}`, icon: "bolt" as const, onSelect: () => signal(ids) },
          { id: "copy", label: ids.length > 1 ? `Copy ${ids.length} IDs` : "Copy ID", icon: "link" as const },
          { type: "separator" },
          { id: "delete", label: `Delete${n}`, icon: "trash" as const, danger: true },
        ]
      }}
      onRowClick={() => {}}
      toolbar={
        <div class="nc-row ex-toolbar">
          <span class="nc-meta">{rows().length} sessions</span>
          <span class="ex-spacer" />
          <Show when={sort()}>
            <Button size="sm" variant="ghost" onClick={() => setSort(null)}>
              Unsort
            </Button>
          </Show>
        </div>
      }
      bulkActions={(picked) => (
        <Button size="sm" onClick={() => signal(picked.map((r) => r.id))}>
          Send signal
        </Button>
      )}
    />
  )
}
