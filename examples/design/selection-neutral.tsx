import { DataTable } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import { HOST_SESSIONS, SESSION_COLUMNS } from "../_kit/sessions"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Selection is neutral",
  verdict: "do",
  note: "Selected rows take the faint neutral fill and their checkboxes a neutral mark; the bar over the table is neutral too. The accent is left for the focus ring, checked switches and the one primary action.",
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
