import { Button, Callout } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Neutral surface, hue in the icon",
  note: "Callout as @aiviarium/nocturne draws it: a bg step and a hairline; the tone is the icon's colour and the code.",
}

export default function NeutralCallout() {
  return (
    <div class="ex-col">
      <Callout tone="warning" code="409">
        3 sessions are running. Rebooting ends them.
      </Callout>
      <Callout tone="danger" code="502" action={<Button size="sm">Retry</Button>}>
        Can't reach host build-01.
      </Callout>
    </div>
  )
}
