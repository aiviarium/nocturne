import { IconButton, ListRow, RowList, State } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Shared edges",
  note: "Every row is a ListRow: icons on one edge, titles on one edge, status and meta on one trailing edge.",
}

export default function AlignedEdges() {
  return (
    <RowList label="Mixed">
      <ListRow icon="file" title="Launch plan" secondary="Page" meta="4m" />
      <ListRow
        icon="list"
        title="WEB-41 Empty state"
        secondary="Issue"
        status={<State status="warn">Needs you</State>}
        meta="1h"
      />
      <ListRow
        icon="agent"
        title="Fix the redirect loop"
        secondary="Session"
        meta="2h"
        actions={<IconButton size="sm" label="Archive" icon="archive" />}
      />
    </RowList>
  )
}
