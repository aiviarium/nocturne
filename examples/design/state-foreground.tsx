import { ListRow, RowList, State } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Hue in the dot and the word",
  verdict: "do",
  note: "The rows stay on the neutral surface; a failing check is a red dot and a red word.",
}

export default function StateForeground() {
  return (
    <RowList label="Pull requests">
      <ListRow
        icon="branch"
        title="Move the read replicas"
        status={<State status="error">Failing</State>}
        meta="36m"
      />
      <ListRow
        icon="branch"
        title="Raise the connection cap"
        status={<State status="warn">Changes requested</State>}
        meta="40m"
      />
      <ListRow icon="branch" title="Contrast of muted labels" meta="2h" />
    </RowList>
  )
}
