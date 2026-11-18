import { IconButton } from "@aiviarium/nocturne"
import { Camera, Cloud } from "lucide"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "States" }

export default function IconButtonStates() {
  const [pressed, setPressed] = createSignal(true)
  return (
    <div class="nc-row">
      <IconButton label="Filter" icon="filter" />
      <IconButton
        label="Toggle sidebar"
        icon="sidebar"
        shortcut="["
        pressed={pressed()}
        onClick={() => setPressed(!pressed())}
      />
      <IconButton label="More actions" icon="more" />
      <IconButton label="Disabled" icon="lock" disabled />
      <IconButton label="Dictate" icon="mic" round />
      <IconButton label="Lucide camera" iconNode={Camera} />
      <IconButton label="Lucide cloud" iconNode={Cloud} />
    </div>
  )
}
