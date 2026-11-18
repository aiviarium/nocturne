import { Split } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Second pane sized",
  note: '`fixed="second"` gives the size to the pane on the right, as for an inspector.',
  surface: "well",
}

export default function InspectorSplit() {
  return (
    <div class="ex-fill">
      <Split
        fixed="second"
        defaultSize={200}
        min={120}
        max={360}
        first={<div class="ex-pad nc-muted">Content</div>}
        second={<div class="ex-pad nc-muted">Inspector</div>}
      />
    </div>
  )
}
