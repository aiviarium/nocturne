import { NumberField, UNITS } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Plain, with a unit, with steppers, with units it converts",
  note: "Drag a label sideways to scrub (Shift ten steps, Alt a tenth), or use the arrow keys. The duration field takes 1.5h, 90m or 1h 30m.",
}

export default function NumberFields() {
  const [replicas, setReplicas] = createSignal<number | null>(3)
  const [width, setWidth] = createSignal<number | null>(320)
  const [timeout, setTimeoutValue] = createSignal<number | null>(90)
  return (
    <div class="ex-grid ex-grid--2 ex-form">
      <NumberField label="Replicas" value={replicas()} onChange={setReplicas} min={1} max={64} integer />
      <NumberField label="Width" value={width()} onChange={setWidth} min={0} unit="px" />
      <NumberField
        label="Concurrency"
        defaultValue={4}
        min={1}
        max={16}
        integer
        steppers
        help="Sessions that run at once."
      />
      <NumberField
        label="Timeout"
        value={timeout()}
        onChange={setTimeoutValue}
        min={0}
        unit="min"
        units={UNITS.minutes}
        help="Type 1.5h, 90m or 1h 30m."
      />
    </div>
  )
}
