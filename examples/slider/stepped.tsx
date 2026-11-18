import { Slider } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Stepped, with ticks and labels",
  note: "A few named steps: ticks at every step and a label under the ones that matter.",
}

const EFFORT = ["Minimal", "Low", "Medium", "High", "Max"]

export default function Stepped() {
  const [effort, setEffort] = createSignal(2)
  const [retention, setRetention] = createSignal(30)
  return (
    <div class="ex-col ex-form">
      <Slider
        label="Reasoning effort"
        value={effort()}
        onChange={setEffort}
        min={0}
        max={4}
        ticks
        format={(v) => EFFORT[v] ?? String(v)}
        marks={EFFORT.map((label, value) => ({ value, label }))}
      />
      <Slider
        label="Keep logs for"
        value={retention()}
        onChange={setRetention}
        min={0}
        max={90}
        step={15}
        ticks
        unit="days"
        marks={[
          { value: 0, label: "Off" },
          { value: 30, label: "30" },
          { value: 60, label: "60" },
          { value: 90, label: "90" },
        ]}
      />
    </div>
  )
}
