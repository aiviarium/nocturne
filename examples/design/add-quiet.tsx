import { Button, IconButton, ListRow, RowList, State } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A quiet plus to add; a filled button to finish",
  verdict: "do",
  note: "New issue is a ghost plus with its label as the tooltip, among the header's other actions. Create, in the dialog that follows, is the one primary.",
  surface: "well",
}

export default function AddQuiet() {
  return (
    <div class="ex-col">
      <div class="ex-view">
        <div class="nc-row ex-bar">
          <span class="nc-meta">Atlas web</span>
          <span class="nc-meta">/</span>
          <span class="label">Issues</span>
          <span class="ex-spacer" />
          <IconButton size="sm" label="Filter" icon="filter" />
          <IconButton size="sm" label="New issue" icon="plus" />
          <IconButton size="sm" label="More" icon="more" />
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
      <div class="nc-row">
        <span class="ex-spacer" />
        <Button size="sm">Cancel</Button>
        <Button size="sm" variant="primary">
          Create issue
        </Button>
      </div>
    </div>
  )
}
