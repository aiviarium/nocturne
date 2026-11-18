import { ApprovalCard } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A hue edge as the mark of a state",
  verdict: "dont",
  note: "A coloured border and bar for “waiting”: colour alone carries the state, and the card outshouts the conversation.",
}

export default function ApprovalEdge() {
  return (
    <div class="ex-edge" style={{ "--hue": "var(--warning)", "--hue-line": "var(--warning-line)" }}>
      <ApprovalCard
        summary="Edit 2 files and delete 1"
        items={["src/hooks/useTasks.ts", "src/hooks/legacy.ts (delete)"]}
        onAllow={() => {}}
        onDeny={() => {}}
      />
    </div>
  )
}
