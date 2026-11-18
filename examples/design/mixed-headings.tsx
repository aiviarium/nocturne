import { Button, Card, ListRow, RowList, State } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Each module its own heading",
  verdict: "dont",
  note: "A 20px title from one module, a 16px one from another, a capitalised label from a third: the page reads as three apps.",
  surface: "well",
}

export default function MixedHeadings() {
  return (
    <Card>
      <div class="ex-col">
        <h3 class="ex-section-title">Pull Requests (3)</h3>
        <RowList label="Pull requests">
          <ListRow
            icon="branch"
            title="Move the read replicas"
            status={<State status="error">Failing</State>}
          />
          <ListRow icon="branch" title="Raise the connection cap" />
        </RowList>
        <div class="nc-row">
          <h3 class="ex-section-title ex-section-title--16">My Agents</h3>
          <span class="ex-spacer" />
          <Button size="lg">View all agents</Button>
        </div>
        <RowList label="Agents">
          <ListRow
            icon="agent"
            title="Fix the redirect loop"
            status={<State status="warn">Needs you</State>}
          />
        </RowList>
      </div>
    </Card>
  )
}
