import { NumberField, UNITS } from "@aiviarium/nocturne"
import { createSignal, For } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Simple expressions",
  note: "Typed sums are worked out on Enter or blur. A leading operator continues from the value, and input it cannot read keeps the old value and says why.",
}

const TRY = ["12*4", "(3+4)/2", "100-15%", "+5", "*2", "-10%", "=-5", "2+"]

export default function Expressions() {
  const [price, setPrice] = createSignal<number | null>(120)
  const [estimate, setEstimate] = createSignal<number | null>(90)
  return (
    <div class="ex-col">
      <div class="ex-grid ex-grid--2 ex-form">
        <NumberField label="Price" value={price()} onChange={setPrice} unit="EUR" step={0.5} />
        <NumberField
          label="Estimate"
          value={estimate()}
          onChange={setEstimate}
          min={0}
          unit="min"
          units={UNITS.minutes}
        />
      </div>
      <div class="ex-row">
        <span class="nc-meta">Try in Price:</span>
        <For each={TRY}>{(t) => <code class="nc-mono">{t}</code>}</For>
      </div>
    </div>
  )
}
