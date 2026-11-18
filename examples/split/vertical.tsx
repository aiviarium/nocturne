import { Split } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Vertical", surface: "well" }

export default function VerticalSplit() {
  return (
    <div class="ex-fill">
      <Split
        orientation="vertical"
        defaultSize={110}
        min={60}
        max={200}
        first={<div class="ex-pad nc-muted">Editor</div>}
        second={<div class="ex-pad nc-muted">Terminal</div>}
      />
    </div>
  )
}
