import { Split } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Horizontal",
  note: "Drag the divider, or focus it and use the arrow keys, Home and End. Double-click resets.",
  surface: "well",
}

export default function HorizontalSplit() {
  const [size, setSize] = createSignal(240)
  return (
    <div class="ex-col">
      <div class="ex-fill">
        <Split
          size={size()}
          onResize={setSize}
          min={140}
          max={420}
          first={<div class="ex-pad nc-muted">Sidebar</div>}
          second={<div class="ex-pad nc-muted">Content</div>}
        />
      </div>
      <span class="nc-meta">First pane: {size()}px</span>
    </div>
  )
}
