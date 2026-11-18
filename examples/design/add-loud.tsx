import { Button, IconButton, ListRow, RowList, State } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A filled button with a plus to add",
  verdict: "dont",
  note: "The loudest control on the screen starts something small, and says in words what its icon and tooltip already say.",
  surface: "well",
}

export default function AddLoud() {
  return (
    <div class="ex-view">
      <div class="nc-row ex-bar">
        <span class="nc-meta">Atlas web</span>
        <span class="nc-meta">/</span>
        <span class="label">Issues</span>
        <span class="ex-spacer" />
        <IconButton size="sm" label="Filter" icon="filter" />
        <IconButton size="sm" label="More" icon="more" />
        <Button size="sm" variant="primary" icon="plus">
          New issue
        </Button>
      </div>
      <RowList label="Issues">
        <ListRow
          icon="list"
          title="Sign-in loops behind a proxy"
          status={<State status="error">Blocked</State>}
          meta="2h"
        />
        <ListRow icon="list" title="Empty state for the activity feed" meta="1d" />
      </RowList>
    </div>
  )
}
