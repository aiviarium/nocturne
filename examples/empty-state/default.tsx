import { Button, EmptyState } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "A filtered list with no match" }

export default function FilteredEmpty() {
  return (
    <EmptyState icon="filter" title="No sessions match" description="state: running · user: agent">
      <Button size="sm">Clear filters</Button>
    </EmptyState>
  )
}
