// A project's ideas, specs and roadmap. Atlas web has the most; the other projects have a few each, so switching
// project shows different content. Everything is in memory.
import { type LabelHue, reorderItems } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import { removeFrom } from "../../lists"

// ── Ideas ─────────────────────────────────────────────────────────────────────────────────────────────

export type IdeaStatus = "open" | "planned" | "shipped"
export interface Idea {
  id: string
  project: string
  title: string
  area: { name: string; hue: LabelHue }
  status: IdeaStatus
  author: string
  voters: string[]
  ago: string
}

const ONBOARDING = { name: "Onboarding", hue: "orchid" } as const
const FEED = { name: "Activity feed", hue: "sky" } as const
const SEARCH = { name: "Search", hue: "amber" } as const
const AUTH = { name: "Auth", hue: "rose" } as const
const DOCS = { name: "Docs", hue: "mint" } as const

const IDEA_SEED: Idea[] = [
  {
    id: "i1",
    project: "atlas",
    title: "Show who merged a pull request in the activity feed",
    area: FEED,
    status: "planned",
    author: "sarah",
    voters: ["sarah", "jonas", "tomas", "mira"],
    ago: "1h",
  },
  {
    id: "i2",
    project: "atlas",
    title: "A template picker that pre-fills a first project so a new workspace never starts empty",
    area: ONBOARDING,
    status: "open",
    author: "mira",
    voters: ["mira", "tomas"],
    ago: "2d",
  },
  {
    id: "i3",
    project: "atlas",
    title: "Export the current issue view as CSV",
    area: SEARCH,
    status: "open",
    author: "jonas",
    voters: ["jonas", "sarah", "tomas"],
    ago: "1d",
  },
  {
    id: "i4",
    project: "atlas",
    title: "Remember the last sign-in method on this device",
    area: AUTH,
    status: "shipped",
    author: "tomas",
    voters: ["tomas"],
    ago: "3w",
  },
  {
    id: "i5",
    project: "atlas",
    title: "Search across specs, issues and comments from one field, ranked by what the person opened lately",
    area: SEARCH,
    status: "open",
    author: "sarah",
    voters: ["sarah", "mira", "jonas", "tomas"],
    ago: "5d",
  },
  {
    id: "i6",
    project: "atlas",
    title: "Digest of the week's activity on Monday",
    area: FEED,
    status: "planned",
    author: "jonas",
    voters: ["jonas"],
    ago: "1w",
  },
  {
    id: "i7",
    project: "fleet-agent",
    title: "Pause an agent run and resume it on another host",
    area: ONBOARDING,
    status: "open",
    author: "tomas",
    voters: ["tomas", "mira"],
    ago: "2d",
  },
  {
    id: "i8",
    project: "docs-site",
    title: "Copy button on every code block",
    area: DOCS,
    status: "shipped",
    author: "sarah",
    voters: ["sarah", "jonas"],
    ago: "2w",
  },
]

const [ideas, setIdeas] = createSignal<Idea[]>(IDEA_SEED, { ownedWrite: true })

export { ideas }
export const ideasOf = (project: string) => ideas().filter((i) => i.project === project)
export const toggleVote = (id: string, who: string) =>
  setIdeas((list) =>
    list.map((i) =>
      i.id === id
        ? { ...i, voters: i.voters.includes(who) ? i.voters.filter((v) => v !== who) : [...i.voters, who] }
        : i,
    ),
  )
export const addIdea = (idea: Idea) => setIdeas((list) => [idea, ...list])
export const removeIdea = (id: string) => setIdeas((list) => list.filter((i) => i.id !== id))

// ── Specs ─────────────────────────────────────────────────────────────────────────────────────────────

export interface Spec {
  id: string
  project: string
  title: string
  owner: string
  updated: string
  /** The body, in Markdown; the editor keeps its own JSON once it is changed. */
  body: string
}

const SPEC_SEED: Spec[] = [
  {
    id: "onboarding",
    project: "atlas",
    title: "First-run onboarding",
    owner: "mira",
    updated: "2h",
    body: `# First-run onboarding

A new workspace opens on an empty board today. People stop there: one in three never creates a project. This spec replaces the empty board with a first project made from a template.

> [!NOTE]
> Measured over the last 90 days of sign-ups. See [Activity feed empty state](issue://WEB-141).

## Goals

- A new person finishes something real in their first session.
- Nobody has to understand lenses before they see one.
- [Sarah Chen](user://sarah) signs off on the template copy.

## Flow

1. Pick a template: *Product launch*, *Bug tracker* or *Blank*.
2. Name the project. The key is made from the name and can be changed later.
3. Land in **Build › Issues** with three example issues.

## Open questions

- [ ] Should the examples be deleted after a week?
- [x] Do templates need their own lenses? No: they use the project's.
`,
  },
  {
    id: "proxy-sign-in",
    project: "atlas",
    title: "Sign-in behind a path prefix",
    owner: "sarah",
    updated: "1d",
    body: `# Sign-in behind a path prefix

Some teams serve Atlas under a path such as \`/app\`. The redirect after sign-in drops the prefix ([WEB-139](issue://WEB-139)).

## Change

The server reads \`X-Forwarded-Prefix\` and every redirect keeps it.

\`\`\`ts
const base = req.headers["x-forwarded-prefix"] ?? ""
return redirect(\`\${base}/dashboard\`)
\`\`\`

## Rollout

Behind a flag for a week, then on for everyone. [Tomás Ruiz](user://tomas) watches the sign-in error rate.
`,
  },
  {
    id: "feed-merges",
    project: "atlas",
    title: "Activity feed: who merged",
    owner: "jonas",
    updated: "3d",
    body: `# Activity feed: who merged

The feed says "PR merged" but not by whom. On release days that is the one thing people look for.

## Proposal

Each merge entry names the person and the target branch: **Jonas merged PR 418 into main**.
`,
  },
  {
    id: "agent-handoff",
    project: "fleet-agent",
    title: "Handing a run to another host",
    owner: "tomas",
    updated: "5d",
    body: `# Handing a run to another host

A run that waits on a busy host should move to a free one without losing its context.
`,
  },
  {
    id: "style-guide",
    project: "docs-site",
    title: "Writing style",
    owner: "sarah",
    updated: "2w",
    body: `# Writing style

Short, plain sentences. Project names in title case.
`,
  },
]

const [specs, setSpecs] = createSignal<Spec[]>(SPEC_SEED, { ownedWrite: true })

export { specs }
export const specsOf = (project: string) => specs().filter((s) => s.project === project)
export const specById = (id?: string) => specs().find((s) => s.id === id)
export const addSpec = (spec: Spec) => setSpecs((list) => [...list, spec])
let made = 0
/** An id no spec has. */
export const nextSpecId = () => {
  let id: string
  do id = `spec-${SPEC_SEED.length + ++made}`
  while (specById(id))
  return id
}
export const renameSpec = (id: string, title: string) =>
  setSpecs((list) => list.map((s) => (s.id === id ? { ...s, title } : s)))
/** Deletes specs; returns the undo, which puts them back where they were. */
export const removeSpecs = (ids: string[]) => removeFrom(specs, setSpecs, (s) => ids.includes(s.id))
/** Moves a project's spec from `from` to `to` (places among the project's specs). */
export function moveSpec(project: string, from: number, to: number) {
  const mine = specsOf(project)
  const moved = reorderItems(mine, from, to)
  let i = 0
  setSpecs((list) => list.map((s) => (s.project === project ? moved[i++]! : s)))
}

// ── Roadmap ───────────────────────────────────────────────────────────────────────────────────────────

export type Track = "shipped" | "on-track" | "at-risk" | "not-started"
export interface Milestone {
  id: string
  project: string
  quarter: string
  title: string
  area: { name: string; hue: LabelHue }
  track: Track
  owner: string
  target: string
  spec?: string
  issues: number
}

export const MILESTONES: Milestone[] = [
  {
    id: "m1",
    project: "atlas",
    quarter: "Q3 2026",
    title: "Remembered sign-in",
    area: AUTH,
    track: "shipped",
    owner: "tomas",
    target: "Sep 12",
    issues: 6,
  },
  {
    id: "m2",
    project: "atlas",
    quarter: "Q4 2026",
    title: "First-run onboarding",
    area: ONBOARDING,
    track: "on-track",
    owner: "mira",
    target: "Dec 4",
    spec: "onboarding",
    issues: 9,
  },
  {
    id: "m3",
    project: "atlas",
    quarter: "Q4 2026",
    title: "Sign-in behind a path prefix",
    area: AUTH,
    track: "at-risk",
    owner: "sarah",
    target: "Dec 11",
    spec: "proxy-sign-in",
    issues: 3,
  },
  {
    id: "m4",
    project: "atlas",
    quarter: "Q1 2027",
    title: "Who merged, in the feed",
    area: FEED,
    track: "not-started",
    owner: "jonas",
    target: "Jan 22",
    spec: "feed-merges",
    issues: 2,
  },
  {
    id: "m5",
    project: "atlas",
    quarter: "Q1 2027",
    title: "One search field",
    area: SEARCH,
    track: "not-started",
    owner: "sarah",
    target: "Mar 5",
    issues: 0,
  },
  {
    id: "m6",
    project: "fleet-agent",
    quarter: "Q4 2026",
    title: "Run handoff",
    area: ONBOARDING,
    track: "on-track",
    owner: "tomas",
    target: "Dec 18",
    spec: "agent-handoff",
    issues: 4,
  },
  {
    id: "m7",
    project: "docs-site",
    quarter: "Q4 2026",
    title: "Style guide",
    area: DOCS,
    track: "shipped",
    owner: "sarah",
    target: "Nov 2",
    spec: "style-guide",
    issues: 1,
  },
]
