import { ScopePath } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import { projectPath } from "../_kit/shell"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "The scope path",
  note: "Segments at the drill size with “/” between them. The workspace and the scope you are in read in full colour; the segments between go up and are quiet. Only the colour changes, never the weight. A caret opens a switcher. The title bar folds leading segments into “…” when space runs out.",
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
