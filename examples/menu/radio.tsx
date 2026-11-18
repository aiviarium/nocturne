import { Menu } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Group labels, disabled, radio", surface: "well" }

export default function SortMenu() {
  return (
    <div class="ex-narrow">
      <Menu
        label="Sort"
        radio
        autoFocus={false}
        items={[
          { type: "label", label: "Sort by" },
          { id: "updated", label: "Last updated", checked: true },
          { id: "created", label: "Created" },
          { id: "title", label: "Title", disabled: true },
          { type: "separator" },
          { type: "label", label: "Direction" },
          { id: "asc", label: "Ascending" },
          { id: "desc", label: "Descending", checked: true },
        ]}
      />
    </div>
  )
}
