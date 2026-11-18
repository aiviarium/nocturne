import { Icon, State } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Hand-built rows",
  verdict: "dont",
  note: "Three modules, three row recipes: the icons, titles and trailing text each start somewhere else.",
}

/** Built by hand on purpose: three rows, three paddings. */
export default function RaggedEdges() {
  return (
    <div class="ex-col" style={{ gap: "0" }}>
      <div class="nc-row" style={{ padding: "6px 8px", gap: "10px" }}>
        <Icon name="file" />
        <span>Launch plan</span>
        <span class="nc-meta">Page</span>
        <span class="ex-spacer" />
        <span class="nc-meta">4m</span>
      </div>
      <div class="nc-row" style={{ padding: "8px 14px", gap: "6px" }}>
        <Icon name="list" size="lg" />
        <span class="label">WEB-41 Empty state</span>
        <State status="warn">Needs you</State>
        <span class="ex-spacer" />
        <span class="nc-meta">1 hour ago</span>
      </div>
      <div class="nc-row" style={{ padding: "4px 4px", gap: "12px" }}>
        <Icon name="agent" size="sm" />
        <span>Fix the redirect loop</span>
        <span class="ex-spacer" />
        <span class="nc-meta" style={{ "padding-right": "24px" }}>
          2h
        </span>
      </div>
    </div>
  )
}
