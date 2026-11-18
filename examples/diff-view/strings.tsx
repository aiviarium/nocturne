import { DiffView, Tabs } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "From a pair of strings",
  note: "Two lines of context; the gap between hunks is folded. Accept and reject at the top.",
  surface: "none",
}

const BEFORE = `export function useTasks(filter: Filter) {
  return store.tasks.filter((task) => {
    if (filter === "all") return true
    if (filter === "done") return task.done
    return !task.done
  })
}

export const TASK_LIMIT = 50
export const PAGE_SIZE = 25
export const DEFAULT_FILTER = "all"
export const SORT_KEY = "date"
export const GROUP_BY = "none"
`

const AFTER = `export function useTasks(filter: Filter) {
  const visible = store.tasks.filter((task) => {
    if (filter === "all") return true
    if (filter === "done") return task.done
    return !task.done
  })
  return sortByDate(visible)
}

export const TASK_LIMIT = 50
export const PAGE_SIZE = 25
export const DEFAULT_FILTER = "all"
export const SORT_KEY = "date"
export const GROUP_BY = "none"
`

export default function StringDiff() {
  const [mode, setMode] = createSignal<"split" | "unified">("split")
  return (
    <div class="ex-col">
      <Tabs
        label="Diff mode"
        items={[
          { id: "split", label: "Split" },
          { id: "unified", label: "Unified" },
        ]}
        value={mode()}
        onChange={(id) => setMode(id as "split" | "unified")}
      />
      <DiffView
        path="src/hooks/useTasks.ts"
        before={BEFORE}
        after={AFTER}
        mode={mode()}
        onAccept={() => {}}
        onReject={() => {}}
        context={2}
      />
    </div>
  )
}
