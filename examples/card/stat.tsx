import { Badge, StatCard } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Stat card",
  note: "In a row the cards share its height with `fill`, so their edges line up.",
  surface: "well",
}

export default function StatCards() {
  return (
    <div class="ex-grid ex-grid--3 ex-grid--fill">
      <StatCard
        fill
        label="Memory"
        value="11.2"
        unit="GB"
        signal={<span class="nc-meta">of 16 GB</span>}
        meter={{ value: 70 }}
      />
      <StatCard fill label="p95 latency" value="182" unit="ms" />
      <StatCard fill label="Deploys" value="14" signal={<Badge tone="success">+3</Badge>} />
    </div>
  )
}
