import { Button, Card, ListRow, RowList, SectionHeading, State } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "One section heading, everywhere",
  verdict: "do",
  note: "SectionHeading: 13px semibold in a 24px row, a total in text-3, one action at the right.",
  surface: "well",
}

export default function OneHeading() {
  return (
    <Card>
      <SectionHeading title="Pull requests" count={3} />
      <RowList label="Pull requests">
        <ListRow
          icon="branch"
          title="Move the read replicas"
          status={<State status="error">Failing</State>}
        />
        <ListRow icon="branch" title="Raise the connection cap" />
      </RowList>
      <SectionHeading
        title="Agents"
        action={
          <Button size="sm" variant="ghost">
            All
          </Button>
        }
      />
      <RowList label="Agents">
        <ListRow icon="agent" title="Fix the redirect loop" status={<State status="warn">Needs you</State>} />
      </RowList>
    </Card>
  )
}
