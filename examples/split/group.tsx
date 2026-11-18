import { SplitGroup } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Any number of panes",
  note: "Frames side by side: each divider moves space between the two panes beside it. Double-click equalises that pair.",
  surface: "well",
}

export default function Frames() {
  const [weights, setWeights] = createSignal([1, 1, 1])
  return (
    <div class="ex-fill">
      <SplitGroup
        items={["Frame one", "Frame two", "Frame three"]}
        weights={weights()}
        onResize={setWeights}
        min={80}
        label={(i) => `Resize frames ${i} and ${i + 1}`}
      >
        {(name) => <div class="ex-pad nc-muted">{name}</div>}
      </SplitGroup>
    </div>
  )
}
