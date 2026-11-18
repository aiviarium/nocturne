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
  title: "Timers, sparklines, a gauge and uptime",
  note: "The number leads where its unit names it. Axis labels under a chart replace a caption. Widgets side by side share the row's height with `fill`.",
  surface: "well",
}

const REQUESTS = [
  18, 22, 20, 28, 31, 26, 35, 40, 38, 44, 41, 52, 49, 58, 54, 63, 60, 68, 72, 66, 74, 80, 77, 85, 88, 82, 90,
  94, 91, 100,
]
const TOKENS = [
  12, 30, 22, 48, 36, 60, 44, 70, 52, 38, 64, 80, 58, 46, 72, 90, 66, 54, 40, 62, 84, 70, 50, 34, 58, 76, 60,
  44, 68, 52,
]
const DAYS = Array.from({ length: 30 }, (_, i) =>
  i === 11 ? ("down" as const) : i === 12 ? ("none" as const) : ("up" as const),
)

export default function ChartWidgets() {
  return (
    <div class="ex-grid ex-grid--3 ex-grid--fill">
      <WidgetTimer
        fill
        hue="warning"
        title="Focus"
        value="18:24"
        progress={16 / 28}
        scale={["0", "10", "20", "30"]}
        label="Focus timer"
      >
        <WidgetControls>
          <IconButton label="Stop" icon="close" tooltip={false} />
          <IconButton class="nc-wcontrols__primary" label="Pause" icon="pause" tooltip={false} />
          <IconButton label="Add five minutes" icon="plus" tooltip={false} />
        </WidgetControls>
      </WidgetTimer>
      <Widget fill figure="48" unit="tok/s" value="p50 41" label="Tokens per second" axis={["-5m", "Now"]}>
        <WidgetSparkline variant="wave" values={TOKENS} label="Tokens per second, last five minutes" />
      </Widget>
      <Widget fill title="Requests" value="1,284" unit="/ min" axis={["-60m", "-30m", "Now"]}>
        <WidgetSparkline values={REQUESTS} label="Requests per minute, last hour" />
      </Widget>
      <WidgetTimer
        fill
        hue="danger"
        title="Build"
        value="18s"
        progress={0.6}
        ticks={24}
        scale={["0", "10", "20", "30"]}
        label="Build time"
      >
        <IconButton label="Cancel the build" icon="close" tooltip={false} />
      </WidgetTimer>
      <Widget fill hue="info" title="CPU" value="4 cores">
        <WidgetGauge value={64} label="CPU load" />
      </Widget>
      <Widget fill hue="success" title="Uptime" value="99.94%" axis={["30d", "Today"]}>
        <WidgetUptime days={DAYS} label="Uptime, last 30 days" />
      </Widget>
    </div>
  )
}
