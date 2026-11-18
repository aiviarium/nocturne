import { ListRow, RowList, State } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Only what is out of the ordinary",
  verdict: "do",
  note: "One session needs you and one is working; the rest say nothing, so the two stand out.",
}

export default function ExceptionalStatus() {
  return (
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
      <ListRow icon="sparkle" title="Profile the activity page" meta="1h" />
      <ListRow icon="sparkle" title="Rename the deploy job" meta="2h" />
      <ListRow icon="sparkle" title="Upgrade Vite" meta="1d" />
    </RowList>
  )
}
