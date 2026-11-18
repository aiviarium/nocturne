import { ApprovalCard, Button } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Pending and decided",
  note: "The card's edge stays a hairline in every state: its state is its dot and word.",
}

export default function Approvals() {
  const [decision, setDecision] = createSignal<"pending" | "allowed" | "denied">("pending")
  return (
    <div class="nc-stack">
      <ApprovalCard
        summary="Create or overwrite src/callback.js"
        items={["src/auth/callback.js"]}
        decision={decision()}
        onAllow={() => setDecision("allowed")}
        onDeny={() => setDecision("denied")}
      />
      <ApprovalCard summary="Delete 3 sessions" decision="allowed" />
      <ApprovalCard summary="Force reboot build-01" decision="denied" />
      <div>
        <Button size="sm" variant="ghost" onClick={() => setDecision("pending")}>
          Reset the first card
        </Button>
      </div>
    </div>
  )
}
