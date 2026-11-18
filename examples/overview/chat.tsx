import { ChatMessage, CodeBlock, ToolSteps } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Chat and code" }

export default function ChatAndCode() {
  return (
    <div class="ex-col">
      <ChatMessage role="user">Make the filter keep each group in its original order.</ChatMessage>
      <ChatMessage role="assistant" thought="Thought for 9s">
        <ToolSteps
          steps={[
            { icon: "file", verb: "Read", arg: "src/hooks/useTasks.ts" },
            { icon: "terminal", verb: "Running", arg: "npm test -- useTasks", status: "running" },
          ]}
        />
        <span>Done. The hook now sorts after filtering.</span>
      </ChatMessage>
      <CodeBlock
        title="useTasks.ts"
        language="ts"
        code={`const open = tasks.filter((t) => !t.done)\nreturn sortByDate([...open]) // 42`}
      />
    </div>
  )
}
