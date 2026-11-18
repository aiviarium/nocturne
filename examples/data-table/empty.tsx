import { DataTable } from "@aiviarium/nocturne"
import { SESSION_COLUMNS } from "../_kit/sessions"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Empty, with filters", surface: "none" }

export default function EmptyTable() {
  return (
    <DataTable
      label="Empty"
      rows={[]}
      columns={SESSION_COLUMNS.slice(0, 4)}
      getRowId={(r) => r.id}
      empty={{
        title: "No sessions match",
        description: "state: running · user: agent",
        onClearFilters: () => {},
      }}
    />
  )
}
