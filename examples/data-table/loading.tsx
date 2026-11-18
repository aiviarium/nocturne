import { DataTable } from "@aiviarium/nocturne"
import { SESSION_COLUMNS } from "../_kit/sessions"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Loading", surface: "none" }

export default function LoadingTable() {
  return (
    <DataTable
      label="Loading sessions"
      rows={[]}
      columns={SESSION_COLUMNS.slice(0, 4)}
      getRowId={(r) => r.id}
      loading
    />
  )
}
