import { DataTable } from "@aiviarium/nocturne"
import { SESSION_COLUMNS } from "../_kit/sessions"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Error", surface: "none" }

export default function ErrorTable() {
  return (
    <DataTable
      label="Error"
      rows={[]}
      columns={SESSION_COLUMNS.slice(0, 4)}
      getRowId={(r) => r.id}
      error={{
        code: "502",
        message: "Can't reach host build-01",
        detail: "Last seen 4 min ago over SSH",
        onRetry: () => {},
      }}
    />
  )
}
