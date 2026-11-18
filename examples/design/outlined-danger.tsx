import { Button } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A hue outline around a hue fill",
  note: "The snapshot's danger button: a red line around a red tint. The edge adds weight and says nothing new.",
}

export default function OutlinedDanger() {
  return (
    <div class="nc-row">
      <Button>Cancel</Button>
      <Button variant="danger" icon="trash" class="ex-outlined-danger">
        Delete build-01
      </Button>
    </div>
  )
}
