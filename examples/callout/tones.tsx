import { Button, Callout } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Tones" }

export default function CalloutTones() {
  return (
    <div class="ex-col">
      <Callout tone="warning" code="409">
        3 sessions are running. Rebooting ends them, and agents lose unsaved work.
      </Callout>
      <Callout tone="info">Rebooting is refused while sessions run, unless you force it.</Callout>
      <Callout tone="danger" code="502" action={<Button size="sm">Retry</Button>}>
        Can't reach host build-01. Last seen 4 min ago.
      </Callout>
      <Callout tone="danger">Microphone access is blocked. Open settings to allow it.</Callout>
    </div>
  )
}
