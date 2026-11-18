import { Slider } from "@aiviarium/nocturne"
import { createSignal, For } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Vertical and disabled",
  note: "Stood up for a mixer or an equaliser; Arrow Up raises it. A disabled slider keeps its value readable.",
}

const BANDS = ["60", "250", "1k", "4k", "12k"]

export default function Vertical() {
  const [gains, setGains] = createSignal([2, 0, -1, 3, 1])
  return (
    <div class="ex-row ex-gap-lg">
      <For each={BANDS}>
        {(band, i) => (
          <Slider
            orientation="vertical"
            label={band}
            aria-label={`${band} Hz`}
            showValue
            min={-6}
            max={6}
            value={gains()[i()]}
            onChange={(v) => setGains(gains().map((g, j) => (j === i() ? v : g)))}
            format={(v) => (v > 0 ? `+${v}` : String(v))}
          />
        )}
      </For>
      <div class="ex-grow" style={{ "max-width": "280px" }}>
        <Slider label="Volume (locked by policy)" defaultValue={40} disabled format={(v) => `${v}%`} />
      </div>
    </div>
  )
}
