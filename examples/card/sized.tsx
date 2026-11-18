import { Card, ListRow, MetaLine, RowList } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Sized to content", surface: "well" }

export default function SizedCards() {
  return (
    <div class="ex-grid ex-grid--3">
      <Card title="Jump back in" action={<a href="#card">All</a>}>
        <RowList label="Recent">
          <ListRow icon="file" title="Host setup runbook" secondary="Page" meta="4m" href="#card" />
          <ListRow icon="terminal" title="Logs" secondary="terminal on local" meta="32m" href="#card" />
        </RowList>
      </Card>
      <Card title="Notes" count={3}>
        <span class="nc-muted">A card with a heading and plain content.</span>
      </Card>
      <Card href="#card" title="Clickable card" label="Open the runbook">
        <MetaLine items={["Docs", "Engineering", "edited 4m ago"]} />
      </Card>
    </div>
  )
}
