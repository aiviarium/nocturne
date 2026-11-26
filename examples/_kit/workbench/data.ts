// The flagship's scenario: Acme, a workspace with an inbox, projects and hosts. Atlas web's issues, triage
// reports and the inbox come from the same list; build-01 has terminal sessions, logs and files.
import type { LabelHue } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"

export interface Person {
  id: string
  name: string
  hue: LabelHue
}
export const PEOPLE: Person[] = [
  { id: "mira", name: "Mira Okonkwo", hue: "orchid" },
  { id: "jonas", name: "Jonas Lindqvist", hue: "sky" },
  { id: "sarah", name: "Sarah Chen", hue: "amber" },
  { id: "tomas", name: "Tomás Ruiz", hue: "mint" },
]
export const ME = PEOPLE[0]!
export const person = (id?: string) => PEOPLE.find((p) => p.id === id)

export interface Project {
  id: string
  name: string
  key: string
  hue: LabelHue
}
export const PROJECTS: Project[] = [
  { id: "atlas", name: "Atlas web", key: "WEB", hue: "sky" },
  { id: "fleet-agent", name: "Fleet agent", key: "FLT", hue: "mint" },
  { id: "docs-site", name: "Docs site", key: "DOC", hue: "amber" },
]

export type IssueState = "backlog" | "todo" | "progress" | "review" | "blocked" | "done"
export type Priority = "urgent" | "high" | "medium" | "low" | "none"

export interface Issue {
  id: string
  project: string
  key: string
  title: string
  state: IssueState
  priority: Priority
  assignee?: string
  labels: Array<{ name: string; hue: LabelHue }>
  updated: string
  cycle?: string
  estimate?: number
  description: string
}

export const STATE_LABEL: Record<IssueState, string> = {
  backlog: "Backlog",
  todo: "Todo",
  progress: "In progress",
  review: "In review",
  blocked: "Blocked",
  done: "Done",
}
/** The order of an issue list's groups. */
export const STATE_ORDER: IssueState[] = ["blocked", "progress", "review", "todo", "backlog", "done"]
export const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "No priority",
}

const BUG = { name: "Bug", hue: "rose" } as const
const FEATURE = { name: "Feature", hue: "accent" } as const
const AUTH = { name: "Auth", hue: "amber" } as const

const SEED: Issue[] = [
  {
    id: "142",
    project: "atlas",
    key: "WEB-142",
    title: "Flaky deploy test on the arm64 runner",
    state: "blocked",
    priority: "urgent",
    assignee: "mira",
    labels: [BUG],
    updated: "12m",
    cycle: "Cycle 24",
    estimate: 3,
    description:
      "The runner times out on the second deploy step about one run in five. It started after the image moved to the new base layer.",
  },
  {
    id: "141",
    project: "atlas",
    key: "WEB-141",
    title: "Empty state for the activity feed",
    state: "progress",
    priority: "medium",
    assignee: "jonas",
    labels: [FEATURE],
    updated: "1h",
    cycle: "Cycle 24",
    estimate: 2,
    description: "A new workspace shows an empty feed with no way forward.",
  },
  {
    id: "138",
    project: "atlas",
    key: "WEB-138",
    title: "Command palette ranks recent places first",
    state: "progress",
    priority: "medium",
    assignee: "mira",
    labels: [FEATURE],
    updated: "4h",
    cycle: "Cycle 24",
    estimate: 3,
    description: "Places the person opened lately come before matches by name.",
  },
  {
    id: "139",
    project: "atlas",
    key: "WEB-139",
    title: "Sign-in loops behind a path-prefixed proxy",
    state: "review",
    priority: "high",
    assignee: "sarah",
    labels: [BUG, AUTH],
    updated: "3h",
    cycle: "Cycle 24",
    estimate: 2,
    description: "The redirect after sign-in drops the prefix, so the app sends the person back to sign in.",
  },
  {
    id: "133",
    project: "atlas",
    key: "WEB-133",
    title: "Move the read replicas behind the shared load balancer",
    state: "todo",
    priority: "high",
    labels: [{ name: "Infra", hue: "teal" }],
    updated: "1d",
    cycle: "Cycle 25",
    estimate: 5,
    description: "Each replica has its own address today.",
  },
  {
    id: "137",
    project: "atlas",
    key: "WEB-137",
    title: "Contrast of muted labels in light mode",
    state: "todo",
    priority: "low",
    assignee: "tomas",
    labels: [{ name: "Design", hue: "orchid" }],
    updated: "5h",
    cycle: "Cycle 24",
    estimate: 1,
    description: "The fourth text colour fails contrast on the light canvas.",
  },
  {
    id: "129",
    project: "atlas",
    key: "WEB-129",
    title: "Saved filters sync across devices",
    state: "backlog",
    priority: "low",
    assignee: "jonas",
    labels: [],
    updated: "3d",
    description: "",
  },
  {
    id: "130",
    project: "atlas",
    key: "WEB-130",
    title: "Keyboard shortcut sheet: rebind and reset",
    state: "backlog",
    priority: "none",
    labels: [FEATURE],
    updated: "2d",
    description: "Let the person rebind a shortcut and reset all of them.",
  },
  {
    id: "127",
    project: "atlas",
    key: "WEB-127",
    title: "Drop the legacy session cookie",
    state: "done",
    priority: "medium",
    assignee: "mira",
    labels: [AUTH],
    updated: "5d",
    cycle: "Cycle 23",
    description: "",
  },
  {
    id: "128",
    project: "atlas",
    key: "WEB-128",
    title: "Widget picker remembers the last category",
    state: "done",
    priority: "low",
    assignee: "sarah",
    labels: [FEATURE],
    updated: "4d",
    cycle: "Cycle 23",
    description: "",
  },
  {
    id: "61",
    project: "fleet-agent",
    key: "FLT-61",
    title: "Report the runner's architectures on register",
    state: "progress",
    priority: "high",
    assignee: "jonas",
    labels: [FEATURE],
    updated: "2h",
    description: "",
  },
  {
    id: "58",
    project: "fleet-agent",
    key: "FLT-58",
    title: "Drain waits for jobs that never finish",
    state: "todo",
    priority: "medium",
    labels: [BUG],
    updated: "1d",
    description: "",
  },
]

/** The issues, a signal so the properties can change them. */
const [issues, setIssues] = createSignal<Issue[]>(SEED, { ownedWrite: true })

export { issues }
export const issueById = (id?: string) => issues().find((i) => i.id === id)
export const issueByKey = (key?: string) => issues().find((i) => i.key === key)
export const updateIssue = (id: string, patch: Partial<Issue>) =>
  setIssues((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)))

/** The saved views of a project's issues; the first is the place's own. */
export const ISSUE_VIEWS: Array<{ id: string; label: string; test: (i: Issue) => boolean }> = [
  { id: "all", label: "All issues", test: () => true },
  { id: "active", label: "Active", test: (i) => !["done", "backlog"].includes(i.state) },
  { id: "backlog", label: "Backlog", test: (i) => i.state === "backlog" },
  { id: "mine", label: "Assigned to me", test: (i) => i.assignee === ME.id },
]

/** A project's issues in a saved view, in the order of their groups. */
export const issuesIn = (project: string, view?: string) => {
  const test = (ISSUE_VIEWS.find((v) => v.id === view) ?? ISSUE_VIEWS[0]!).test
  return issues()
    .filter((i) => i.project === project && test(i))
    .sort((a, b) => STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state))
}

export const RELATED: Record<string, string[]> = {
  "142": ["139", "138"],
  "139": ["127", "142"],
  "138": ["142"],
  "133": ["127"],
  "127": ["139", "133"],
}

export const ACTIVITY: Record<string, Array<{ who: string; what: string; ago: string }>> = {
  "142": [
    { who: "jonas", what: "created the issue", ago: "2d" },
    { who: "mira", what: "set the priority to Urgent", ago: "1d" },
    { who: "agent", what: "linked session s_7f2a on build-01", ago: "15m" },
    { who: "jonas", what: "moved it to Blocked", ago: "12m" },
  ],
}

export const COMMENTS: Record<string, Array<{ who: string; text: string; ago: string }>> = {
  "142": [
    {
      who: "jonas",
      text: "@mira the arm64 runner pulls the new base layer on every run. Could the healthcheck be racing the pull?",
      ago: "12m",
    },
  ],
}

// ── Inbox ─────────────────────────────────────────────────────────────────────────────────────────────

export const INBOX = [
  { id: "n1", issue: "142", who: "jonas", what: "mentioned you", ago: "12m", unread: true },
  { id: "n2", issue: "139", who: "sarah", what: "asked for your review", ago: "3h", unread: true },
  { id: "n3", issue: "138", who: "tomas", what: "changed the state to In progress", ago: "4h", unread: true },
  { id: "n4", issue: "128", who: "sarah", what: "closed the issue", ago: "4d", unread: false },
]

// ── Triage ────────────────────────────────────────────────────────────────────────────────────────────

export interface Report {
  id: string
  source: "github" | "slack" | "email" | "agent"
  title: string
  from: string
  ago: string
  body: string
  /** A likely duplicate, by issue key. */
  dupe?: string
}
export const REPORTS: Report[] = [
  {
    id: "r-31",
    source: "github",
    title: "Sign-in redirect drops the /app prefix",
    from: "kai-n (GitHub)",
    ago: "8m",
    body: "Behind our proxy at example.com/app, signing in sends me to example.com/dashboard, which 404s. Clearing cookies does not help.",
    dupe: "WEB-139",
  },
  {
    id: "r-30",
    source: "slack",
    title: "Can the activity feed show who merged a PR?",
    from: "Sarah Chen in #atlas",
    ago: "1h",
    body: "The feed says “PR merged” but not by whom. For release days that is the one thing I look for.",
  },
  {
    id: "r-29",
    source: "agent",
    title: "arm64 deploy step timed out 4 times today",
    from: "Triage agent",
    ago: "2h",
    body: "Job deploy-arm64 on build-01 timed out after 20s on 4 of 19 runs since 09:00. All four pulled base:2026.11 first.",
    dupe: "WEB-142",
  },
  {
    id: "r-28",
    source: "email",
    title: "Export of the issue list as CSV",
    from: "ops@northwind.io",
    ago: "1d",
    body: "We report on issues monthly and copy them by hand. A CSV export of the current view would save us an afternoon.",
  },
]

// ── Hosts ─────────────────────────────────────────────────────────────────────────────────────────────

export interface Host {
  id: string
  name: string
  region: string
  state: "online" | "degraded" | "offline"
}
export const HOSTS: Host[] = [
  { id: "build-01", name: "build-01", region: "fra-1", state: "online" },
  { id: "build-02", name: "build-02", region: "fra-1", state: "degraded" },
  { id: "edge-ams", name: "edge-ams", region: "ams-2", state: "online" },
]

export interface Session {
  id: string
  host: string
  title: string
  user: string
  state: "running" | "exited" | "failed"
  started: string
  lines: string[]
}
export const SESSIONS: Session[] = [
  {
    id: "s_7f2a",
    host: "build-01",
    title: "Coding agent",
    user: "agent",
    state: "running",
    started: "15m",
    lines: [
      "$ crow agent run --task WEB-142",
      "→ reading ci/deploy.yml",
      "→ running step 2 of 4 (deploy-arm64)",
      "  ✓ pulled image base:2026.11 (1.2s)",
      "  … waiting for runner healthcheck",
    ],
  },
  {
    id: "s_7e91",
    host: "build-01",
    title: "npm test",
    user: "agent",
    state: "running",
    started: "11m",
    lines: ["$ npm test -- --watch", " PASS  src/auth.test.ts (212 tests)", " RUNS  src/deploy.test.ts"],
  },
  {
    id: "s_7c44",
    host: "build-01",
    title: "build",
    user: "operator",
    state: "failed",
    started: "1h",
    lines: ["$ make release", "error: linker `cc` not found", "make: *** [release] Error 1"],
  },
  {
    id: "s_7b02",
    host: "build-01",
    title: "shell",
    user: "operator",
    state: "running",
    started: "2h",
    lines: ["operator@build-01:~$ uptime", " 17:42:10 up 12 days,  load average: 2.14, 1.98, 1.77"],
  },
  {
    id: "s_7d10",
    host: "build-01",
    title: "update",
    user: "root",
    state: "exited",
    started: "1d",
    lines: ["# apt upgrade -y", "0 upgraded, 0 newly installed."],
  },
  {
    id: "s_8a01",
    host: "build-02",
    title: "Review agent",
    user: "agent",
    state: "running",
    started: "40m",
    lines: ["$ crow agent review --pr 418"],
  },
]
export const sessionsOf = (host: string) => SESSIONS.filter((s) => s.host === host)

export const LOGS: Array<{ t: string; level: "info" | "warn" | "error"; src: string; msg: string }> = [
  { t: "17:42:10", level: "info", src: "runner", msg: "job 8812 picked up (deploy-arm64)" },
  { t: "17:42:11", level: "info", src: "docker", msg: "pulling base:2026.11" },
  { t: "17:42:12", level: "info", src: "docker", msg: "pulled base:2026.11 in 1.2s" },
  { t: "17:42:14", level: "warn", src: "health", msg: "healthcheck pending after 2s, retrying" },
  { t: "17:42:19", level: "warn", src: "health", msg: "healthcheck pending after 7s, retrying" },
  { t: "17:42:31", level: "error", src: "runner", msg: "step deploy-arm64 timed out after 20s" },
  { t: "17:42:31", level: "info", src: "runner", msg: "retrying job 8812 (attempt 2 of 3)" },
  { t: "17:43:02", level: "info", src: "sshd", msg: "accepted publickey for operator from 10.0.4.12" },
  { t: "17:45:12", level: "info", src: "runner", msg: "job 8813 picked up (test)" },
  { t: "17:45:58", level: "info", src: "runner", msg: "job 8813 finished in 46s" },
]

export interface FileEntry {
  name: string
  kind: "folder" | "file"
  size?: string
  changed: string
}
/** A host's files by folder path ("" is the home folder). */
export const FILES: Record<string, FileEntry[]> = {
  "": [
    { name: "ci", kind: "folder", changed: "2h" },
    { name: "src", kind: "folder", changed: "15m" },
    { name: "logs", kind: "folder", changed: "1m" },
    { name: ".bashrc", kind: "file", size: "3.7 KB", changed: "12d" },
    { name: "deploy.yml", kind: "file", size: "1.1 KB", changed: "2h" },
    { name: "runner.toml", kind: "file", size: "640 B", changed: "4d" },
  ],
  ci: [{ name: "deploy.yml", kind: "file", size: "1.1 KB", changed: "2h" }],
  src: [
    { name: "api", kind: "folder", changed: "1d" },
    { name: "auth", kind: "folder", changed: "15m" },
    { name: "main.ts", kind: "file", size: "1.8 KB", changed: "2d" },
  ],
  "src/api": [
    { name: "routes.ts", kind: "file", size: "4.2 KB", changed: "1d" },
    { name: "health.ts", kind: "file", size: "620 B", changed: "3d" },
  ],
  "src/auth": [{ name: "session.ts", kind: "file", size: "2.4 KB", changed: "15m" }],
  logs: [
    { name: "runner.log", kind: "file", size: "88 KB", changed: "1m" },
    { name: "deploy.log", kind: "file", size: "12 KB", changed: "12m" },
  ],
}
