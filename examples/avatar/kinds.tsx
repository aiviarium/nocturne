import { Avatar } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "People, agents and the assistant" }

export default function AvatarKinds() {
  return (
    <div class="nc-row ex-gap-lg">
      <Avatar name="Sarah Chen" size="sm" />
      <Avatar name="Eli Wong" />
      <Avatar name="Jo Cruz" size="lg" />
      <Avatar name="Lena Fox" hue="orchid" />
      <Avatar kind="agent" name="Atlas" hue="amber" />
      <Avatar kind="agent" name="Scout" hue="sky" />
      <Avatar kind="agent" name="Quill" hue="mint" />
      <Avatar kind="agent" name="Forge" hue="ember" size="lg" />
      <Avatar kind="ai" />
    </div>
  )
}
