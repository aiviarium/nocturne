// Operate › Logs: the host's log, live. The filter bar searches it: chips from the QueryBuilder, or the query
// typed as text (`level:error source:health timeout`). Saved searches are kept as the store's `where`, and one
// saved by an older version no longer reads. A log's tab dragged onto the side of the frame opens it beside the
// first, to read two logs side by side.
import {
  Button,
  DropdownMenu,
  emptyQuery,
  FilterBar,
  FilterCount,
  Frame,
  fromWhere,
  LogViewer,
  matchQuery,
  parseQueryText,
  printQueryText,
  QueryBuilder,
  QueryError,
  type QueryField,
  type QueryGroup,
  ShellViewHeader,
  type ShellViewProps,
  SplitGroup,
  StreamState,
  TabDropFrame,
  TabStrip,
  TextField,
  toast,
  toWhere,
  ViewLayout,
  type Where,
} from "@aiviarium/nocturne"
import { createMemo, createSignal, onCleanup, Show } from "solid-js"
import type { Host } from "../data"
import { appendLog, LOG_FILES, type LogLine, logs, toEntry } from "./data"

const DAY = "2026-11-27"

const FIELDS: QueryField[] = [
  { name: "message", label: "Message", type: "text", icon: "scroll-text", aliases: ["msg"] },
  {
    name: "level",
    label: "Level",
    type: "enum",
    icon: "triangle-alert",
    options: [
      { value: "info", label: "Info" },
      { value: "warn", label: "Warning" },
      { value: "error", label: "Error" },
    ],
  },
  {
    name: "source",
    label: "Source",
    type: "enum",
    icon: "server",
    aliases: ["src"],
    options: ["runner", "docker", "health", "sshd"].map((s) => ({ value: s, label: s })),
  },
  { name: "at", label: "Time", type: "date", datetime: true, icon: "clock", key: "time" },
]

const rowOf = (l: LogLine) => ({
  message: l.message,
  level: l.level,
  source: l.source,
  at: `${DAY}T${l.time}`,
})
const NOW = new Date(`${DAY}T17:50:00`)

const query = (rules: QueryGroup["rules"]): QueryGroup => ({ ...emptyQuery(), rules })
/** Saved searches, as the store keeps them. The last was saved when hosts had a `host` field. */
const SAVED: Array<{ id: string; label: string; where: Where }> = [
  {
    id: "errors",
    label: "Errors",
    where: toWhere(query([{ id: "e", field: "level", op: "is", value: "error" }]), FIELDS).where,
  },
  {
    id: "health",
    label: "Health warnings",
    where: toWhere(
      query([
        { id: "h1", field: "source", op: "is", value: "health" },
        { id: "h2", field: "level", op: "is", value: "warn" },
      ]),
      FIELDS,
    ).where,
  },
  { id: "old", label: "build-02 only (2025)", where: { host: "build-02" } },
]

type Tab = "all" | LogLine["file"]
const TABS: Tab[] = ["all", ...LOG_FILES]
const tabLabel = (t: Tab) => (t === "all" ? "All logs" : t)

export function LogsView(props: ShellViewProps) {
  const host = () => props.shell.loc().frame.item as Host
  const [q, setQ] = createSignal<QueryGroup>(emptyQuery())
  const [text, setText] = createSignal<string | null>(null)
  const [unknown, setUnknown] = createSignal<string[]>([])
  // Paused: the stream goes on, and the viewer holds at the line it had.
  const [pausedAt, setPausedAt] = createSignal<number | null>(null)
  const [tabs, setTabs] = createSignal<Tab[]>(TABS)
  const [active, setActive] = createSignal<Tab>("all")
  const [beside, setBeside] = createSignal<Tab | null>(null)
  const [weights, setWeights] = createSignal([1, 1])

  const timer = setInterval(appendLog, 2500)
  onCleanup(() => clearInterval(timer))

  const shown = createMemo(() => {
    const all = logs()
    const cut = pausedAt()
    return cut === null ? all : all.slice(0, cut)
  })
  const matching = createMemo(() => shown().filter((l) => matchQuery(q(), FIELDS, rowOf(l), { now: NOW })))
  const entriesOf = (t: Tab) =>
    matching()
      .filter((l) => t === "all" || l.file === t)
      .map(toEntry)
  const buffered = () => (pausedAt() === null ? 0 : logs().length - pausedAt()!)

  const applyText = () => {
    const t = text()
    if (t === null) return
    const result = parseQueryText(t, FIELDS)
    setQ(result.query)
    setUnknown(result.unknown)
    setText(null)
  }
  const openSaved = (id: string) => {
    const saved = SAVED.find((s) => s.id === id)
    if (!saved) return
    try {
      setQ(fromWhere(saved.where, FIELDS, { now: NOW }))
      setUnknown([])
    } catch (e) {
      if (!(e instanceof QueryError)) throw e
      toast({ title: `Can't open “${saved.label}”`, description: e.message, tone: "danger" })
    }
  }

  const stream = () => (
    <StreamState state={pausedAt() === null ? "live" : "paused"} buffered={buffered() || undefined} />
  )
  const mainTabs = () => tabs().filter((t) => t !== beside())

  const frame = (side: "main" | "beside") => {
    const items = () => (side === "main" ? mainTabs() : [beside()!])
    const current = () => (side === "main" ? active() : beside()!)
    return (
      <Frame
        flush
        class="dm-hosts-frame"
        header={
          <TabStrip
            label={side === "main" ? "Logs" : "Log beside"}
            stripId={side}
            dragGroup="logs"
            items={items().map((t) => ({ id: t, label: tabLabel(t), icon: "logs" as const }))}
            value={current()}
            onChange={(id) => (side === "main" ? setActive(id as Tab) : undefined)}
            onClose={side === "beside" ? () => setBeside(null) : undefined}
            onDrop={(drop) => {
              const id = drop.tabId as Tab
              if (side === "beside") return setBeside(id)
              if (drop.from === "beside") setBeside(null)
              const rest = tabs().filter((t) => t !== id)
              const visible = rest.filter((t) => t !== beside())
              const before = visible[drop.index]
              const at = before ? rest.indexOf(before) : rest.length
              setTabs([...rest.slice(0, at), id, ...rest.slice(at)])
              setActive(id)
            }}
            actions={stream()}
          />
        }
      >
        <TabDropFrame
          dragGroup="logs"
          stripId={side}
          onDrop={(drop) => {
            const id = drop.tabId as Tab
            if (drop.edge === "center") {
              if (side === "main") {
                if (drop.from === "beside") setBeside(null)
                setActive(id)
              } else setBeside(id)
              return
            }
            // A side: the log opens beside the first. The first frame keeps one tab at least.
            if (side === "main" && drop.from === "main" && mainTabs().length > 1) {
              setBeside(id)
              if (active() === id) setActive(mainTabs()[0]!)
            }
          }}
        >
          <LogViewer
            bare
            fill
            showTimestamps
            follow
            label={`${tabLabel(current())} on ${host().name}`}
            entries={entriesOf(current())}
            empty={q().rules.length ? "No lines match" : "No output yet."}
          />
        </TabDropFrame>
      </Frame>
    )
  }

  return (
    <ViewLayout
      id="demo.hosts.logs"
      scroll={false}
      header={
        <ShellViewHeader
          actions={[
            {
              id: "pause",
              label: pausedAt() === null ? "Pause" : "Resume",
              icon: pausedAt() === null ? "pause" : "play",
              pressed: pausedAt() !== null,
              onClick: () => setPausedAt(pausedAt() === null ? logs().length : null),
            },
          ]}
        />
      }
    >
      <div class="dm-hosts-logs">
        <FilterBar
          label="Search the log"
          search={
            <TextField
              variant="search"
              label="Search the log"
              placeholder="level:error source:health timeout"
              mono
              value={text() ?? printQueryText(q(), FIELDS) ?? ""}
              error={unknown().length ? `Not understood: ${unknown().join(" ")}` : undefined}
              onInput={(e) => setText(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyText()
                if (e.key === "Escape" && text() !== null) {
                  e.stopPropagation()
                  setText(null)
                }
              }}
              onBlur={applyText}
            />
          }
          end={
            <>
              <FilterCount value={matching().length} icon="logs" unit="Lines" />
              <DropdownMenu
                label="Saved searches"
                matchWidth={false}
                minWidth="220px"
                items={SAVED.map((s) => ({ id: s.id, label: s.label, icon: "search" as const }))}
                onSelect={openSaved}
                trigger={(t) => (
                  <Button {...t} variant="ghost" size="sm" iconEnd="chevron-down">
                    Saved
                  </Button>
                )}
              />
            </>
          }
        >
          <QueryBuilder
            label="Log filters"
            fields={FIELDS}
            value={q()}
            onChange={(next) => {
              setQ(next)
              setUnknown([])
            }}
          />
        </FilterBar>
        <Show when={beside()} fallback={<div class="dm-hosts-frames">{frame("main")}</div>}>
          <SplitGroup
            class="dm-hosts-frames"
            items={["main", "beside"] as const}
            weights={weights()}
            onResize={setWeights}
            min={280}
            label={() => "Resize the logs"}
          >
            {(side) => frame(side)}
          </SplitGroup>
        </Show>
      </div>
    </ViewLayout>
  )
}
