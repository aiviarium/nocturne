import { Tabs } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Segmented", note: "Switches the view of the same data." }

export default function SegmentedTabs() {
  return (
    <div class="ex-col" style={{ "align-items": "flex-start" }}>
      <Tabs
        label="Issue filter"
        items={[
          { id: "active", label: "Active" },
          { id: "backlog", label: "Backlog" },
          { id: "all", label: "All issues" },
        ]}
        defaultValue="all"
      />
      <Tabs
        label="Layout"
        items={[
          { id: "split", label: "Split" },
          { id: "unified", label: "Unified" },
        ]}
      />
    </div>
  )
}
