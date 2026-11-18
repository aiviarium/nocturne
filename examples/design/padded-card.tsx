import { Card, ListRow, RowList } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Content stuck to the top of a box",
  note: "Cards given a height they do not fill: the empty half says nothing.",
  surface: "well",
}

export default function PaddedCard() {
  return (
    <div class="ex-grid ex-grid--2" style={{ "grid-auto-rows": "200px", "align-items": "stretch" }}>
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
