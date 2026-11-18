import { type DotStatus, State, StatusDot } from "@aiviarium/nocturne"
import { For } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Every state",
  note: "Live and AI glow because they are moving. The word is coloured only for warn and error.",
}

const STATES: Array<[DotStatus, string]> = [
  ["live", "Running"],
  ["ai", "Working"],
  ["idle", "Idle"],
  ["warn", "Needs you"],
  ["error", "Failed"],
  ["off", "Offline"],
  ["ok", "Done"],
  ["neutral", "Exit 0"],
]

export default function AllStates() {
  return (
    <div class="ex-col">
      <div class="nc-row ex-gap-lg">
        <For each={STATES}>{([status, word]) => <State status={status}>{word}</State>}</For>
      </div>
      <div class="nc-row ex-gap-lg">
        <For each={STATES}>{([status]) => <StatusDot status={status} />}</For>
      </div>
    </div>
  )
}
