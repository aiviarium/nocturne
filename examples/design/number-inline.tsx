import { NumberField, PropertyList } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Inline numbers in a property list",
  verdict: "do",
  note: "The inline variant reads as a value, keeps the 28px row and lines up with the text values.",
}

export default function NumberInline() {
  return (
    <PropertyList
      items={[
        {
          label: "Estimate",
          value: <NumberField variant="inline" aria-label="Estimate" defaultValue={3} unit="pt" />,
        },
        {
          label: "Budget",
          value: <NumberField variant="inline" aria-label="Budget" defaultValue={12} unit="h" />,
        },
        { label: "Cycle", value: "Cycle 12" },
      ]}
    />
  )
}
