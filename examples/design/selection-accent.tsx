import { DataTable } from "@aiviarium/nocturne"
import { HOST_SESSIONS, SESSION_COLUMNS } from "../_kit/sessions"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Selection in the accent",
  note: "Rows, checkboxes and the bar in the accent's tint: the selection outshouts the primary button and the unread dots, and a list with many rows selected turns into a block of colour.",
  surface: "none",
}

export default function SelectionAccent() {
  const rows = HOST_SESSIONS.slice(0, 4)
  return (
    <div class="ex-selection-accent">
      <style>{`
        .ex-selection-accent .nc-table tr[aria-selected="true"] td { background: var(--accent-tint); }
        .ex-selection-accent .nc-table__check > .nc-check[aria-checked="true"] { border-color: var(--accent-strong); background: var(--accent-strong); }
        .ex-selection-accent .nc-bulkbar { border-bottom-color: var(--accent-line); background: var(--accent-tint); color: var(--accent-text); }
      `}</style>
      <DataTable
        label="Sessions"
        rows={rows}
        columns={SESSION_COLUMNS}
        getRowId={(r) => r.id}
        rowLabel={(r) => r.title}
        selectable
        selected={[rows[0]?.id ?? "", rows[2]?.id ?? ""]}
        onRowClick={() => {}}
      />
    </div>
  )
}
