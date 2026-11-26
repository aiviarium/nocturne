import { Button, Callout, Frame, IconButton, Panel, StreamState } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Header, flush body and the frame",
  note: "A 44px header holding the title, the state and the actions. Footers only for pagination or totals.",
  surface: "well",
}

export default function Panels() {
  return (
    <div class="ex-grid ex-grid--2">
      <Panel
        title="Coding agent"
        state={<StreamState state="resuming" offset={2203648} />}
        actions={
          <>
            <IconButton label="Filter" icon="filter" />
            <Button size="sm">Detach</Button>
          </>
        }
        footer={<span class="nc-meta">120×32 · s_7f2a</span>}
      >
        <span class="nc-muted">Content sits under the 44px header on 12px padding.</span>
      </Panel>
      <Panel
        title="Logs"
        state={<StreamState state="paused" buffered={14} />}
        actions={<IconButton label="More" icon="more" />}
        flush
      >
        <pre class="nc-terminal">
          {
            "12:01:02  info   agentd  started\n12:01:03  warn   agentd  slow disk\n12:01:09  info   agentd  attached"
          }
        </pre>
      </Panel>
      <Frame>
        <span class="nc-muted">A Frame: bg-1, radius 8, a hairline edge, for a region inside a view.</span>
      </Frame>
      <Callout tone="info">Panels and frames are separated by a gap or a hairline, never by shadow.</Callout>
    </div>
  )
}
