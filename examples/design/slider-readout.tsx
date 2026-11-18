import { Slider } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A bounded value with its readout",
  verdict: "do",
  note: "A slider for a value where roughly right is right; the value at the label's right, a field when it must be exact.",
}

export default function SliderReadout() {
  return (
    <div class="ex-col">
      <Slider label="Opacity" defaultValue={80} format={(v) => `${v}%`} />
      <Slider label="Memory" defaultValue={2048} min={256} max={8192} step={256} unit="MB" field />
    </div>
  )
}
