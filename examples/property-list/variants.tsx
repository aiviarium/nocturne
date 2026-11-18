import { Avatar, Badge, Card, PropertyList, State } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Fixed and sized-to-content labels", surface: "well" }

export default function PropertyLists() {
  return (
    <div class="ex-grid ex-grid--2">
      <Card title="Properties">
        <PropertyList
          items={[
            { label: "State", value: <State status="ai">In progress</State> },
            {
              label: "Assignee",
              value: (
                <span class="nc-row nc-row--tight">
                  <Avatar name="Mira Okonkwo" size="sm" /> Mira Okonkwo
                </span>
              ),
            },
            { label: "Labels", value: <Badge tone="outline">Bug</Badge> },
            { label: "Cycle", value: "" },
            { label: "Branch", value: <span class="nc-mono">feat/replicas</span> },
          ]}
        />
      </Card>
      <Card title="Labels sized to content">
        <PropertyList
          labelWidth="auto"
          items={[
            { label: "Created", value: "4 Nov" },
            { label: "Updated by", value: "Jonas" },
          ]}
        />
      </Card>
    </div>
  )
}
