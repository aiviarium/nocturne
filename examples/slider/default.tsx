import { Slider } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "One value, formatted",
  note: "The value sits at the right of the label. Arrow keys move a step, Shift or Page Up and Down ten, Home and End to the ends.",
}

export default function Sliders() {
  const [opacity, setOpacity] = createSignal(80)
  const [temperature, setTemperature] = createSignal(0.7)
  return (
    <div class="ex-col ex-form">
      <Slider label="Opacity" value={opacity()} onChange={setOpacity} format={(v) => `${v}%`} />
      <Slider
        label="Temperature"
        value={temperature()}
        onChange={setTemperature}
        min={0}
        max={2}
        step={0.1}
        help="Higher is more varied."
      />
    </div>
  )
}
