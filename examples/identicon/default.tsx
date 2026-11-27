import { Identicon } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Identicon",
  note: "One image per id, drawn from it: chats, which have no picture or type of their own, tell apart at a glance.",
}

export default function Identicons() {
  return (
    <div class="nc-row">
      {["c-arm64", "c-empty", "c-csv", "c-ranking", "c-billing"].map((id) => (
        <Identicon seed={id} label={id} />
      ))}
      {["c-arm64", "c-empty", "c-csv"].map((id) => (
        <Identicon seed={id} size="md" />
      ))}
    </div>
  )
}
