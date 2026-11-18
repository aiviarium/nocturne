import { Icon } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Colour on the card",
  verdict: "dont",
  note: "Tinted cards with hue edges, one colour per kind: the grid turns into a patchwork and nothing on it reads as signal.",
  surface: "well",
}

export default function ColouredCard() {
  return (
    <div class="ex-grid ex-grid--2">
      <div
        class="ex-tinted"
        style={{
          "--hue": "var(--label-sky)",
          "--hue-tint": "var(--info-tint)",
          "--hue-line": "var(--info-line)",
        }}
      >
        <Icon name="server" />
        <div class="nc-stack">
          <span class="label">build-01</span>
          <span class="nc-meta">build host · eu-west</span>
        </div>
      </div>
      <div
        class="ex-tinted"
        style={{
          "--hue": "var(--label-orchid)",
          "--hue-tint": "var(--accent-tint)",
          "--hue-line": "var(--accent-line)",
        }}
      >
        <Icon name="file" />
        <div class="nc-stack">
          <span class="label">Launch plan</span>
          <span class="nc-meta">Page · Product</span>
        </div>
      </div>
    </div>
  )
}
