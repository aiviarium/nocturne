import { ContextWidget, Icon, RateWidget, Widget, WidgetMeters, WidgetSteps } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Beside a chat",
  note: "The context of an agent's session in a side column: the context window, where the plan is, how fast it writes and the machine it runs on. Each widget takes the size the column has room for.",
  surface: "well",
}

const PARTS = [
  { label: "System", value: 9_000, display: "9k" },
  { label: "Tools", value: 21_000, display: "21k" },
  { label: "Files", value: 38_000, display: "38k" },
  { label: "Chat", value: 56_000, display: "56k" },
]
const RATE = [
  20, 34, 28, 46, 40, 58, 50, 66, 54, 42, 60, 72, 64, 48, 70, 82, 68, 56, 44, 62, 76, 66, 52, 40, 60, 74,
]

export default function AgentContext() {
  return (
    <div class="ex-col ex-inspector">
      <ContextWidget size="sm" used={124_000} total={200_000} parts={PARTS} />
      <Widget title="Plan" value="4:12">
        <WidgetSteps steps={["Read", "Edit", "Test", "Commit"]} current={2} label="Plan" />
      </Widget>
      <RateWidget
        title="Output"
        value="52"
        unit="tok/s"
        values={RATE}
        stats={[{ label: "p50", value: "48" }]}
      />
      <Widget title="atlas-02" value="4 cores">
        <WidgetMeters
          label="atlas-02 usage"
          items={[
            { label: "CPU", value: 64 },
            { label: "Memory", value: 70, display: "11.2 GB" },
            { label: "Disk", value: 41, display: "205 GB" },
          ]}
        />
      </Widget>
      <Widget size="row" hue="success" title="Changes" value="+120 −4">
        <Icon name="branch" size="sm" />
      </Widget>
    </div>
  )
}
