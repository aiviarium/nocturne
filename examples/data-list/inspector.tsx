import { Card, DataList, PropertyList } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "In an inspector",
  note: "variant=\"inline\" drops the box: in a property's value the rows sit on the value's edge, 28px like the property rows.",
  surface: "well",
}

export default function InspectorEditor() {
  const [aliases, setAliases] = createSignal(["app-prod", "app-eu"])
  return (
    <div class="ex-inspector">
      <Card title="host-01">
        <PropertyList
          items={[
            { label: "Region", value: "eu-central" },
            {
              label: "Aliases",
              value: (
                <DataList
                  variant="inline"
                  label="Aliases"
                  itemName="Alias"
                  value={aliases()}
                  onChange={setAliases}
                  placeholder="Alias"
                  mono
                />
              ),
            },
            { label: "Owner", value: "Platform" },
          ]}
        />
      </Card>
    </div>
  )
}
