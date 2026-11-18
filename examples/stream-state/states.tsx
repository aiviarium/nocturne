import { StreamState } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "States",
  note: "Put it in the panel header next to the title. A resumable stream always shows where it will resume from.",
}

export default function StreamStates() {
  return (
    <div class="nc-row">
      <StreamState state="connecting" />
      <StreamState state="live" />
      <StreamState state="resuming" offset={2203648} />
      <StreamState state="paused" buffered={14} />
      <StreamState state="dropped" lost="12 KB" />
      <StreamState state="ended" exitCode={0} />
      <StreamState state="error" code="504 timeout" />
    </div>
  )
}
