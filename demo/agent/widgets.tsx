// The widgets of a conversation: what each shows, in each form. A widget knows nothing of where it sits; the zone of
// the chat's widget board it lands in picks the form (see `WidgetForm`). The board is the library's, the same one the
// dashboard's grid uses.
import {
  Button,
  compactCount,
  Icon,
  type IconName,
  StatusDot,
  type StepStatus,
  type WidgetType,
} from "@aiviarium/nocturne"
import type { JSX } from "@solidjs/web"
import { For, Show } from "solid-js"
import { hostById, hosts } from "../hosts/data"
import { CONTEXT_TOTAL, conversationById, decide } from "./data"

const opts =
  (...vs: [string, string][]) =>
  () =>
    vs.map(([value, label]) => ({ value, label }))
const num = (v: string | boolean | undefined, d: number) => (typeof v === "string" ? Number(v) || d : d)

// ── Data ────────────────────────────────────────────────────────────────────────────────────────────────
const conv = (cid: string) => conversationById(cid)
const pct = (cid: string) => Math.round(((conv(cid)?.used ?? 0) / CONTEXT_TOTAL) * 100)
interface Part {
  label: string
  value: number
  color: string
}
const parts = (used: number): Part[] => {
  const rest = Math.max(0, used - 18_000)
  const files = Math.round(rest * 0.4)
  return [
    { label: "System", value: 6_200, color: "var(--label-sky)" },
    { label: "Tools", value: 11_800, color: "var(--label-orchid)" },
    { label: "Files", value: files, color: "var(--label-amber)" },
    { label: "Chat", value: rest - files, color: "var(--accent-strong)" },
  ]
}
const steps = (cid: string) =>
  (conv(cid)?.turns ?? []).flatMap((t) => t.blocks.flatMap((b) => (b.t === "steps" ? b.steps : [])))
const images = (cid: string) =>
  (conv(cid)?.turns ?? []).flatMap((t) =>
    t.blocks.flatMap((b) => (b.t === "media" ? b.items.filter((i) => i.kind === "image") : [])),
  )
const files = (cid: string) => {
  const seen = new Set<string>()
  for (const t of conv(cid)?.turns ?? [])
    for (const b of t.blocks) {
      if (b.t === "steps")
        for (const s of b.steps)
          if (s.icon === "file" || s.verb === "Read" || s.verb === "Edited")
            if (s.arg && /^[\w./-]+\.\w+$/.test(s.arg)) seen.add(s.arg)
      if (b.t === "text")
        for (const seg of b.text) if (typeof seg !== "string" && seg.icon === "file") seen.add(seg.label)
      if (b.t === "media") for (const m of b.items) if (m.kind === "file" && m.name) seen.add(m.name)
    }
  return [...seen]
}
const pending = (cid: string) => {
  for (const t of conv(cid)?.turns ?? [])
    for (const b of t.blocks) if (b.t === "approval" && b.decision === "pending") return { turn: t.id, ...b }
  return undefined
}
/** The host the conversation works on: the last `--host` its commands name. */
const convHost = (cid: string) => {
  let host: string | undefined
  for (const t of conv(cid)?.turns ?? [])
    for (const b of t.blocks) {
      const texts = b.t === "approval" ? b.items : b.t === "steps" ? b.steps.map((s) => s.arg ?? "") : []
      for (const x of texts) {
        const m = /--host\s+(\S+)/.exec(x)
        if (m) host = m[1]
      }
    }
  return host
}
const rates = (cid: string) => conv(cid)?.rates ?? []
const rate = (cid: string) => rates(cid).at(-1) ?? 0
const peak = (cid: string) => Math.max(0, ...rates(cid))
const tone = (cid: string) => (pct(cid) > 80 ? "error" : pct(cid) > 60 ? "warn" : undefined)

// ── Visuals ─────────────────────────────────────────────────────────────────────────────────────────────
let sparkIds = 0
/** A sparkline: a smooth line over a soft area, or rounded bars. Scales to its box. */
function Spark(props: { values: number[]; style?: "line" | "bars"; label: string }) {
  const id = `dmwsp${++sparkIds}`
  const W = 100
  const H = 32
  const max = () => Math.max(1, ...props.values)
  const pts = () => {
    const v = props.values.length ? props.values : [0]
    const step = v.length > 1 ? W / (v.length - 1) : W
    return v.map((y, i) => [i * step, H - 2 - (y / max()) * (H - 6)] as const)
  }
  // A Catmull-Rom curve through the points, as cubic Béziers.
  const line = () => {
    const p = pts()
    if (p.length < 2) return `M0 ${H - 2} H${W}`
    let d = `M${p[0]![0]} ${p[0]![1]}`
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i - 1] ?? p[i]!
      const b = p[i]!
      const c = p[i + 1]!
      const e = p[i + 2] ?? c
      d += ` C${b[0] + (c[0] - a[0]) / 6} ${b[1] + (c[1] - a[1]) / 6} ${c[0] - (e[0] - b[0]) / 6} ${c[1] - (e[1] - b[1]) / 6} ${c[0]} ${c[1]}`
    }
    return d
  }
  return (
    <svg
      class="dm-w-spark"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={props.label}
    >
      <Show
        when={props.style === "bars"}
        fallback={
          <>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="var(--w-hue)" stop-opacity="0.28" />
                <stop offset="1" stop-color="var(--w-hue)" stop-opacity="0" />
              </linearGradient>
            </defs>
            <path d={`${line()} L${W} ${H} L0 ${H} Z`} fill={`url(#${id})`} />
            <path
              d={line()}
              fill="none"
              stroke="var(--w-hue)"
              stroke-width="1.5"
              vector-effect="non-scaling-stroke"
              stroke-linejoin="round"
              stroke-linecap="round"
            />
          </>
        }
      >
        <For each={props.values}>
          {(v, i) => {
            const n = () => Math.max(1, props.values.length)
            const w = () => W / n()
            const h = () => Math.max(1.5, (v / max()) * (H - 4))
            return (
              <rect
                x={i() * w() + w() * 0.18}
                y={H - h()}
                width={w() * 0.64}
                height={h()}
                rx="1"
                fill="var(--w-hue)"
                opacity={v ? 0.9 : 0.25}
              />
            )
          }}
        </For>
      </Show>
    </svg>
  )
}
/** A ring: a thin track and the part used. */
function Ring(props: { value: number; label: string; tone?: "warn" | "error" }) {
  const r = 6
  const c = 2 * Math.PI * r
  return (
    <svg
      class="dm-w-ring"
      viewBox="0 0 16 16"
      role="img"
      aria-label={`${props.label}: ${props.value}%`}
      data-tone={props.tone}
    >
      <circle cx="8" cy="8" r={r} class="dm-w-ring__track" />
      <circle
        cx="8"
        cy="8"
        r={r}
        class="dm-w-ring__arc"
        stroke-dasharray={`${(props.value / 100) * c} ${c}`}
        transform="rotate(-90 8 8)"
      />
    </svg>
  )
}
/** A stacked bar of parts against a total, each part its colour. */
function Stack(props: { parts: Part[]; total: number }) {
  return (
    <div
      class="dm-w-stack"
      role="img"
      aria-label={props.parts.map((p) => `${p.label} ${compactCount(p.value)}`).join(", ")}
    >
      <For each={props.parts}>{(p) => <i style={{ "flex-grow": p.value, background: p.color }} />}</For>
      <i
        class="dm-w-stack__rest"
        style={{ "flex-grow": Math.max(0, props.total - props.parts.reduce((s, p) => s + p.value, 0)) }}
      />
    </div>
  )
}

// ── Shells ──────────────────────────────────────────────────────────────────────────────────────────────
function Card(props: {
  icon: IconName
  label: string
  figure?: JSX.Element
  children: JSX.Element
  foot?: JSX.Element
}) {
  return (
    <div class="dm-w-card">
      <div class="dm-w-card__head">
        <Icon name={props.icon} class="dm-w-card__icon" />
        <span class="dm-w-card__label">{props.label}</span>
        <Show when={props.figure}>
          <span class="dm-w-card__figure">{props.figure}</span>
        </Show>
      </div>
      <div class="dm-w-card__body">{props.children}</div>
      <Show when={props.foot}>
        <div class="dm-w-card__foot">{props.foot}</div>
      </Show>
    </div>
  )
}
function Line(props: {
  icon: IconName
  label: string
  lead?: JSX.Element
  figure?: JSX.Element
  children?: JSX.Element
}) {
  return (
    <div class="dm-w-line">
      <span class="dm-w-line__lead">{props.lead ?? <Icon name={props.icon} />}</span>
      <span class="dm-w-line__label">{props.label}</span>
      <span class="dm-w-line__vis">{props.children}</span>
      <Show when={props.figure}>
        <span class="dm-w-line__figure">{props.figure}</span>
      </Show>
    </div>
  )
}
function Chip(props: { lead: JSX.Element; figure?: JSX.Element; label: string }) {
  return (
    <span class="dm-w-chip">
      <span class="dm-w-chip__lead">{props.lead}</span>
      <span class="dm-w-chip__label">{props.label}</span>
      <Show when={props.figure}>
        <span class="dm-w-chip__figure">{props.figure}</span>
      </Show>
    </span>
  )
}
function Tile(props: { lead: JSX.Element; figure?: JSX.Element }) {
  return (
    <span class="dm-w-tile">
      <span class="dm-w-tile__lead">{props.lead}</span>
      <Show when={props.figure}>
        <span class="dm-w-tile__figure">{props.figure}</span>
      </Show>
    </span>
  )
}
const STEP_DOT: Record<StepStatus, "ok" | "ai" | "error" | "neutral"> = {
  ok: "ok",
  running: "ai",
  error: "error",
  pending: "neutral",
}
const ic = (name: IconName) => <Icon name={name} size="sm" />

export const CHAT_WIDGETS: Record<string, WidgetType<string>> = {
  context: {
    id: "context",
    label: "Context",
    icon: "gauge",
    hint: "How full the context window is",
    settings: [
      { key: "breakdown", label: "Breakdown", kind: "toggle", default: true },
      {
        key: "figure",
        label: "Figure",
        kind: "choice",
        options: opts(["tokens", "Tokens"], ["percent", "Percent"]),
        default: "tokens",
      },
    ],
    live: () => true,
    mark: (cid) => tone(cid),
    render: (cid, mode, cfg) => {
      const used = () => conv(cid)?.used ?? 0
      const ring = () => <Ring value={pct(cid)} label="Context used" tone={tone(cid)} />
      if (mode === "tile") return <Tile lead={ring()} figure={`${pct(cid)}`} />
      if (mode === "chip" || mode === "row")
        return <Chip lead={ring()} label="Context" figure={`${pct(cid)}%`} />
      if (mode === "line")
        return (
          <Line icon="gauge" label="Context" lead={ring()} figure={`${pct(cid)}%`}>
            <Stack parts={parts(used())} total={CONTEXT_TOTAL} />
          </Line>
        )
      return (
        <Card
          icon="gauge"
          label="Context"
          figure={
            cfg.figure === "percent" ? (
              `${pct(cid)}%`
            ) : (
              <>
                {compactCount(used())}
                <span class="dm-w-dim"> / {compactCount(CONTEXT_TOTAL)}</span>
              </>
            )
          }
        >
          <Stack parts={parts(used())} total={CONTEXT_TOTAL} />
          <Show when={cfg.breakdown}>
            <div class="dm-w-legend">
              <For each={parts(used())}>
                {(p) => (
                  <span class="dm-w-legend__item">
                    <i style={{ background: p.color }} />
                    <span>{p.label}</span>
                    <b>{compactCount(p.value)}</b>
                  </span>
                )}
              </For>
            </div>
          </Show>
        </Card>
      )
    },
  },
  output: {
    id: "output",
    label: "Output",
    icon: "activity",
    hint: "The reply's rate, in tokens a second",
    settings: [
      {
        key: "window",
        label: "Window",
        kind: "choice",
        options: opts(["20", "Last 20 s"], ["60", "Last minute"]),
        default: "60",
      },
      {
        key: "style",
        label: "Style",
        kind: "choice",
        options: opts(["line", "Line"], ["bars", "Bars"]),
        default: "line",
      },
    ],
    live: () => true,
    mark: (cid) => (rate(cid) > 0 ? "ai" : undefined),
    render: (cid, mode, cfg) => {
      const shown = () =>
        cfg.window === "20" ? rates(cid).slice(-Math.ceil(rates(cid).length / 3)) : rates(cid)
      const style = () => (cfg.style === "bars" ? "bars" : "line")
      const spark = () => <Spark values={shown()} style={style()} label="Output rate" />
      const fig = () =>
        rate(cid) > 0 ? (
          <>
            {rate(cid)}
            <span class="dm-w-dim"> tok/s</span>
          </>
        ) : (
          <span class="dm-w-dim">Idle</span>
        )
      if (mode === "tile") return <Tile lead={ic("activity")} figure={`${rate(cid)}`} />
      if (mode === "chip" || mode === "row")
        return <Chip lead={<span class="dm-w-mini-spark">{spark()}</span>} label="Output" figure={fig()} />
      if (mode === "line")
        return (
          <Line icon="activity" label="Output" figure={fig()}>
            {spark()}
          </Line>
        )
      return (
        <Card
          icon="activity"
          label="Output"
          figure={fig()}
          foot={
            <>
              <span>Peak {peak(cid)} tok/s</span>
              <span>{cfg.window === "20" ? "Last 20 s" : "Last minute"}</span>
            </>
          }
        >
          <div class="dm-w-chart">{spark()}</div>
        </Card>
      )
    },
  },
  approval: {
    id: "approval",
    label: "Approval",
    icon: "shield",
    hint: "What waits on your decision, with the command it would run",
    settings: [
      { key: "command", label: "Show the command", kind: "toggle", default: true },
      { key: "transcript", label: "Also in the transcript", kind: "toggle", default: true },
    ],
    expands: (cid) => !!pending(cid),
    live: (cid) => !!pending(cid),
    mark: (cid) => (pending(cid) ? "warn" : undefined),
    render: (cid, mode, cfg) => {
      const p = () => pending(cid)
      const actions = () => (
        <Show when={p()}>
          {(a) => (
            <span class="dm-w-actions">
              <Button size="sm" variant="ghost" onClick={() => decide(cid, a().turn, false)}>
                Deny
              </Button>
              <Button size="sm" onClick={() => decide(cid, a().turn, true)}>
                Run it
              </Button>
            </span>
          )}
        </Show>
      )
      if (mode === "tile") return <Tile lead={ic("shield")} figure={p() ? "1" : undefined} />
      if (mode === "chip")
        return (
          <Chip
            lead={ic("shield")}
            label="Approval"
            figure={p() ? <span class="dm-w-warn">Needs you</span> : "None"}
          />
        )
      if (mode === "row")
        return (
          <Show when={p()}>
            {(a) => (
              <div class="dm-w-ask" role="group" aria-label="Approval needed">
                <StatusDot status="warn" />
                <div class="dm-w-ask__text">
                  <span class="dm-w-ask__summary">{a().summary}</span>
                  <Show when={cfg.command}>
                    <code class="dm-w-ask__cmd">{a().items[0]}</code>
                  </Show>
                </div>
                {actions()}
              </div>
            )}
          </Show>
        )
      if (mode === "line")
        return (
          <Line
            icon="shield"
            label={p()?.summary ?? "Nothing to approve"}
            lead={<StatusDot status={p() ? "warn" : "neutral"} />}
          >
            {actions()}
          </Line>
        )
      return (
        <Card
          icon="shield"
          label="Approval"
          figure={p() ? <span class="dm-w-warn">Needs you</span> : <span class="dm-w-dim">None</span>}
        >
          <Show when={p()} fallback={<span class="dm-w-empty">Nothing waits on you.</span>}>
            {(a) => (
              <>
                <span class="dm-w-strong">{a().summary}</span>
                <Show when={cfg.command}>
                  <code class="dm-w-code">{a().items[0]}</code>
                </Show>
                {actions()}
              </>
            )}
          </Show>
        </Card>
      )
    },
  },
  tools: {
    id: "tools",
    // Taller cards in a column, picked by resizing: a longer list, a bigger display.
    heights: [160, 240],
    label: "Tools",
    icon: "wrench",
    hint: "The agent's latest tool calls",
    settings: [
      {
        key: "rows",
        label: "Rows",
        kind: "choice",
        options: opts(["3", "3"], ["5", "5"], ["8", "8"]),
        default: "3",
      },
      { key: "failures", label: "Only failures", kind: "toggle", default: false },
    ],
    live: (cid) => steps(cid).length > 0,
    mark: (cid) =>
      steps(cid).some((s) => s.status === "error")
        ? "error"
        : steps(cid).some((s) => s.status === "running")
          ? "ai"
          : undefined,
    render: (cid, mode, cfg) => {
      const all = () => steps(cid)
      const listed = () => (cfg.failures ? all().filter((s) => s.status === "error") : all())
      const last = () => all().at(-1)
      if (mode === "tile") return <Tile lead={ic("wrench")} figure={`${all().length}`} />
      if (mode === "chip" || mode === "row")
        return <Chip lead={ic("wrench")} label="Tools" figure={`${all().length}`} />
      if (mode === "line")
        return (
          <Line icon="wrench" label="Tools" figure={`${all().length}`}>
            <span class="dm-w-mono dm-w-dim">
              {last()?.verb} {last()?.arg}
            </span>
          </Line>
        )
      return (
        <Card icon="wrench" label="Tools" figure={`${all().length}`}>
          <div class="dm-w-rows">
            <Show when={!listed().length}>
              <span class="dm-w-empty">No failed calls.</span>
            </Show>
            <For each={listed().slice(-num(cfg.rows, 3)).reverse()}>
              {(s) => (
                <span class="dm-w-row">
                  <StatusDot status={STEP_DOT[s.status ?? "ok"]} />
                  <span class="dm-w-row__verb">{s.verb}</span>
                  <span class="dm-w-mono dm-w-row__arg">{s.arg}</span>
                </span>
              )}
            </For>
          </div>
        </Card>
      )
    },
  },
  files: {
    id: "files",
    // Taller cards in a column, picked by resizing: a longer list, a bigger display.
    heights: [160, 240],
    label: "Files",
    icon: "file",
    hint: "Files the conversation touched",
    settings: [
      {
        key: "rows",
        label: "Rows",
        kind: "choice",
        options: opts(["3", "3"], ["5", "5"], ["10", "10"]),
        default: "5",
      },
    ],
    live: (cid) => files(cid).length > 0,
    render: (cid, mode, cfg) => {
      const list = () => files(cid)
      if (mode === "tile") return <Tile lead={ic("file")} figure={`${list().length}`} />
      if (mode === "chip" || mode === "row")
        return <Chip lead={ic("file")} label="Files" figure={`${list().length}`} />
      if (mode === "line")
        return (
          <Line icon="file" label="Files" figure={`${list().length}`}>
            <span class="dm-w-mono dm-w-dim">{list().slice(0, 2).join(", ")}</span>
          </Line>
        )
      return (
        <Card icon="file" label="Files" figure={`${list().length}`}>
          <div class="dm-w-rows">
            <For each={list().slice(0, num(cfg.rows, 5))}>
              {(f) => (
                <span class="dm-w-row">
                  <span class="dm-w-mono dm-w-row__arg dm-w-row__arg--file">{f}</span>
                </span>
              )}
            </For>
          </div>
        </Card>
      )
    },
  },
  images: {
    id: "images",
    label: "Images",
    icon: "image",
    hint: "Images in the conversation",
    settings: [
      {
        key: "max",
        label: "Thumbnails",
        kind: "choice",
        options: opts(["3", "3"], ["6", "6"], ["9", "9"]),
        default: "6",
      },
    ],
    live: (cid) => images(cid).length > 0,
    render: (cid, mode, cfg) => {
      const list = () => images(cid)
      if (mode === "tile") return <Tile lead={ic("image")} figure={`${list().length}`} />
      if (mode === "chip" || mode === "row")
        return <Chip lead={ic("image")} label="Images" figure={`${list().length}`} />
      const thumbs = (n: number) => (
        <span class="dm-w-thumbs">
          <For each={list().slice(0, n)}>{(m) => <img src={m.src} alt={m.alt ?? ""} />}</For>
        </span>
      )
      if (mode === "line")
        return (
          <Line icon="image" label="Images" figure={`${list().length}`}>
            {thumbs(3)}
          </Line>
        )
      return (
        <Card icon="image" label="Images" figure={`${list().length}`}>
          {thumbs(num(cfg.max, 6))}
        </Card>
      )
    },
  },
  screen: {
    id: "screen",
    // Taller cards in a column, picked by resizing: a longer list, a bigger display.
    heights: [240, 320],
    label: "Screen",
    icon: "monitor",
    hint: "A host's display, live",
    multiple: true,
    settings: [
      {
        key: "host",
        label: "Host",
        kind: "choice",
        options: () => [
          { value: "auto", label: "The conversation's" },
          ...hosts().map((h) => ({ value: h.id, label: h.name })),
        ],
        default: "auto",
      },
      {
        key: "refresh",
        label: "Refresh",
        kind: "choice",
        options: opts(["live", "Live"], ["5", "Every 5 s"], ["paused", "Paused"]),
        default: "live",
      },
      { key: "cursor", label: "Show the cursor", kind: "toggle", default: true },
    ],
    live: () => true,
    mark: (_cid, cfg) => (cfg.refresh === "live" ? "ai" : undefined),
    render: (cid, mode, cfg) => {
      const hostId = () => (cfg.host === "auto" ? convHost(cid) : String(cfg.host))
      const host = () => {
        const h = hostId()
        return h ? (hostById(h)?.name ?? h) : undefined
      }
      const state = () =>
        cfg.refresh === "live" ? "Live" : cfg.refresh === "paused" ? "Paused" : "Every 5 s"
      if (mode === "tile") return <Tile lead={ic("monitor")} />
      if (mode === "chip" || mode === "row")
        return <Chip lead={ic("monitor")} label="Screen" figure={state()} />
      if (mode === "line")
        return (
          <Line icon="monitor" label="Screen" figure={state()}>
            <span class="dm-w-dim">{host()}</span>
          </Line>
        )
      return (
        <Card
          icon="monitor"
          label="Screen"
          figure={
            <span class="dm-w-state" data-live={cfg.refresh === "live" ? "" : undefined}>
              {state()}
            </span>
          }
          foot={<span>{host() ?? "No host yet"}</span>}
        >
          <Show
            when={host()}
            fallback={<div class="dm-w-screen dm-w-screen--none">The conversation runs on no host yet.</div>}
          >
            <div class="dm-w-screen" data-paused={cfg.refresh === "paused" ? "" : undefined}>
              <div class="dm-w-screen__term">
                <span>$ crow ci run deploy-arm64 --host {host()}</span>
                <span class="dm-w-dim">pulling base:2026.11 … done</span>
                <span class="dm-w-dim">waiting for healthcheck (2/3)</span>
                <span class="dm-w-screen__caret" />
              </div>
              <Show when={cfg.cursor}>
                <span class="dm-w-screen__cursor" />
              </Show>
            </div>
          </Show>
        </Card>
      )
    },
  },
}
