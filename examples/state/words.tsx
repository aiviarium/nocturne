import { State } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "State" }

export default function StateWords() {
  return (
    <div class="nc-row">
      <State status="ai">Working</State>
      <State status="live">Running</State>
      <State status="warn">Needs you</State>
      <State status="error">Failed</State>
      <State status="idle">Paused</State>
      <State status="off">Offline</State>
    </div>
  )
}
