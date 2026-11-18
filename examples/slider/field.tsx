import { Slider } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "With a field for the exact value",
  note: "Drag for a rough value, type in the field for an exact one (it takes sums: 512*2).",
}

export default function SliderWithField() {
  const [memory, setMemory] = createSignal(2048)
  const [cpu, setCpu] = createSignal(2)
  return (
    <div class="ex-col ex-form">
      <Slider
        label="Memory"
        value={memory()}
        onChange={setMemory}
        min={256}
        max={8192}
        step={256}
        unit="MB"
        field
      />
      <Slider label="CPU" value={cpu()} onChange={setCpu} min={0.5} max={8} step={0.5} unit="cores" field />
    </div>
  )
}
