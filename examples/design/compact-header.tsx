import { IconButton, ListRow, RowList, State } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "One 38px bar, then content",
  verdict: "do",
  note: "The tab names the view; the header holds where it is and its actions.",
  surface: "well",
}

export default function CompactHeader() {
  return (
    <div class="ex-view">
      <div class="nc-row ex-bar">
        <span class="nc-meta">Atlas web</span>
        <span class="nc-meta">/</span>
        <span class="label">Issues</span>
        <span class="ex-spacer" />
        <IconButton size="sm" label="Filter" icon="filter" />
        <IconButton size="sm" label="More" icon="more" />
        <IconButton label="New issue" icon="plus" />
      </div>
      <RowList label="Issues">
        <ListRow
          icon="list"
          title="Sign-in loops behind a proxy"
          status={<State status="error">Blocked</State>}
          meta="2h"
        />
        <ListRow icon="list" title="Empty state for the activity feed" meta="1d" />
        <ListRow icon="list" title="Contrast of muted labels" meta="3d" />
        <ListRow icon="list" title="Move replicas behind the load balancer" meta="4d" />
      </RowList>
    </div>
  )
}
