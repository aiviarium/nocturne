import { Badge, ListRow, RowList, State } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A state on every row, and a banner for the normal case",
  note: "“All good”, “Connected”, “Idle” and “Ready” on everything: the one row that needs you is one dot among many.",
}

export default function PermanentStatus() {
  return (
    <div class="ex-col">
      <div class="nc-row">
        <State status="ok">All good</State>
        <State status="live">Connected</State>
        <Badge tone="success">5 sessions healthy</Badge>
      </div>
      <RowList label="Sessions">
        <ListRow
          icon="sparkle"
          title="Fix the sign-in redirect loop"
          status={<State status="warn">Needs you</State>}
          meta="4m"
        />
        <ListRow
          icon="sparkle"
          title="Add a test for the task list"
          status={<State status="ai">Working</State>}
          meta="12m"
        />
        <ListRow
          icon="sparkle"
          title="Profile the activity page"
          status={<State status="ok">Ready</State>}
          meta="1h"
        />
        <ListRow
          icon="sparkle"
          title="Rename the deploy job"
          status={<State status="idle">Idle</State>}
          meta="2h"
        />
        <ListRow icon="sparkle" title="Upgrade Vite" status={<State status="live">Live</State>} meta="1d" />
      </RowList>
    </div>
  )
}
