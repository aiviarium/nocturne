import { RangeSlider } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Range",
  note: "Two thumbs that cannot pass each other; pressing the track moves the nearer one.",
}

export default function Range() {
  const [hours, setHours] = createSignal<[number, number]>([9, 17])
  const [price, setPrice] = createSignal<[number, number]>([20, 80])
  const hour = (h: number) => `${String(h).padStart(2, "0")}:00`
  return (
    <div class="ex-col ex-form">
      <RangeSlider
        label="Quiet hours"
        value={hours()}
        onChange={setHours}
        min={0}
        max={24}
        minDistance={1}
        format={hour}
        thumbLabels={["Start", "End"]}
      />
      <RangeSlider
        label="Price"
        value={price()}
        onChange={setPrice}
        min={0}
        max={200}
        step={5}
        format={(v) => `€${v}`}
      />
    </div>
  )
}
