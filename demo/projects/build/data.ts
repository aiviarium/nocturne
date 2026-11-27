// The Build lens's data: the issues the shared scenario holds plus the ones made and removed here, the cycles
// and the pull requests with their patches.
import { createSignal } from "solid-js"
import {
  ISSUE_VIEWS,
  type Issue,
  type IssueState,
  issues,
  type Priority,
  projectById,
  projects,
  STATE_ORDER,
  updateIssue,
} from "../../data"
import { removeFrom } from "../../lists"

const [made, setMade] = createSignal<Issue[]>([], { ownedWrite: true })
const [gone, setGone] = createSignal<string[]>([], { ownedWrite: true })

/** Every issue the Build lens shows: the scenario's, the new ones, less the removed ones. */
export const allIssues = () => [...issues(), ...made()].filter((i) => !gone().includes(i.id))
export const issueById = (id?: string) => allIssues().find((i) => i.id === id)
export const issueByKey = (key?: string) => allIssues().find((i) => i.key === key)

export function changeIssue(id: string, patch: Partial<Issue>) {
  if (made().some((i) => i.id === id)) setMade((l) => l.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  else updateIssue(id, patch)
}

/** Removes issues by id; returns the undo. */
export function removeIssues(ids: string[]): () => void {
  setGone((g) => [...g, ...ids])
  return () => setGone((g) => g.filter((x) => !ids.includes(x)))
}

let next = 143
export function addIssue(o: {
  project: string
  title: string
  priority: Priority
  state?: IssueState
  description: string
}): Issue {
  const project = projectById(o.project) ?? projects()[0]!
  const n = next++
  const issue: Issue = {
    id: `n${n}`,
    project: project.id,
    key: `${project.key}-${n}`,
    title: o.title,
    state: o.state ?? "todo",
    priority: o.priority,
    assignee: "mira",
    labels: [],
    updated: "now",
    description: o.description,
  }
  setMade((l) => [...l, issue])
  return issue
}

/** A project's issues in a saved view, in the order of their groups. */
export const issuesIn = (project: string, view?: string) => {
  const test = (ISSUE_VIEWS.find((v) => v.id === view) ?? ISSUE_VIEWS[0]!).test
  return allIssues()
    .filter((i) => i.project === project && test(i))
    .sort((a, b) => STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state))
}

// ── Cycles ────────────────────────────────────────────────────────────────────────────────────────────

export interface Cycle {
  id: string
  name: string
  starts: string
  ends: string
  scope: number
  done: number
  /** Points carried over to the next cycle. */
  carried: number
  state: "current" | "past" | "next"
}

export const CYCLES: Cycle[] = [
  {
    id: "25",
    name: "Cycle 25",
    starts: "Dec 2",
    ends: "Dec 15",
    scope: 18,
    done: 0,
    carried: 0,
    state: "next",
  },
  {
    id: "24",
    name: "Cycle 24",
    starts: "Nov 18",
    ends: "Dec 1",
    scope: 31,
    done: 19,
    carried: 0,
    state: "current",
  },
  {
    id: "23",
    name: "Cycle 23",
    starts: "Nov 4",
    ends: "Nov 17",
    scope: 28,
    done: 24,
    carried: 4,
    state: "past",
  },
  {
    id: "22",
    name: "Cycle 22",
    starts: "Oct 21",
    ends: "Nov 3",
    scope: 26,
    done: 26,
    carried: 0,
    state: "past",
  },
  {
    id: "21",
    name: "Cycle 21",
    starts: "Oct 7",
    ends: "Oct 20",
    scope: 30,
    done: 21,
    carried: 9,
    state: "past",
  },
]

// ── Pull requests ─────────────────────────────────────────────────────────────────────────────────────

export interface PullFile {
  path: string
  patch: string
}

export interface Pull {
  id: string
  project: string
  title: string
  author: string
  branch: string
  issue?: string
  review: "approved" | "changes" | "pending" | "merged"
  checks: Array<{ name: string; state: "ok" | "error" | "live" }>
  updated: string
  files: PullFile[]
  /** A suggestion a reviewer left on the description. */
  suggestion?: { before: string; after: string }
}

const HEALTH = `diff --git a/ci/deploy.yml b/ci/deploy.yml
--- a/ci/deploy.yml
+++ b/ci/deploy.yml
@@ -18,9 +18,11 @@ jobs:
   deploy-arm64:
     runs-on: [self-hosted, arm64]
     steps:
       - uses: actions/checkout@v4
-      - run: docker pull base:2026.11
+      - name: Warm the base image
+        run: docker pull --quiet base:2026.11
       - run: ./scripts/deploy.sh --target arm64
-        timeout-minutes: 1
+        timeout-minutes: 3
+        env: { HEALTHCHECK_RETRIES: "6" }
       - run: ./scripts/smoke.sh
`

const HEALTH_TS = `diff --git a/src/api/health.ts b/src/api/health.ts
--- a/src/api/health.ts
+++ b/src/api/health.ts
@@ -4,12 +4,18 @@ import { db } from "../db"
 export async function health(): Promise<Health> {
-  const ok = await db.ping()
-  return { ok, checkedAt: Date.now() }
+  const started = performance.now()
+  const ok = await db.ping({ timeoutMs: 2000 })
+  return {
+    ok,
+    checkedAt: Date.now(),
+    latencyMs: Math.round(performance.now() - started),
+  }
 }

 export function healthRoute(app: App) {
-  app.get("/health", async () => health())
+  app.get("/health", async (_req, res) => {
+    const h = await health()
+    res.status(h.ok ? 200 : 503).json(h)
+  })
 }
`

const PREFIX = `diff --git a/src/auth/session.ts b/src/auth/session.ts
--- a/src/auth/session.ts
+++ b/src/auth/session.ts
@@ -21,7 +21,8 @@ export function redirectAfterSignIn(req: Request): string {
   const target = req.query.next ?? "/dashboard"
-  return new URL(target, req.origin).pathname
+  const base = req.headers["x-forwarded-prefix"] ?? ""
+  return base + new URL(target, req.origin).pathname
 }
`

const FEED = `diff --git a/src/feed/Empty.tsx b/src/feed/Empty.tsx
new file mode 100644
--- /dev/null
+++ b/src/feed/Empty.tsx
@@ -0,0 +1,9 @@
+export function FeedEmpty(props: { onInvite: () => void }) {
+  return (
+    <EmptyState
+      title="No activity yet"
+      description="Invite your team to see their work here."
+      action={<Button onClick={props.onInvite}>Invite people</Button>}
+    />
+  )
+}
`

const PULL_SEED: Pull[] = [
  {
    id: "418",
    project: "atlas",
    title: "Give the arm64 deploy step room to pass its healthcheck",
    author: "mira",
    branch: "mira/arm64-healthcheck",
    issue: "WEB-142",
    review: "changes",
    checks: [
      { name: "test", state: "ok" },
      { name: "deploy-arm64", state: "error" },
      { name: "lint", state: "ok" },
    ],
    updated: "12m",
    files: [
      { path: "ci/deploy.yml", patch: HEALTH },
      { path: "src/api/health.ts", patch: HEALTH_TS },
    ],
    suggestion: {
      before: "Raise the timeout of the deploy step.\nThe healthcheck needs longer on arm64.",
      after:
        "Raise the timeout of the deploy step to 3 minutes.\nThe healthcheck needs longer on arm64 while the base image is pulled.\nRetry it six times.",
    },
  },
  {
    id: "417",
    project: "atlas",
    title: "Keep the path prefix when redirecting after sign-in",
    author: "sarah",
    branch: "sarah/prefix-redirect",
    issue: "WEB-139",
    review: "approved",
    checks: [
      { name: "test", state: "ok" },
      { name: "lint", state: "ok" },
    ],
    updated: "3h",
    files: [{ path: "src/auth/session.ts", patch: PREFIX }],
  },
  {
    id: "415",
    project: "atlas",
    title: "Empty state for the activity feed",
    author: "jonas",
    branch: "jonas/feed-empty",
    issue: "WEB-141",
    review: "pending",
    checks: [
      { name: "test", state: "live" },
      { name: "lint", state: "ok" },
    ],
    updated: "1h",
    files: [{ path: "src/feed/Empty.tsx", patch: FEED }],
  },
  {
    id: "409",
    project: "atlas",
    title: "Rank recent places first in the command palette",
    author: "mira",
    branch: "mira/palette-recent",
    review: "merged",
    checks: [{ name: "test", state: "ok" }],
    updated: "2d",
    files: [{ path: "src/api/health.ts", patch: HEALTH_TS }],
  },
]

const [pulls, setPulls] = createSignal<Pull[]>(PULL_SEED, { ownedWrite: true })

/** The pull requests still open or merged: a closed one leaves the list. */
export { pulls }
export const pullsOf = (project: string) => pulls().filter((p) => p.project === project)
export const pullById = (id?: string) => pulls().find((p) => p.id === id)
export const changePull = (id: string, patch: Partial<Pull>) =>
  setPulls((l) => l.map((p) => (p.id === id ? { ...p, ...patch } : p)))
/** Closes pull requests; returns the undo, which reopens them where they were. */
export function closePulls(ids: string[]): () => void {
  return removeFrom(pulls, setPulls, (p) => ids.includes(p.id))
}
