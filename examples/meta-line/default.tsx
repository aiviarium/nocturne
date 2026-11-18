import { MetaLine } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Metadata line",
  note: "Empty parts are dropped, so separators never dangle.",
}

export default function MetaLines() {
  return (
    <div class="nc-stack">
      <MetaLine
        items={["Engineering", { label: "acme/gateway#3", mono: true }, "opened by tomas", "40m ago"]}
      />
      <MetaLine items={[{ label: "feat/replicas", icon: "branch", mono: true }, false, "2 checks failed"]} />
    </div>
  )
}
