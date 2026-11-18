import { type DataColumn, DataTable, State } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { surface: "none", title: "Table" }

interface Row {
  id: string
  name: string
  state: "live" | "error" | "neutral"
  word: string
  ago: string
  out: string
}
const ROWS: Row[] = [
  { id: "s_7f2a", name: "Coding agent", state: "live", word: "running", ago: "15m ago", out: "3.4 MB" },
  { id: "s_7c44", name: "build", state: "error", word: "exit 1", ago: "1h ago", out: "2.1 MB" },
  { id: "s_7d10", name: "update", state: "neutral", word: "exit 0", ago: "1h ago", out: "0.6 MB" },
]
const COLS: DataColumn<Row>[] = [
  { id: "id", header: "ID", accessor: (r) => r.id, type: "mono" },
  { id: "name", header: "Session", accessor: (r) => r.name, sortable: true },
  { id: "state", header: "State", cell: (r) => <State status={r.state}>{r.word}</State> },
  { id: "ago", header: "Started", accessor: (r) => r.ago, type: "time" },
  { id: "out", header: "Output", accessor: (r) => r.out, type: "num" },
]

export default function Table() {
  return (
    <div class="ex-col">
      <DataTable label="Sessions" rows={ROWS} columns={COLS} getRowId={(r) => r.id} selectable />
    </div>
  )
}
