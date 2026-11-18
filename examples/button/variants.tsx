import { Button } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Variants" }

export default function ButtonVariants() {
  return (
    <div class="nc-row">
      <Button variant="primary">Create</Button>
      <Button>Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="accent" icon="sparkle">
        Generate
      </Button>
      <Button variant="danger" icon="trash">
        Delete
      </Button>
      <Button disabled>Disabled</Button>
    </div>
  )
}
