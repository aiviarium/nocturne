import {
  IconButton,
  Widget,
  WidgetControls,
  WidgetGauge,
  WidgetSparkline,
  WidgetTimer,
  WidgetUptime,
} from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Timer, sparkline, gauge and uptime",
  note: "Widgets side by side share the row's height with `fill`: the sparkline grows into it, the uptime strip and its caption sit at the bottom.",
  surface: "well",
}

const SPARK = [
  18, 22, 20, 28, 31, 26, 35, 40, 38, 44, 41, 52, 49, 58, 54, 63, 60, 68, 72, 66, 74, 80, 77, 85, 88, 82, 90,
  94, 91, 100,
]
const DAYS = Array.from({ length: 30 }, (_, i) =>
  i === 11 ? ("down" as const) : i === 12 ? ("none" as const) : ("up" as const),
)

export default function ChartWidgets() {
  return (
    <div class="ex-grid ex-grid--2 ex-grid--fill">
      <WidgetTimer
        fill
        hue="warning"
        title="Focus"
        value="18:24"
        progress={16 / 26}
        scale={["0", "10", "20", "30 min"]}
        label="Focus timer"
      >
        <WidgetControls>
          <IconButton label="Stop" icon="close" tooltip={false} />
          <IconButton class="nc-wcontrols__primary" label="Pause" icon="pause" tooltip={false} />
          <IconButton label="Add five minutes" icon="plus" tooltip={false} />
        </WidgetControls>
      </WidgetTimer>
      <Widget fill title="Requests" value="1,284 / min" caption="−60m … Now">
        <WidgetSparkline values={SPARK} label="Requests per minute, last hour" />
      </Widget>
      <Widget fill hue="info" title="CPU load" value="4 cores" caption="Peak 81% · 2h ago">
        <WidgetGauge value={64} label="CPU load" />
      </Widget>
      <Widget fill hue="success" title="Uptime · 30 days" value="99.94%" caption="30d ago … Today">
        <WidgetUptime days={DAYS} label="Uptime, last 30 days" />
      </Widget>
    </div>
  )
}
