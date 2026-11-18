import { Count, Delta, IdBadge, Kbd, KbdGroup } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Counts, deltas, IDs, shortcuts" }

export default function CountsAndIds() {
  return (
    <div class="nc-row">
      <Count value={2} />
      <Count value={33} />
      <Count value={140} />
      <Delta direction="up" value="4.2%" />
      <Delta direction="down" value="8%" />
      <Delta direction="down" value="1.1%" sentiment="good" />
      <IdBadge>TSK-41</IdBadge>
      <Kbd keys="Ctrl K" />
      <KbdGroup keys={["Ctrl", "Shift", "P"]} />
    </div>
  )
}
