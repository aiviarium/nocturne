import { Avatar, Card, PropertyList, State } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Each fact once",
  note: "The state is in its row; the assignee once; nothing restates that this is an issue.",
}

export default function FactOnce() {
  return (
    <Card title="Sign-in loops behind a proxy">
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
          { label: "Cycle", value: "" },
        ]}
      />
    </Card>
  )
}
