import { ScopePath } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import { projectPath } from "../_kit/shell"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "The scope path",
  note: "Segments at the drill size with “/” between them. One that goes up is quiet; one with a switcher, and the last, read brighter, and their caret opens the switcher in the filter format. The title bar decides how many leading segments fold into “…”.",
}

export default function ScopePathSegments() {
  const [project, setProject] = createSignal("atlas")
  const [fold, setFold] = createSignal(0)
  return (
    <div class="ex-col">
      <ScopePath segments={projectPath(project(), setProject, ["Agents"])} fold={fold()} />
      <label class="ex-row nc-meta">
        Folded segments
        <input
          type="range"
          min="0"
          max="3"
          value={fold()}
          onInput={(e) => setFold(Number(e.currentTarget.value))}
        />
      </label>
    </div>
  )
}
