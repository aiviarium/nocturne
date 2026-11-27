// Dashboard › Overview: the week in four figures, then a grid of live widgets the person arranges. The figures and
// readings move on timers; the layout is kept in the demo's store.
import {
  Card,
  Delta,
  IconButton,
  InfoTip,
  ListRow,
  placeInGrid,
  RowList,
  readJson,
  SectionHeading,
  Select,
  ShellViewHeader,
  type ShellViewProps,
  Skeleton,
  Stat,
  StatCard,
  ViewLayout,
  Widget,
  WidgetControls,
  WidgetGauge,
  WidgetGrid,
  WidgetMeters,
  WidgetProgress,
  WidgetRing,
  WidgetSegments,
  WidgetSparkline,
  WidgetStats,
  WidgetSteps,
  WidgetTimer,
  WidgetUptime,
  writeJson,
} from "@aiviarium/nocturne"
import type { JSX } from "@solidjs/web"
import { createSignal, For, onSettled, Show } from "solid-js"
import { useDemo } from "../context"
import {
  AXIS,
  DEFAULT_LAYOUT,
  DEPLOY_STEPS,
  drift,
  HEADLINES,
  KINDS,
  RANGES,
  type Range,
  series,
  type Tile,
  type TileKind,
  UPTIME_DAYS,
} from "./data"

const LAYOUT_KEY = "demo/dashboard/layout"
const RANGE_KEY = "demo/dashboard/range"

/** The first load happens once a page: a refresh or a second visit shows the figures straight away. */
let loaded = false

/** The live readings, moved on by one timer while the view is shown. */
function createLive() {
  const [requests, setRequests] = createSignal(series(30, 1100, 260, 2))
  const [tokens, setTokens] = createSignal(series(30, 46, 18, 5))
  const [cpu, setCpu] = createSignal(64)
  const [memory, setMemory] = createSignal(71)
  const [queue, setQueue] = createSignal(58)
  const [deployStep, setDeployStep] = createSignal(1)
  const [buildSecs, setBuildSecs] = createSignal(12)
  const [buildRunning, setBuildRunning] = createSignal(true)
  const [alerts, setAlerts] = createSignal<string[]>([])
  let tick = 0
  onSettled(() => {
    const timer = setInterval(() => {
      tick++
      setRequests((r) => [...r.slice(1), Math.round(drift(r.at(-1)!, 120, 700, 1600))])
      setTokens((t) => [...t.slice(1), Math.round(drift(t.at(-1)!, 9, 12, 96))])
      setCpu((v) => drift(v, 6, 20, 96))
      setMemory((v) => drift(v, 2, 50, 88))
      setQueue((v) => drift(v, 7, 10, 95))
      if (buildRunning()) setBuildSecs((s) => (s >= 30 ? 0 : s + 2))
      if (tick % 3 === 0) setDeployStep((s) => (s + 1) % DEPLOY_STEPS.length)
      // The runner queue backs up now and then: an alert while it is over 85%, gone once it drains.
      setAlerts(queue() > 85 ? [`Runner queue at ${Math.round(queue())}%`] : [])
    }, 2000)
    return () => clearInterval(timer)
  })
  return {
    requests,
    tokens,
    cpu,
    memory,
    queue,
    deployStep,
    buildSecs,
    buildRunning,
    setBuildRunning,
    setBuildSecs,
    alerts,
  }
}

type Live = ReturnType<typeof createLive>

/** A meter whose reading follows a signal while the row stays the same object. */
export const liveMeter = (label: string, value: () => number) => ({
  label,
  get value() {
    return value()
  },
  get display() {
    return `${Math.round(value())}%`
  },
})

const fmt = (n: number) => n.toLocaleString("en-US")

/** One tile's content, by kind. Each reads the live readings, so it stays mounted as they move. */
function TileView(props: { kind: TileKind; live: Live; range: Range; editing: boolean }): JSX.Element {
  const l = props.live
  const views: Record<TileKind, () => JSX.Element> = {
    // Nothing firing: nothing on the page. While editing a placeholder stands in, so it can be moved.
    alerts: () => (
      <Show
        when={l.alerts().length}
        fallback={
          <Show when={props.editing}>
            <Widget fill title="Alerts" caption="Shown while something is firing" />
          </Show>
        }
      >
        <Widget fill hue="danger" title="Alerts" value={`${l.alerts().length} firing`}>
          <RowList label="Alerts" variant="inline">
            <For each={l.alerts()}>{(a) => <ListRow icon="triangle-alert" title={a} meta="now" />}</For>
          </RowList>
        </Widget>
      </Show>
    ),
    requests: () => {
      const values = () => l.requests()
      const p50 = () => [...values()].sort((a, b) => a - b)[Math.floor(values().length / 2)]!
      return (
        <Widget
          fill
          size="lg"
          title="Requests"
          value={fmt(values().at(-1)!)}
          unit="/ min"
          axis={AXIS[props.range]}
          foot={
            <WidgetStats
              items={[
                // Getters: the readings move, the rows stay the same objects.
                {
                  label: "p50",
                  get value() {
                    return fmt(p50())
                  },
                },
                {
                  label: "Peak",
                  get value() {
                    return fmt(Math.max(...values()))
                  },
                },
                {
                  label: "Low",
                  get value() {
                    return fmt(Math.min(...values()))
                  },
                },
              ]}
            />
          }
        >
          <WidgetSparkline values={values()} label="Requests per minute" />
        </Widget>
      )
    },
    deploy: () => (
      <Widget fill hue="success" title="Deploy atlas-web" value={DEPLOY_STEPS[l.deployStep()]}>
        <WidgetSteps steps={DEPLOY_STEPS} current={l.deployStep()} label="Deploy steps" />
      </Widget>
    ),
    build: () => (
      <WidgetTimer
        fill
        hue="warning"
        title="Build"
        value={`${l.buildSecs()}s`}
        progress={l.buildSecs() / 30}
        scale={["0", "10", "20", "30s"]}
        label="Build time"
      >
        <WidgetControls>
          <IconButton
            label="Restart the build"
            icon="rotate-ccw"
            tooltip={false}
            onClick={() => l.setBuildSecs(0)}
          />
          <IconButton
            class="nc-wcontrols__primary"
            label={l.buildRunning() ? "Pause the build" : "Resume the build"}
            icon={l.buildRunning() ? "pause" : "play"}
            tooltip={false}
            onClick={() => l.setBuildRunning(!l.buildRunning())}
          />
        </WidgetControls>
      </WidgetTimer>
    ),
    tokens: () => (
      <Widget
        fill
        hue="info"
        figure={String(l.tokens().at(-1))}
        unit="tok/s"
        value={`p50 ${[...l.tokens()].sort((a, b) => a - b)[15]}`}
        label="Agent output, tokens per second"
        axis={["-1m", "Now"]}
      >
        <WidgetSparkline variant="wave" values={l.tokens()} label="Tokens per second, last minute" />
      </Widget>
    ),
    machine: () => (
      <Widget fill title="build-01" value="fra-1">
        <WidgetMeters
          label="build-01"
          items={[
            liveMeter("CPU", l.cpu),
            liveMeter("Memory", l.memory),
            { label: "Disk", value: 48, display: "48%" },
          ]}
        />
      </Widget>
    ),
    queue: () => (
      <Widget fill hue={l.queue() > 85 ? "danger" : "accent"} title="Runner queue" value="8 runners">
        <WidgetGauge value={l.queue()} label="Runner queue" display={`${Math.round(l.queue())}%`} />
      </Widget>
    ),
    disk: () => (
      <Widget fill title="Artifact storage" value="330" unit="/ 500 GB">
        <WidgetSegments
          total={500}
          segments={[
            { label: "Images", value: 190, display: "190G" },
            { label: "Builds", value: 96, display: "96G" },
            { label: "Logs", value: 44, display: "44G" },
          ]}
          free="Free"
          freeDisplay="170G"
          labels="legend"
          label="Artifact storage"
        />
      </Widget>
    ),
    uptime: () => (
      <Widget fill hue="success" title="API uptime" value="99.94%" axis={["30d", "Today"]}>
        <WidgetUptime days={UPTIME_DAYS} label="API uptime, last 30 days" />
      </Widget>
    ),
    budget: () => (
      <Widget
        fill
        size="row"
        title={
          <span class="dm-dash-label">
            Error budget
            <InfoTip label="Error budget">
              The share of this month's allowed errors still unspent. Deploys pause below 10%.
            </InfoTip>
          </span>
        }
        value="64% left"
      >
        <WidgetRing value={64} label="Error budget left" size="sm" />
      </Widget>
    ),
    cycle: () => (
      <Widget fill title="Cycle 24" value="18 / 27">
        <WidgetProgress value={67} start="Nov 18" end="Dec 1" label="Cycle 24 progress" />
      </Widget>
    ),
    issues: () => (
      <Card fill>
        <Stat
          label="Open issues"
          value={42}
          signal={<Delta direction="down" value="8" sentiment="good" />}
          caption="Against last week"
        >
          <WidgetSparkline values={series(21, 46, 6, 9)} label="Open issues per day, last three weeks" />
        </Stat>
      </Card>
    ),
  }
  return <>{views[props.kind]()}</>
}

/** What shows while the first load has nothing to show: the figures' boxes and the grid's first row. */
function Loading() {
  return (
    <div class="dm-dash-page" aria-busy="true">
      <div class="dm-dash-stats">
        <For each={[0, 1, 2, 3]}>{() => <Skeleton height="96px" />}</For>
      </div>
      <Skeleton width="120px" height="16px" />
      <div class="dm-dash-stats">
        <Skeleton height="320px" />
        <Skeleton height="320px" />
      </div>
    </div>
  )
}

export function OverviewView(_props: ShellViewProps) {
  const demo = useDemo()
  const [ready, setReady] = createSignal(loaded)
  const [range, setRange] = createSignal<Range>((demo.storage.get(RANGE_KEY) as Range | null) ?? "7d")
  const [editing, setEditing] = createSignal(false)
  const [items, setItemsRaw] = createSignal<Tile[]>(
    readJson<Tile[]>(demo.storage, LAYOUT_KEY) ?? DEFAULT_LAYOUT,
  )
  const live = createLive()

  onSettled(() => {
    if (loaded) return
    const t = setTimeout(() => {
      loaded = true
      setReady(true)
    }, 600)
    return () => clearTimeout(t)
  })

  const setItems = (next: Tile[]) => {
    setItemsRaw(next)
    writeJson(demo.storage, LAYOUT_KEY, next)
  }
  const missing = () => (Object.keys(KINDS) as TileKind[]).filter((k) => !items().some((i) => i.kind === k))
  const add = (kind: TileKind) => {
    const k = KINDS[kind]
    const at = placeInGrid(items(), { w: k.w, h: k.h })
    setItems([...items(), { id: kind, kind, ...at, w: k.w, h: k.h, minW: k.minW, minH: k.minH }])
  }

  return (
    <ViewLayout
      id="demo.dashboard"
      header={
        <ShellViewHeader
          actions={[
            {
              id: "edit",
              label: editing() ? "Done arranging" : "Arrange widgets",
              icon: "layout-dashboard",
              pressed: editing(),
              onClick: () => setEditing(!editing()),
            },
            {
              id: "add",
              label: "Add widget",
              icon: "plus",
              disabled: !missing().length,
              menu: missing().map((k) => ({ id: k, label: KINDS[k].label })),
              onSelect: (id) => add(id as TileKind),
            },
          ]}
        >
          <Select
            label="Range"
            inline
            options={RANGES}
            value={range()}
            onChange={(v) => {
              setRange(v)
              demo.storage.set(RANGE_KEY, v)
            }}
          />
        </ShellViewHeader>
      }
    >
      <div class="dm-dash-root">
        <Show when={ready()} fallback={<Loading />}>
          <div class="dm-dash-page">
            <div class="dm-dash-stats">
              <For each={HEADLINES[range()]}>
                {(h) => (
                  <StatCard
                    fill
                    label={h.label}
                    value={h.value}
                    unit={h.unit}
                    signal={
                      h.delta ? (
                        <Delta
                          direction={h.delta.direction}
                          value={h.delta.value}
                          sentiment={h.delta.sentiment}
                        />
                      ) : (
                        <span class="nc-meta">{h.limit}</span>
                      )
                    }
                    meter={h.meter}
                  />
                )}
              </For>
            </div>
            <SectionHeading title="Live" />
            <WidgetGrid
              label="Live widgets"
              items={items()}
              editing={editing()}
              empty={live.alerts().length ? [] : ["alerts"]}
              onChange={setItems}
              itemLabel={(t) => KINDS[t.kind].label}
            >
              {(tile) => (
                <div class="dm-dash-tile">
                  <TileView kind={tile().kind} live={live} range={range()} editing={editing()} />
                  <Show when={editing()}>
                    <span class="dm-dash-remove" onPointerDown={(e) => e.stopPropagation()}>
                      <IconButton
                        icon="close"
                        size="sm"
                        label={`Remove ${KINDS[tile().kind].label}`}
                        onClick={() => setItems(items().filter((i) => i.id !== tile().id))}
                      />
                    </span>
                  </Show>
                </div>
              )}
            </WidgetGrid>
          </div>
        </Show>
      </div>
    </ViewLayout>
  )
}
