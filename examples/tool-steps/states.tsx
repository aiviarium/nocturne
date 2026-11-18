import { ToolSteps } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Tool step states",
  note: "Only the running step glows; its hue is in its text.",
}

export default function ToolStepStates() {
  return (
    <ToolSteps
      steps={[
        { icon: "search", verb: "Searched", arg: "useTasks", status: "ok" },
        {
          icon: "terminal",
          verb: "Failed",
          arg: "npm test",
          status: "error",
          output: "FAIL useTasks.test.ts\n  ✕ moves completed tasks last",
        },
        { icon: "terminal", verb: "Running", arg: "npm run lint", status: "running" },
        { icon: "terminal", verb: "Queued", arg: "npm run build", status: "pending" },
      ]}
    />
  )
}
