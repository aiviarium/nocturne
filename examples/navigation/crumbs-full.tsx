import { ViewHeader } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Every level of the path in the crumbs",
  verdict: "dont",
  note: "Five levels before the issue, most of them repeated from the sidebar. The crumbs that help get cut to make room.",
  surface: "well",
}

const go = () => {}

export default function CrumbsFull() {
  return (
    <div class="ex-view">
      <ViewHeader
        trail={[
          { label: "Workspace", onClick: go },
          { label: "Projects", onClick: go },
          { label: "Atlas web", onClick: go },
          { label: "Issues", onClick: go },
          { label: "Active", onClick: go },
          { label: "WEB-142 Flaky deploy test on the arm64 runner" },
        ]}
        actions={[{ id: "copy", label: "Copy link", icon: "link", onClick: go }]}
      />
      <div class="ex-view__body">
        <span class="nc-muted">The issue.</span>
      </div>
    </div>
  )
}
