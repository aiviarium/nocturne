import { Badge, CodeBadge } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Tones" }

export default function BadgeTones() {
  return (
    <div class="nc-row">
      <Badge tone="success">Active</Badge>
      <Badge tone="warning">Needs you</Badge>
      <Badge tone="danger">Blocked</Badge>
      <Badge tone="info">In review</Badge>
      <Badge tone="accent" icon="sparkle">
        AI
      </Badge>
      <Badge tone="outline">Draft</Badge>
      <Badge>Neutral</Badge>
      <Badge tone="success" square>
        Square
      </Badge>
      <CodeBadge>502</CodeBadge>
    </div>
  )
}
