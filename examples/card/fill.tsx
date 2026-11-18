import {
  Card,
  Delta,
  ListRow,
  RowList,
  Stat,
  StatCard,
  Widget,
  WidgetProgress,
  WidgetSparkline,
} from "@aiviarium/nocturne"
import { For } from "solid-js"
import { JOBS, OPEN_ISSUES } from "../_kit/data"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Filling a fixed box",
  note: "Each box is 180px high, as a grid cell would be. The list scrolls inside; a stat keeps its label and figure at the top and its chart takes the rest; a meter, a progress bar and their captions sit at the bottom.",
  surface: "well",
}

export default function FillingCards() {
  return (
    <div class="ex-grid ex-grid--2 ex-grid--fill" style={{ "grid-auto-rows": "180px" }}>
      <Card fill title="Jobs" count={12}>
        <RowList label="Jobs">
          <For each={JOBS.slice(0, 12)}>
            {(j) => <ListRow icon="activity" title={j.title} meta={j.when} />}
          </For>
        </RowList>
      </Card>
      <Card fill>
        <Stat
          label="Open issues"
          value={42}
          signal={<Delta direction="down" value="8" sentiment="good" />}
          caption="Against last week"
        >
          <WidgetSparkline values={OPEN_ISSUES} label="Open issues per day, last three weeks" live={1} />
        </Stat>
      </Card>
      <StatCard
        fill
        label="Memory"
        value="11.2"
        unit="GB"
        signal={<span class="nc-meta">of 16 GB</span>}
        meter={{ value: 70 }}
      />
      <Widget fill title="Uploading 24 files" value="ETA 2 min" caption="16 of 24 · 148 MB">
        <WidgetProgress value={66} label="Upload progress" />
      </Widget>
    </div>
  )
}
