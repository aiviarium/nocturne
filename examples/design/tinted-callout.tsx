import { Button } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A tinted box with a hue edge",
  verdict: "dont",
  note: "The Nocturne snapshot's callout: a status tint behind the text and a status line around it, so two warnings shout louder than the content.",
}

/** Built by hand on purpose: @aiviarium/nocturne's Callout cannot draw this any more. */
export default function TintedCallout() {
  return (
    <div class="ex-col">
      <div
        class="ex-tinted"
        style={{
          "--hue": "var(--warning)",
          "--hue-tint": "var(--warning-tint)",
          "--hue-line": "var(--warning-line)",
        }}
      >
        <span class="nc-code-badge">409</span> 3 sessions are running. Rebooting ends them.
      </div>
      <div
        class="ex-tinted"
        style={{
          "--hue": "var(--danger)",
          "--hue-tint": "var(--danger-tint)",
          "--hue-line": "var(--danger-line)",
        }}
      >
        <span class="nc-code-badge">502</span> Can't reach host build-01.
        <span class="ex-spacer" />
        <Button size="sm">Retry</Button>
      </div>
    </div>
  )
}
