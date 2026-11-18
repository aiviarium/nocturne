import { Widget, WidgetSegments } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Segments",
  note: "The parts of one whole, each in its own colour, the rest as the track. Names go under their parts, or into a legend when some parts are narrow.",
  surface: "well",
}

export default function SegmentWidgets() {
  return (
    <div class="ex-grid ex-grid--2 ex-grid--fill">
      <Widget fill hue="info" title="Disk" value="330" unit="/ 500 GB">
        <WidgetSegments
          total={500}
          segments={[
            { label: "Apps", value: 120, display: "120G" },
            { label: "Media", value: 210, display: "210G" },
          ]}
          free="Free"
          freeDisplay="170G"
          label="Disk"
        />
      </Widget>
      <Widget fill title="Context window" value="124k" unit="/ 200k">
        <WidgetSegments
          labels="legend"
          total={200}
          segments={[
            { label: "System", value: 9, display: "9k" },
            { label: "Tools", value: 21, display: "21k" },
            { label: "Files", value: 38, display: "38k" },
            { label: "Chat", value: 56, display: "56k" },
          ]}
          free="Free"
          freeDisplay="76k"
          label="Context window"
        />
      </Widget>
    </div>
  )
}
