import { Button } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A button may be coloured; it has no hue edge",
  verdict: "do",
  note: "Danger and accent buttons are fills. Hue fills belong to buttons and icon tiles only.",
}

export default function DangerButton() {
  return (
    <div class="nc-row">
      <Button>Cancel</Button>
      <Button variant="danger" icon="trash">
        Delete build-01
      </Button>
      <Button variant="accent" icon="sparkle">
        Generate
      </Button>
    </div>
  )
}
