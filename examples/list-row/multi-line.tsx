import { ListRow, MetaLine, RowList, State } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Two and three lines",
  note: "For rows that carry more, such as a pull request: the detail line is a MetaLine. Hairlines between rows with `divided`.",
}

export default function MultiLineRows() {
  return (
    <RowList label="Pull requests" divided>
      <ListRow
        lines={3}
        icon="branch"
        title="Move the read replicas behind the shared load balancer"
        secondary="acme/gateway#1 · opened by jonas"
        detail={<MetaLine items={[{ label: "feat/replicas", mono: true }, "2 checks failed", "1 review"]} />}
        status={<State status="error">Failing</State>}
        meta="36m"
        onClick={() => {}}
      />
      <ListRow
        lines={2}
        icon="branch"
        title="Raise the connection cap and alert at 30"
        secondary="acme/gateway#2 · opened by mira"
        status={<State status="ok">Approved</State>}
        meta="40m"
        unread
        onClick={() => {}}
      />
      <ListRow
        lines={2}
        icon="branch"
        title="Contrast of the muted labels"
        secondary="acme/shell#3 · draft"
        meta="2h"
        muted
        onClick={() => {}}
      />
    </RowList>
  )
}
