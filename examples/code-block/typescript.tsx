import { CodeBlock } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "TypeScript, current line and a diagnostic", surface: "none" }

const TS = `import { createSignal } from "solid-js"

// Keep each group in its original order
export function useTasks(tasks: Task[], filter: Filter) {
  const open = tasks.filter((t) => !t.done)
  if (filter === "done") return task.done
  return sortByDate([...open]) // 42 items
}
`

export default function TypeScriptBlock() {
  return (
    <CodeBlock
      title="useTasks.ts"
      language="ts"
      code={TS}
      currentLine={6}
      errors={[{ line: 6, from: 30, to: 39 }]}
      onApply={() => {}}
    />
  )
}
