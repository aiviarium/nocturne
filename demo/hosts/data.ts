// The hosts' own data: the fleet's facts, the sessions running on each host and which of them are open as
// terminals, the deploys with their config changes, the files' contents and a log that grows while it is live.
// The view and the bottom panel share the open terminals, so a session opened in one is a tab in the other.
import type { DockLayout, LogEntry, TabStatus } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import { HOSTS, type Host, LOGS, SESSIONS, type Session } from "../data"

// ── The fleet ─────────────────────────────────────────────────────────────────────────────────────────

export interface HostFacts {
  os: string
  arch: string
  kernel: string
  ip: string
  cpu: number
  memory: string
  uptime: string
  agent: string
}

const FACTS: Record<string, HostFacts> = {
  "build-01": {
    os: "Debian 13",
    arch: "arm64",
    kernel: "6.12.9",
    ip: "10.0.4.21",
    cpu: 64,
    memory: "11.2 of 32 GB",
    uptime: "12 days",
    agent: "crow 2.8.1",
  },
  "build-02": {
    os: "Debian 13",
    arch: "amd64",
    kernel: "6.12.9",
    ip: "10.0.4.22",
    cpu: 92,
    memory: "29.6 of 32 GB",
    uptime: "3 days",
    agent: "crow 2.8.1",
  },
  "edge-ams": {
    os: "Alpine 3.22",
    arch: "amd64",
    kernel: "6.6.70",
    ip: "10.2.0.5",
    cpu: 12,
    memory: "1.4 of 8 GB",
    uptime: "41 days",
    agent: "crow 2.7.4",
  },
}
const NEW_FACTS: HostFacts = {
  os: "Unknown",
  arch: "amd64",
  kernel: "—",
  ip: "—",
  cpu: 0,
  memory: "—",
  uptime: "—",
  agent: "Not installed",
}
export const factsOf = (id: string): HostFacts => FACTS[id] ?? NEW_FACTS

const [added, setAdded] = createSignal<Host[]>([], { ownedWrite: true })
/** The fleet: the shared hosts and the ones added in the demo. */
export const hosts = () => [...HOSTS, ...added()]
export const hostById = (id: string) => hosts().find((h) => h.id === id)
export const addHost = (name: string, region: string) => {
  const id = name.toLowerCase().replace(/[^a-z0-9-]+/g, "-")
  setAdded((list) => [...list, { id, name, region, state: "offline" }])
  return id
}
export const REGIONS = ["fra-1", "ams-2", "lon-1", "nyc-3"]

export interface Service {
  name: string
  state: "ok" | "warn" | "error" | "off"
  detail: string
}
export const SERVICES: Record<string, Service[]> = {
  "build-01": [
    { name: "runner", state: "ok", detail: "2 jobs" },
    { name: "docker", state: "ok", detail: "14 containers" },
    { name: "health", state: "warn", detail: "slow checks" },
    { name: "sshd", state: "ok", detail: "3 sessions" },
  ],
  "build-02": [
    { name: "runner", state: "warn", detail: "queue backing up" },
    { name: "docker", state: "ok", detail: "9 containers" },
    { name: "backup", state: "error", detail: "last run failed" },
  ],
  "edge-ams": [
    { name: "caddy", state: "ok", detail: "1.2k req/min" },
    { name: "crow", state: "ok", detail: "idle" },
  ],
}

// ── Sessions and the open terminals ───────────────────────────────────────────────────────────────────

export interface HostSession extends Session {
  command: string
}

const COMMANDS: Record<string, string> = {
  s_7f2a: "crow agent run --task WEB-142 --runner arm64 --env staging --keep-workdir --trace",
  s_7e91: "npm test -- --watch --reporter=dot",
  s_7c44: "make release TARGET=aarch64-unknown-linux-gnu",
  s_7b02: "/bin/zsh -l",
  s_7d10: "apt upgrade -y",
  s_8a01: "crow agent review --pr 418",
}

const [sessions, setSessions] = createSignal<HostSession[]>(
  SESSIONS.map((s) => ({ ...s, command: COMMANDS[s.id] ?? s.title })),
  { ownedWrite: true },
)

export { sessions }
export const sessionsOf = (host: string) => sessions().filter((s) => s.host === host)
export const sessionById = (id?: string) => sessions().find((s) => s.id === id)

export const SESSION_DOT = { running: "live", exited: "neutral", failed: "error" } as const
export const SESSION_LABEL = { running: "Running", exited: "Exited", failed: "Failed" } as const
export const tabStatus = (s: HostSession): TabStatus | undefined =>
  s.state === "failed" ? "failed" : s.state === "running" ? "running" : "exited"

/** The open terminals per host, in tab order, and the one in front: the dock's tabs and the panel's. */
const [open, setOpen] = createSignal<Record<string, string[]>>(
  { "build-01": ["s_7f2a", "s_7e91", "s_7c44"] },
  { ownedWrite: true },
)
const [front, setFront] = createSignal<Record<string, string>>({ "build-01": "s_7f2a" }, { ownedWrite: true })

export const openOf = (host: string) => open()[host] ?? []
export const frontOf = (host: string) => {
  const ids = openOf(host)
  const f = front()[host]
  return f && ids.includes(f) ? f : (ids[0] ?? "")
}
export const setOpenOf = (host: string, ids: string[]) => setOpen((o) => ({ ...o, [host]: ids }))
export const setFrontOf = (host: string, id: string) => setFront((f) => ({ ...f, [host]: id }))

/** Opens a session as a terminal on its host and puts it in front. */
export const openSession = (host: string, id: string) => {
  if (!openOf(host).includes(id)) setOpenOf(host, [...openOf(host), id])
  setFrontOf(host, id)
}
export const closeSessions = (host: string, ids: string[]) => {
  const left = openOf(host).filter((x) => !ids.includes(x))
  setOpenOf(host, left)
  if (ids.includes(frontOf(host))) setFrontOf(host, left.at(-1) ?? "")
}

let made = 0
/** Starts a shell on a host: a new session, open in front. */
export const newSession = (host: string) => {
  made += 1
  const id = `s_n${made}`
  setSessions((list) => [
    ...list,
    {
      id,
      host,
      title: made === 1 ? "zsh" : `zsh ${made}`,
      user: "mira",
      state: "running",
      started: "now",
      command: "/bin/zsh -l",
      lines: [],
    },
  ])
  openSession(host, id)
  return id
}
export const renameSession = (id: string, title: string) =>
  setSessions((list) => list.map((s) => (s.id === id ? { ...s, title } : s)))
export const endSession = (id: string) =>
  setSessions((list) =>
    list.map((s) =>
      s.id === id
        ? { ...s, state: "exited", lines: [...s.lines, "^C", "[process exited with code 130]"] }
        : s,
    ),
  )

/** Each host's dock, as the person arranged it. */
const [docks, setDocks] = createSignal<Record<string, DockLayout>>({}, { ownedWrite: true })
export const dockOf = (host: string) => docks()[host]
export const setDockOf = (host: string, layout: DockLayout) => setDocks((d) => ({ ...d, [host]: layout }))

// ── Logs ──────────────────────────────────────────────────────────────────────────────────────────────

export interface LogLine {
  id: number
  time: string
  level: "info" | "warn" | "error"
  source: string
  message: string
  file: "runner.log" | "deploy.log" | "auth.log"
}

const FILE_OF: Record<string, LogLine["file"]> = {
  runner: "runner.log",
  docker: "deploy.log",
  health: "deploy.log",
  sshd: "auth.log",
}

const seed: LogLine[] = LOGS.map((l, i) => ({
  id: i,
  time: l.t,
  level: l.level,
  source: l.src,
  message: l.msg,
  file: FILE_OF[l.src] ?? "runner.log",
}))

const MORE: Array<Omit<LogLine, "id" | "time" | "file">> = [
  { level: "info", source: "runner", message: "job 8814 picked up (lint)" },
  { level: "info", source: "docker", message: "container lint-8814 started" },
  { level: "warn", source: "health", message: "healthcheck pending after 3s, retrying" },
  { level: "info", source: "health", message: "healthcheck passed after 4s" },
  { level: "info", source: "runner", message: "job 8814 finished in 12s" },
  { level: "info", source: "sshd", message: "session closed for operator" },
  { level: "error", source: "docker", message: "pull of base:2026.11 failed: connection reset" },
  { level: "info", source: "docker", message: "retrying pull of base:2026.11" },
]

const [logs, setLogs] = createSignal<LogLine[]>(seed, { ownedWrite: true })

export { logs }

let tick = 0
/** One more line, as the live stream would bring it. */
export const appendLog = () => {
  const next = MORE[tick % MORE.length]!
  tick += 1
  const last = logs().at(-1)
  const [h, m, s] = (last?.time ?? "17:46:00").split(":").map(Number) as [number, number, number]
  const t = h * 3600 + m * 60 + s + 7
  const time = [Math.floor(t / 3600) % 24, Math.floor(t / 60) % 60, t % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":")
  setLogs((list) => [...list, { ...next, id: list.length, time, file: FILE_OF[next.source] ?? "runner.log" }])
}
export const LOG_FILES: LogLine["file"][] = ["runner.log", "deploy.log", "auth.log"]
/**
 * A line as the LogViewer takes it, made once per line: the viewer keeps rows by object, not by `id`, so a fresh
 * object for the same line would draw its row again.
 */
const entries = new WeakMap<LogLine, LogEntry>()
export const toEntry = (l: LogLine): LogEntry => {
  let e = entries.get(l)
  if (!e) {
    e = { id: l.id, at: l.time, level: l.level, text: `${l.source.padEnd(7)} ${l.message}` }
    entries.set(l, e)
  }
  return e
}

// ── Files ─────────────────────────────────────────────────────────────────────────────────────────────

const DEPLOY_YML = `# Deploys Atlas web to the arm64 runners.
name: deploy
on:
  push:
    branches: [main]

jobs:
  deploy-arm64:
    runs-on: [self-hosted, arm64]
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - run: docker pull base:2026.11
      - run: ./ci/healthcheck.sh --retries 5 --interval 2s
      - run: ./ci/release.sh --target staging
`

export const CONTENT: Record<string, { language: string; code: string }> = {
  "deploy.yml": { language: "yaml", code: DEPLOY_YML },
  "ci/deploy.yml": { language: "yaml", code: DEPLOY_YML },
  "runner.toml": {
    language: "toml",
    code: `[runner]
name = "build-01"
labels = ["self-hosted", "arm64"]
concurrency = 4

[runner.docker]
image = "base:2026.11"
pull = "always"
`,
  },
  ".bashrc": {
    language: "shell",
    code: `export PATH="$HOME/.local/bin:$PATH"
export EDITOR=vim
alias ll='ls -la'
alias crowlogs='journalctl -fu crow'
`,
  },
  "src/main.ts": {
    language: "typescript",
    code: `import { serve } from "./api/routes"
import { session } from "./auth/session"

const port = Number(process.env.PORT ?? 8080)

serve({ port, session })
console.log(\`listening on \${port}\`)
`,
  },
  "src/api/health.ts": {
    language: "typescript",
    code: `export function health(): Response {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  })
}
`,
  },
  "src/auth/session.ts": {
    language: "typescript",
    code: `export interface Session {
  user: string
  expires: number
}

/** Reads the session cookie behind a path-prefixed proxy. */
export function session(request: Request, prefix = "/"): Session | undefined {
  const cookie = request.headers.get("cookie") ?? ""
  const match = /sid=([^;]+)/.exec(cookie)
  if (!match) return undefined
  return { user: decodeURIComponent(match[1]!), expires: Date.now() + 3600_000 }
}
`,
  },
}

// ── Deploys ───────────────────────────────────────────────────────────────────────────────────────────

export interface Deploy {
  id: string
  host: string
  title: string
  commit: string
  by: string
  ago: string
  duration: string
  state: "live" | "failed" | "rolled-back" | "superseded"
  path: string
  before: string
  after: string
  output: string[]
  exit?: number
}

const RUNNER_BEFORE = `[runner]
name = "build-01"
labels = ["self-hosted", "arm64"]
concurrency = 2

[runner.docker]
image = "base:2026.10"
pull = "if-missing"
`
const RUNNER_AFTER = CONTENT["runner.toml"]!.code

export const DEPLOYS: Deploy[] = [
  {
    id: "412",
    host: "build-01",
    title: "Runner config: base image 2026.11, 4 jobs at once",
    commit: "9c1e4fa",
    by: "Mira Okonkwo",
    ago: "2h",
    duration: "48s",
    state: "live",
    path: "runner.toml",
    before: RUNNER_BEFORE,
    after: RUNNER_AFTER,
    output: [
      "→ uploading runner.toml",
      "→ restarting runner",
      "  ✓ runner up (pid 4121)",
      "→ healthcheck",
      "  ✓ healthy after 4s",
    ],
    exit: 0,
  },
  {
    id: "411",
    host: "build-01",
    title: "Healthcheck retries every 2s",
    commit: "51ab07d",
    by: "Jonas Lindqvist",
    ago: "1d",
    duration: "1m 12s",
    state: "failed",
    path: "ci/deploy.yml",
    before: DEPLOY_YML.replace("--retries 5 --interval 2s", "--retries 3"),
    after: DEPLOY_YML,
    output: [
      "→ uploading ci/deploy.yml",
      "→ running deploy-arm64",
      "  … waiting for runner healthcheck",
      "  ✗ step deploy-arm64 timed out after 20s",
    ],
    exit: 1,
  },
  {
    id: "409",
    host: "build-01",
    title: "Pin docker to 27.4",
    commit: "e03d9b2",
    by: "Tomás Ruiz",
    ago: "4d",
    duration: "35s",
    state: "superseded",
    path: "runner.toml",
    before: RUNNER_BEFORE.replace('image = "base:2026.10"', 'image = "base:2026.09"'),
    after: RUNNER_BEFORE,
    output: ["→ uploading runner.toml", "→ restarting runner", "  ✓ runner up (pid 3310)"],
    exit: 0,
  },
  {
    id: "88",
    host: "build-02",
    title: "Nightly backup to the new bucket",
    commit: "7f20c11",
    by: "Sarah Chen",
    ago: "3d",
    duration: "22s",
    state: "rolled-back",
    path: "backup.toml",
    before: `[backup]\nbucket = "acme-backups"\nschedule = "0 3 * * *"\n`,
    after: `[backup]\nbucket = "acme-backups-eu"\nschedule = "0 3 * * *"\n`,
    output: ["→ uploading backup.toml", "→ test run", "  ✗ bucket acme-backups-eu: access denied"],
    exit: 1,
  },
]
export const deploysOf = (host: string) => DEPLOYS.filter((d) => d.host === host)
export const DEPLOY_STATE = {
  live: { dot: "ok", label: "Live" },
  failed: { dot: "error", label: "Failed" },
  "rolled-back": { dot: "warn", label: "Rolled back" },
  superseded: { dot: "neutral", label: "Superseded" },
} as const
