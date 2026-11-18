import { Widget, WidgetProgress, WidgetSteps } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Progress",
  note: "A head of one row and the bar under it. A bar can name its ends; steps show where a run of stops is.",
  surface: "well",
}

export default function ProgressWidgets() {
  return (
    <div class="ex-grid ex-grid--3 ex-grid--fill">
      <Widget fill title="Upload" value="16 / 24">
        <WidgetProgress value={66} label="Upload progress" />
      </Widget>
      <Widget fill hue="info" title="Sync" value="148 MB">
        <WidgetProgress value={40} start="local" end="atlas-02" label="Sync progress" />
      </Widget>
      <Widget fill hue="success" title="Deploy" value="1:22">
        <WidgetSteps steps={["Build", "Test", "Canary", "Prod"]} current={2} label="Deploy steps" />
      </Widget>
    </div>
  )
}
