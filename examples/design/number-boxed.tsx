import { NumberField, PropertyList } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Form fields in a property list",
  verdict: "dont",
  note: "Boxed 30px fields with steppers outweigh the values around them, push the rows apart and break the value edge.",
}

export default function NumberBoxed() {
  return (
    <PropertyList
      items={[
        {
          label: "Estimate",
          value: <NumberField aria-label="Estimate" defaultValue={3} unit="pt" steppers />,
        },
        { label: "Budget", value: <NumberField aria-label="Budget" defaultValue={12} unit="h" steppers /> },
        { label: "Cycle", value: "Cycle 12" },
      ]}
    />
  )
}
