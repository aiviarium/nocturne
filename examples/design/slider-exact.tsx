import { Slider } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A slider for an exact number",
  verdict: "dont",
  note: "A port from 1 to 65535 on a track, with no readout: a pixel is hundreds of ports, and nothing says which one is set.",
}

export default function SliderExact() {
  return (
    <div class="ex-col">
      <Slider aria-label="Port" defaultValue={8080} min={1} max={65535} showValue={false} />
      <Slider aria-label="Replicas" defaultValue={3} min={1} max={500} showValue={false} />
    </div>
  )
}
