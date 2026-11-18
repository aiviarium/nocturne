import { Delta, StatCard, StreamState, Widget, WidgetProgress } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { surface: "none", title: "Metrics and live" }

export default function MetricsAndLive() {
  return (
    <div class="ex-col">
      <div class="ex-grid ex-grid--2">
        <StatCard
          label="Active users"
          signal={<Delta direction="up" value="4.2%" />}
          value="12,480"
          meter={{ value: 72 }}
        />
        <StatCard
          label="Memory"
          signal={<span class="nc-meta">16 GB</span>}
          value="11.2"
          unit="GB"
          meter={{ value: 70, tone: "info" }}
        />
      </div>
      <div class="nc-row">
        <StreamState state="live" />
        <StreamState state="resuming" offset={2203648} />
        <StreamState state="dropped" lost="12 KB" />
        <StreamState state="error" code="504 timeout" />
      </div>
      <Widget title="Uploading 24 files" value="ETA 2 min" caption="16 of 24 · 148 MB">
        <WidgetProgress value={66} label="Upload progress" />
      </Widget>
    </div>
  )
}
