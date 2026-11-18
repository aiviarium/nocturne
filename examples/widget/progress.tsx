import { IconButton, Widget, WidgetControls, WidgetProgress } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Progress",
  note: "One hue per widget: the accent or a status colour. Only the moving part gets the hue and its glow.",
  surface: "well",
}

export default function ProgressWidgets() {
  return (
    <div class="ex-grid ex-grid--3 ex-grid--fill">
      <Widget fill title="Uploading 24 files" value="ETA 2 min" caption="16 of 24 · 148 MB">
        <WidgetProgress value={66} label="Upload progress" />
      </Widget>
      <Widget fill hue="success" title="Deploy" value="1:22" largeValue caption="Step 2 of 3 · Test">
        <WidgetProgress value={52} label="Deploy progress" />
      </Widget>
      <Widget fill hue="warning" title="Focus" value="18:24" largeValue caption="Ends at 15:30">
        <WidgetProgress value={61} label="Focus timer" />
        <WidgetControls>
          <IconButton label="Stop" icon="close" tooltip={false} />
          <IconButton label="Pause" icon="pause" tooltip={false} />
          <IconButton label="Add five minutes" icon="plus" tooltip={false} />
        </WidgetControls>
      </Widget>
    </div>
  )
}
