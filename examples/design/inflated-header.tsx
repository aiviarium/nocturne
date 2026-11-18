import { Button, IconButton, ListRow, RowList, State } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A title bar and a toolbar",
  note: "The view's name again at 26px, actions in a row of their own: two bars before the first issue.",
  surface: "well",
}

export default function InflatedHeader() {
  return (
    <div class="ex-view">
      <div class="ex-bar ex-bar--inflated">
        <span class="ex-big-title">Issues</span>
        <span class="nc-meta">All issues in Atlas web</span>
      </div>
      <div class="nc-row ex-bar">
        <Button size="sm">Filter</Button>
        <Button size="sm">Sort</Button>
        <Button size="sm">Export</Button>
        <span class="ex-spacer" />
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
      </RowList>
    </div>
  )
}
