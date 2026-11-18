import { Card, IconButton, ListRow, RowList, SectionHeading } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Empty sections are not drawn",
  verdict: "do",
  note: "Home with no pins and no widgets shows what it has; adding a first widget is one small control.",
  surface: "well",
}

export default function EmptyNothing() {
  return (
    <div class="ex-col">
      <Card title="Jump back in">
        <RowList label="Recent">
          <ListRow icon="file" title="Host setup runbook" meta="4m" />
          <ListRow icon="terminal" title="Logs" meta="32m" />
        </RowList>
      </Card>
      <SectionHeading title="Widgets" action={<IconButton label="Add widget" icon="plus" />} />
    </div>
  )
}
