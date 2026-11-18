import { ApprovalCard, ChatMessage, CodeBlock, Token, ToolSteps } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Conversation",
  note: "The person writes in a bubble; the assistant writes on the page. The approval card at the end decides.",
}

export default function Conversation() {
  const [decision, setDecision] = createSignal<"pending" | "allowed" | "denied">("pending")
  return (
    <div class="nc-stack ex-chat">
      <ChatMessage role="user">
        <Token kind="skill">$research-brief</Token> on onboarding drop-off, using{" "}
        <Token kind="ref" icon="file">
          Research notes
        </Token>
      </ChatMessage>
      <ChatMessage role="assistant" thought="Thought for 9s">
        <ToolSteps
          steps={[
            { icon: "file", verb: "Read", arg: "src/hooks/useTasks.ts" },
            { icon: "edit", verb: "Edited", arg: "useTasks.ts, sortByDate.ts", meta: "+22 −44" },
            {
              icon: "terminal",
              verb: "Ran",
              arg: "npm test -- useTasks",
              output:
                "✓ keeps original order within groups\n✓ moves completed tasks last\n\nTests  2 passed (2)",
              defaultOpen: true,
            },
            { icon: "terminal", verb: "Running", arg: "npm run build", status: "running" },
          ]}
        />
        <span>
          Three patterns explain most of the drop-off. I drafted a brief with a proposed flow, and a change to
          the hook that keeps each group in its original order.
        </span>
        <CodeBlock
          language="ts"
          title="sortByDate.ts"
          code={`export const sortByDate = (xs: Task[]) =>\n  [...xs].sort((a, b) => b.at - a.at)`}
        />
        <ApprovalCard
          summary="Edit 2 files and delete 1"
          items={["src/hooks/useTasks.ts", "src/hooks/sortByDate.ts", "src/hooks/legacy.ts (delete)"]}
          decision={decision()}
          onAllow={() => setDecision("allowed")}
          onDeny={() => setDecision("denied")}
        />
      </ChatMessage>
    </div>
  )
}
