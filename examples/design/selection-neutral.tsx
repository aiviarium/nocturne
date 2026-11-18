import { DataTable } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import { HOST_SESSIONS, SESSION_COLUMNS } from "../_kit/sessions"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Selection is neutral",
  note: "Selected rows take the neutral fill and their checkboxes a neutral mark; the bar over the table is neutral too. The accent is left for what acts and what is new: buttons, links, the focus ring, unread dots.",
  surface: "none",
}

export default function SelectionNeutral() {
  const rows = HOST_SESSIONS.slice(0, 4)
  const [selected, setSelected] = createSignal<string[]>([rows[0]?.id ?? "", rows[2]?.id ?? ""])
  return (
    <DataTable
      label="Sessions"
      rows={rows}
      columns={SESSION_COLUMNS}
      getRowId={(r) => r.id}
      rowLabel={(r) => r.title}
      selectable
      selected={selected()}
      onSelectionChange={setSelected}
      onRowClick={() => {}}
    />
  )
}
