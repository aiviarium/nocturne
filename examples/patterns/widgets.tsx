import {
  Button,
  Card,
  Delta,
  type GridItem,
  ListRow,
  RowList,
  Stat,
  StatCard,
  Widget,
  WidgetGrid,
  WidgetProgress,
  WidgetSparkline,
} from "@aiviarium/nocturne"
import { createSignal, For, type JSX, Show } from "solid-js"
import { JOBS, OPEN_ISSUES, REQUESTS } from "../_kit/data"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A dashboard: cards that fill the cells they are given",
  note: "WidgetGrid places each tile in a 12-column grid of 80px rows. Outside editing each tile is as tall as its content up to its size, tiles of one height in a row end on one line, and the alerts tile, with nothing to show, takes no space (raise one to see the page make room for it). Press Edit to see the stored layout, the alerts tile as a placeholder, and to drag and resize.",
  surface: "well",
}

type Tile = GridItem & { kind: "alerts" | "jobs" | "stat" | "upload" | "requests" | "memory" }

export default function Dashboard() {
  const [editing, setEditing] = createSignal(false)
  const [alerts, setAlerts] = createSignal<string[]>([])
  const [items, setItems] = createSignal<Tile[]>([
    { id: "alerts", kind: "alerts", x: 0, y: 0, w: 12, h: 2 },
    { id: "jobs", kind: "jobs", x: 0, y: 2, w: 5, h: 4 },
    { id: "stat", kind: "stat", x: 5, y: 2, w: 3, h: 2 },
    { id: "memory", kind: "memory", x: 8, y: 2, w: 4, h: 2 },
    { id: "upload", kind: "upload", x: 5, y: 4, w: 4, h: 2 },
    { id: "requests", kind: "requests", x: 9, y: 4, w: 3, h: 2 },
  ])
  const tiles: Record<Tile["kind"], () => JSX.Element> = {
    // Nothing to say renders nothing; while editing a placeholder stands in, so it can be moved and removed.
    alerts: () => (
      <Show
        when={alerts().length}
        fallback={
          <Show when={editing()}>
            <Widget fill title="Alerts" style={{ background: "transparent" }}>
              <span class="nc-meta">
                Nothing to show right now. Hidden on the page until it has something.
              </span>
            </Widget>
          </Show>
        }
      >
        <Widget fill hue="danger" title="Alerts" value={`${alerts().length} firing`}>
          <RowList label="Alerts">
            <For each={alerts()}>{(a) => <ListRow icon="bell" title={a} meta="now" />}</For>
          </RowList>
        </Widget>
      </Show>
    ),
    jobs: () => (
      <Card fill title="Jobs" count={12}>
        <RowList label="Jobs">
          <For each={JOBS.slice(0, 12)}>
            {(j) => <ListRow icon="activity" title={j.title} meta={j.when} />}
          </For>
        </RowList>
      </Card>
    ),
    stat: () => (
      <Card fill>
        <Stat
          label="Open issues"
          value={42}
          signal={<Delta direction="down" value="8" sentiment="good" />}
          caption="Against last week"
        >
          <WidgetSparkline values={OPEN_ISSUES} label="Open issues per day, last three weeks" />
        </Stat>
      </Card>
    ),
    memory: () => (
      <StatCard
        fill
        label="Memory"
        value="11.2"
        unit="GB"
        signal={<span class="nc-meta">of 16 GB</span>}
        meter={{ value: 70 }}
      />
    ),
    upload: () => (
      <Widget fill title="Upload" value="16 / 24">
        <WidgetProgress value={66} label="Upload progress" />
      </Widget>
    ),
    requests: () => (
      <Widget fill title="Requests" value="1,284" unit="/ min" axis={["-60m", "-30m", "Now"]}>
        <WidgetSparkline values={REQUESTS} label="Requests per minute, last hour" />
      </Widget>
    ),
  }
  return (
    <div class="ex-col">
      <div class="nc-row">
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            setAlerts((a) => (a.length ? [] : ["Disk on build-02 is 92% full", "p95 latency above 800 ms"]))
          }
        >
          {alerts().length ? "Clear the alerts" : "Raise an alert"}
        </Button>
        <span class="ex-spacer" />
        <Button
          size="sm"
          variant={editing() ? "primary" : "secondary"}
          onClick={() => setEditing(!editing())}
        >
          {editing() ? "Done" : "Edit"}
        </Button>
      </div>
      <WidgetGrid
        label="Dashboard"
        items={items()}
        empty={alerts().length ? [] : ["alerts"]}
        editing={editing()}
        onChange={setItems}
        itemLabel={(t) => t.kind}
      >
        {(tile) => tiles[tile().kind]()}
      </WidgetGrid>
    </div>
  )
}
