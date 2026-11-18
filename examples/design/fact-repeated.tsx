import { Avatar, Badge, Card, MetaLine, PropertyList, State } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "The same fact three ways",
  verdict: "dont",
  note: "Blocked as a badge, a state and a line of meta; the assignee twice; “None” for an empty value; a badge saying it is an issue.",
}

export default function FactRepeated() {
  return (
    <Card title="Sign-in loops behind a proxy">
      <div class="nc-row">
        <Badge tone="outline">Issue</Badge>
        <Badge tone="danger">Blocked</Badge>
      </div>
      <MetaLine items={["Blocked", "assigned to Mira Okonkwo"]} />
      <PropertyList
        items={[
          { label: "State", value: <State status="error">Blocked</State> },
          {
            label: "Assignee",
            value: (
              <span class="nc-row nc-row--tight">
                <Avatar name="Mira Okonkwo" size="sm" /> Mira Okonkwo
              </span>
            ),
          },
          { label: "Cycle", value: "None" },
        ]}
      />
    </Card>
  )
}
