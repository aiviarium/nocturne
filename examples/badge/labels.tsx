import { LabelChip, type LabelHue } from "@aiviarium/nocturne"
import { For } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Label chips" }

const LABELS: Array<[LabelHue, string]> = [
  ["accent", "Feature"],
  ["danger", "Bug"],
  ["info", "Improvement"],
  ["orchid", "Design"],
  ["teal", "Research"],
  ["warning", "Chore"],
  ["mint", "Shipped"],
  ["ember", "Infra"],
]

export default function LabelChips() {
  return (
    <div class="nc-row">
      <For each={LABELS}>{([hue, name]) => <LabelChip hue={hue}>{name}</LabelChip>}</For>
    </div>
  )
}
