import { Card, IconButton, ListRow, Panel, RowList, State } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Padding none, and the panel",
  note: "A table or media runs to the edge with padding none. A Panel is a tool region with a 38px header; its body has the same 12px padding.",
  surface: "well",
}

export default function PaddingNone() {
  return (
    <div class="ex-grid ex-grid--2">
      <Card padding="none" title="Hosts">
        <RowList label="Hosts">
          <ListRow icon="server" title="build-01" status={<State status="error">Unreachable</State>} />
          <ListRow icon="server" title="build-02" meta="4 sessions" />
        </RowList>
      </Card>
      <Panel title="Logs" actions={<IconButton label="Filter" icon="filter" />}>
        <span class="nc-muted">Body padded by the same rule.</span>
      </Panel>
    </div>
  )
}
