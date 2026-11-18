import { Badge, Delta, StatCard } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Rows of three",
  note: "Cards in a row share edges and baselines: each fills the row's height (`fill`), the meter at the bottom.",
  surface: "well",
}

export default function StatRow() {
  return (
    <div class="ex-grid ex-grid--3 ex-grid--fill">
      <StatCard
        fill
        label="Active users"
        signal={<Delta direction="up" value="4.2%" />}
        value="12,480"
        meter={{ value: 72 }}
      />
      <StatCard
        fill
        label="Memory"
        signal={<span class="nc-meta">16 GB</span>}
        value="11.2"
        unit="GB"
        meter={{ value: 70, tone: "info" }}
      />
      <StatCard
        fill
        label="Response time"
        signal={<Delta direction="down" value="8%" sentiment="bad" />}
        value="1.4"
        unit="s"
        meter={{ value: 100, tone: "danger" }}
      />
      <StatCard
        fill
        label="Disk"
        signal={<Badge tone="warning">Almost full</Badge>}
        value="82"
        unit="of 100 GB"
        meter={{ value: 82, tone: "warning" }}
      />
      <StatCard
        fill
        label="Uptime"
        signal={<span class="nc-meta">30 days</span>}
        value="99.94"
        unit="%"
        meter={{ value: 99.94, tone: "success" }}
      />
      <StatCard
        fill
        label="Error rate"
        signal={<Delta direction="down" value="0.01" sentiment="good" />}
        value="0.04"
        unit="%"
        meter={{ value: 4, tone: "success" }}
      />
    </div>
  )
}
