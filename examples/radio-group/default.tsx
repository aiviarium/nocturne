import { RadioGroup } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Radio group", note: "Picks one of a few visible options." }

export default function RadioGroups() {
  return (
    <div class="ex-col">
      <RadioGroup
        label="View"
        defaultValue="board"
        vertical
        options={[
          { value: "board", label: "Board" },
          { value: "list", label: "List" },
          { value: "table", label: "Table" },
        ]}
      />
      <RadioGroup
        label="Density"
        defaultValue="compact"
        options={[
          { value: "compact", label: "Compact" },
          { value: "comfortable", label: "Comfortable" },
        ]}
      />
    </div>
  )
}
