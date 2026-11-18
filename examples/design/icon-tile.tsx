import { Card, Icon } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Colour on the tile behind an icon",
  verdict: "do",
  note: "The card stays neutral; its kind is a small coloured tile.",
  surface: "well",
}

export default function IconTile() {
  return (
    <div class="ex-grid ex-grid--2">
      <Card>
        <div class="nc-row">
          <span class="ex-icon-tile" style={{ "--hue": "var(--label-sky)" }}>
            <Icon name="server" />
          </span>
          <div class="nc-stack">
            <span class="label">build-01</span>
            <span class="nc-meta">build host · eu-west</span>
          </div>
        </div>
      </Card>
      <Card>
        <div class="nc-row">
          <span class="ex-icon-tile" style={{ "--hue": "var(--label-orchid)" }}>
            <Icon name="file" />
          </span>
          <div class="nc-stack">
            <span class="label">Launch plan</span>
            <span class="nc-meta">Page · Product</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
