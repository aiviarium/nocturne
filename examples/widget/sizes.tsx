import { ContextWidget, RateWidget } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "One widget, several sizes",
  note: "The same reading at the sizes it offers, as on a home screen: one line for a status column, a slim bar or a chart for a side panel, the full account for a dashboard. A widget offers only the sizes that suit it.",
  surface: "well",
}

const PARTS = [
  { label: "System", value: 9_000, display: "9k" },
  { label: "Tools", value: 21_000, display: "21k" },
  { label: "Files", value: 38_000, display: "38k" },
  { label: "Chat", value: 56_000, display: "56k" },
]
const RATE = [
  20, 34, 28, 46, 40, 58, 50, 66, 54, 42, 60, 72, 64, 48, 70, 82, 68, 56, 44, 62, 76, 66, 52, 40, 60, 74, 58,
  46, 64, 52,
]
const STATS = [
  { label: "p50", value: "48" },
  { label: "Peak", value: "82" },
  { label: "Today", value: "1.2M" },
]

export default function WidgetSizes() {
  return (
    <div class="ex-grid ex-grid--2">
      <div class="ex-col">
        <ContextWidget size="row" used={124_000} total={200_000} parts={PARTS} />
        <ContextWidget used={124_000} total={200_000} parts={PARTS} />
        <ContextWidget size="lg" used={124_000} total={200_000} parts={PARTS} />
      </div>
      <div class="ex-col">
        <RateWidget size="row" title="Output" value="52" unit="tok/s" values={RATE} stats={STATS} />
        <RateWidget title="Output" value="52" unit="tok/s" values={RATE} stats={STATS} />
        <RateWidget
          size="lg"
          title="Output"
          value="52"
          unit="tok/s"
          values={RATE}
          stats={STATS}
          axis={["-5m", "Now"]}
        />
      </div>
    </div>
  )
}
