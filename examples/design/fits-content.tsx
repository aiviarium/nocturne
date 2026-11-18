import { Card, ListRow, RowList } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "As tall as its content",
  note: "Two recent pages, a card that ends where they end.",
  surface: "well",
}

export default function FitsContent() {
  return (
    <div class="ex-grid ex-grid--2">
      <Card title="Jump back in">
        <RowList label="Recent">
          <ListRow icon="file" title="Host setup runbook" meta="4m" />
          <ListRow icon="terminal" title="Logs" meta="32m" />
        </RowList>
      </Card>
      <Card title="Notes" count={1}>
        <span class="nc-muted">Ask Jonas about the replica cut-over.</span>
      </Card>
    </div>
  )
}
