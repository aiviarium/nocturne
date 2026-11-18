import { ViewHeader } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A stripped path, or a back control",
  verdict: "do",
  note: "The start of the path folds into the first crumb, and the project and the issue stay. A chat reached from one list shows only a back control.",
  surface: "well",
}

const go = () => {}

export default function CrumbsStripped() {
  return (
    <div class="ex-col">
      <div class="ex-view">
        <ViewHeader
          fold={1}
          crumbs={[
            { label: "Projects", onClick: go },
            { label: "Atlas web", onClick: go },
            { label: "WEB-142" },
          ]}
          actions={[{ id: "copy", label: "Copy link", icon: "link", onClick: go }]}
        />
        <div class="ex-view__body">
          <span class="nc-muted">The issue.</span>
        </div>
      </div>
      <div class="ex-view">
        <ViewHeader
          back={{ label: "Agent sessions", onClick: go }}
          actions={[{ id: "stop", label: "Stop the session", overflow: true, onClick: go }]}
        />
        <div class="ex-view__body">
          <span class="nc-muted">The chat.</span>
        </div>
      </div>
    </div>
  )
}
