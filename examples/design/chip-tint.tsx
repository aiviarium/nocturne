import { Badge, LabelChip, Token } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A slight tint, a stronger ink",
  verdict: "do",
  note: "Small inline chips may carry a tint of their hue, with text in a stronger shade of the same hue.",
}

export default function ChipTint() {
  return (
    <div class="nc-row">
      <LabelChip hue="danger">Bug</LabelChip>
      <LabelChip hue="orchid">Design</LabelChip>
      <Badge tone="accent">AI</Badge>
      <Badge tone="outline">Draft</Badge>
      <Token kind="person" name="Sarah Chen">
        Sarah Chen
      </Token>
    </div>
  )
}
