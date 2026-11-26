import { ViewHeader } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A short trail",
  verdict: "do",
  note: "The title bar's path already names the workspace and the project, so the view's trail starts at its place: the list, then the issue. A chat reached from one list has the list and the chat.",
  surface: "well",
}

const go = () => {}

export default function CrumbsStripped() {
  return (
    <div class="ex-col">
      <div class="ex-view">
        <ViewHeader
          trail={[{ label: "Issues", onClick: go }, { label: "WEB-142" }]}
          actions={[{ id: "copy", label: "Copy link", icon: "link", onClick: go }]}
        />
        <div class="ex-view__body">
          <span class="nc-muted">The issue.</span>
        </div>
      </div>
      <div class="ex-view">
        <ViewHeader
          trail={[{ label: "Agent sessions", onClick: go }, { label: "Fix the sign-in loop" }]}
          actions={[{ id: "stop", label: "Stop the session", overflow: true, onClick: go }]}
        />
        <div class="ex-view__body">
          <span class="nc-muted">The chat.</span>
        </div>
      </div>
    </div>
  )
}
