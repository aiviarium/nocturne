import { Card, EmptyState, ListRow, RowList } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A titled box for each empty section",
  note: "Two boxes that say there is nothing, taking more room than the one with content.",
  surface: "well",
}

export default function EmptyBoxes() {
  return (
    <div class="ex-col">
      <Card title="Jump back in">
        <RowList label="Recent">
          <ListRow icon="file" title="Host setup runbook" meta="4m" />
          <ListRow icon="terminal" title="Logs" meta="32m" />
        </RowList>
      </Card>
      <Card title="Pinned">
        <EmptyState size="sm" icon="star" title="No pinned items" description="Pin a view to see it here." />
      </Card>
      <Card title="Widgets">
        <EmptyState size="sm" icon="grid" title="No widgets yet" description="Add a widget to get started." />
      </Card>
    </div>
  )
}
