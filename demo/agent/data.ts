// The agent's conversations and runs, in memory. A conversation is a list of turns; a reply is a list of blocks
// (text with chips, tool steps, media, an approval). Sending a message plays a scripted reply with timers, the
// way a streamed one arrives: steps start and finish, words come in, and the context and the rate move.
import type { ChatMediaItem, StepStatus, TokenKind, ToolStepProps } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import { removeFrom } from "../lists"
import { chart, screenshot, textFile } from "./media"

/** A chip in text: a reference, a person, a command or a skill. */
export interface Chip {
  kind: TokenKind
  label: string
  icon?: "file" | "list-todo" | "server" | "git-pull-request"
  name?: string
}
export type Segment = string | Chip

export type Block =
  | { t: "text"; text: Segment[] }
  | { t: "steps"; steps: ToolStepProps[] }
  | { t: "media"; items: ChatMediaItem[] }
  | { t: "approval"; summary: string; items: string[]; decision: "pending" | "allowed" | "denied" }

export interface Turn {
  id: string
  role: "user" | "assistant"
  thought?: string
  blocks: Block[]
  /** While a reply streams; `stopped` once the person stopped it. */
  stream?: "live" | "stopped"
}

export interface Conversation {
  id: string
  title: string
  updated: string
  turns: Turn[]
  /** Tokens in the context window. */
  used: number
  /** Output rate over the last minute, tokens per second, oldest first. */
  rates: number[]
}

export const CONTEXT_TOTAL = 200_000

const ref = (label: string, icon: Chip["icon"] = "list-todo"): Chip => ({ kind: "ref", label, icon })
const who = (name: string): Chip => ({ kind: "person", label: name.split(" ")[0]!, name })

const LOG = `17:42:14 warn  health  healthcheck pending after 2s, retrying
17:42:19 warn  health  healthcheck pending after 7s, retrying
17:42:31 error runner  step deploy-arm64 timed out after 20s
`

const SEED: Conversation[] = [
  {
    id: "c-arm64",
    title: "Why does the arm64 deploy time out?",
    updated: "12m",
    used: 48_200,
    rates: [0, 12, 40, 52, 48, 50, 44, 0, 0, 0, 0, 0],
    turns: [
      {
        id: "t1",
        role: "user",
        blocks: [
          {
            t: "text",
            text: [
              "Look into ",
              ref("WEB-142"),
              " with ",
              who("Jonas Lindqvist"),
              "'s note. Why does deploy-arm64 time out on ",
              ref("build-01", "server"),
              "?",
            ],
          },
        ],
      },
      {
        id: "t2",
        role: "assistant",
        thought: "Thought for 14s",
        blocks: [
          {
            t: "steps",
            steps: [
              { icon: "file", verb: "Read", arg: "ci/deploy.yml" },
              { icon: "logs", verb: "Searched", arg: "runner.log for deploy-arm64", meta: "4 hits" },
              {
                icon: "terminal",
                verb: "Ran",
                arg: "docker inspect base:2026.11 --format '{{.Config.Healthcheck}}'",
                output: "{[CMD curl -f http://localhost:8080/health] 2s 1s 0s 3}",
              },
            ],
          },
          {
            t: "text",
            text: [
              "The healthcheck in base:2026.11 gives the service 3 tries 2 seconds apart, but on arm64 the service needs about 9 seconds to start. The step's 20-second timeout runs out while the check keeps failing. Here is the runner's view of the last failure:",
            ],
          },
          {
            t: "media",
            items: [
              {
                kind: "image",
                src: chart(1200, 480, 20, [3, 4, 2, 5, 6, 4, 9, 11, 7, 5, 4, 3]),
                alt: "Timeouts per hour today, peaking at 11 around 15:00",
                width: 1200,
                height: 480,
              },
              {
                kind: "image",
                src: screenshot(1280, 800, 3),
                alt: "The run page of job 8812, with the failed step marked",
                width: 1280,
                height: 800,
              },
              {
                kind: "file",
                name: "runner-excerpt.log",
                type: "text/plain",
                size: LOG.length,
                src: textFile(LOG),
              },
            ],
          },
          {
            t: "text",
            text: [
              "Raising the start period to 15s fixes it. I can open a pull request against ",
              ref("ci/deploy.yml", "file"),
              " and run the deploy test once to check.",
            ],
          },
          {
            t: "approval",
            summary: "Run the arm64 deploy test on build-01",
            items: ["crow ci run deploy-arm64 --host build-01"],
            decision: "pending",
          },
        ],
      },
    ],
  },
  {
    id: "c-feed",
    title: "Draft the empty state for the activity feed",
    updated: "1h",
    used: 21_400,
    rates: [0, 0, 30, 46, 41, 0, 0, 0, 0, 0, 0, 0],
    turns: [
      {
        id: "t1",
        role: "user",
        blocks: [
          {
            t: "text",
            text: [
              { kind: "cmd", label: "/draft" },
              " the empty state for ",
              ref("WEB-141"),
              " in our voice.",
            ],
          },
        ],
      },
      {
        id: "t2",
        role: "assistant",
        thought: "Thought for 6s",
        blocks: [
          { t: "steps", steps: [{ icon: "book-open", verb: "Read", arg: "Writing guide › Empty states" }] },
          {
            t: "text",
            text: [
              "Title: “No activity yet”. Action: “Invite your team”. One line at most under it, so I left the line out. ",
              who("Sarah Chen"),
              " asked for the same pattern in the inbox.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "c-csv",
    title: "Export the issue list as CSV",
    updated: "1d",
    used: 9_800,
    rates: [0, 0, 0, 0, 22, 35, 0, 0, 0, 0, 0, 0],
    turns: [
      {
        id: "t1",
        role: "user",
        blocks: [
          { t: "text", text: [{ kind: "skill", label: "$spec" }, " for a CSV export of the current view."] },
        ],
      },
      {
        id: "t2",
        role: "assistant",
        blocks: [
          {
            t: "text",
            text: [
              "The spec is in Product › Specs as “CSV export”. It keeps the view's columns, order and filter.",
            ],
          },
        ],
      },
    ],
  },
]

const [conversations, setConversations] = createSignal<Conversation[]>(SEED, { ownedWrite: true })

export { conversations }

export const conversationById = (id?: string) => conversations().find((c) => c.id === id)

const patch = (id: string, fn: (c: Conversation) => Conversation) =>
  setConversations((list) => list.map((c) => (c.id === id ? fn(c) : c)))
const patchTurn = (cid: string, tid: string, fn: (t: Turn) => Turn) =>
  patch(cid, (c) => ({ ...c, turns: c.turns.map((t) => (t.id === tid ? fn(t) : t)) }))

let made = 0
/** A new, empty conversation, first in the list. */
export function newConversation(): string {
  made += 1
  const id = `c-new-${made}`
  setConversations((list) => [
    { id, title: "New chat", updated: "now", turns: [], used: 3_100, rates: Array(12).fill(0) },
    ...list,
  ])
  return id
}

export const renameConversation = (id: string, title: string) => patch(id, (c) => ({ ...c, title }))
/** Deletes conversations; returns the undo, which puts them back where they were. */
export function removeConversations(ids: string[]): () => void {
  return removeFrom(conversations, setConversations, (c) => ids.includes(c.id))
}

/** Whether a conversation waits on the person: an approval still pending. */
export const waitsOnYou = (c: Conversation) =>
  c.turns.some((t) => t.blocks.some((b) => b.t === "approval" && b.decision === "pending"))
export const isStreaming = (c: Conversation) => c.turns.some((t) => t.stream === "live")

// ── Streaming ───────────────────────────────────────────────────────────────────────────────────────

const timers = new Map<string, ReturnType<typeof setTimeout>[]>()
const later = (cid: string, ms: number, fn: () => void) => {
  const t = setTimeout(fn, ms)
  timers.set(cid, [...(timers.get(cid) ?? []), t])
}
const clear = (cid: string) => {
  for (const t of timers.get(cid) ?? []) clearTimeout(t)
  timers.delete(cid)
}

/** Adds output: context tokens and a rate reading. */
const tick = (cid: string, tokens: number, rate: number) =>
  patch(cid, (c) => ({
    ...c,
    used: Math.min(CONTEXT_TOTAL, c.used + tokens),
    rates: [...c.rates.slice(1), rate],
  }))

const setSteps = (cid: string, tid: string, steps: ToolStepProps[]) =>
  patchTurn(cid, tid, (t) => {
    const blocks = t.blocks.filter((b) => b.t !== "steps")
    return { ...t, blocks: [{ t: "steps", steps }, ...blocks] }
  })

/** Streams `words` into the turn's last text block, one word every 60ms, then calls `done`. */
function streamText(cid: string, tid: string, words: string[], at: number, done: () => void) {
  patchTurn(cid, tid, (t) => ({ ...t, blocks: [...t.blocks, { t: "text", text: [""] }] }))
  words.forEach((w, i) => {
    later(cid, at + i * 60, () => {
      patchTurn(cid, tid, (t) => {
        const blocks = [...t.blocks]
        const last = blocks.at(-1)
        if (last?.t === "text")
          blocks[blocks.length - 1] = { t: "text", text: [`${last.text[0]}${i ? " " : ""}${w}`] }
        return { ...t, blocks }
      })
      tick(cid, 9, 38 + Math.round(Math.sin(i / 3) * 10))
    })
  })
  later(cid, at + words.length * 60 + 50, done)
}

const finish = (cid: string, tid: string) => {
  patchTurn(cid, tid, (t) => ({ ...t, stream: undefined }))
  tick(cid, 0, 0)
  clear(cid)
}

const step = (
  verb: string,
  arg: string,
  status: StepStatus,
  extra: Partial<ToolStepProps> = {},
): ToolStepProps => ({
  icon: verb.startsWith("Ran") || verb.startsWith("Running") ? "terminal" : "file",
  verb,
  arg,
  status,
  ...extra,
})

/** The person sends a message: it joins the conversation and a reply streams in. */
export function send(cid: string, text: Segment[]) {
  const plain = text.map((s) => (typeof s === "string" ? s : s.label)).join("")
  const uid = `u${Date.now()}`
  const tid = `a${Date.now()}`
  patch(cid, (c) => ({
    ...c,
    title: c.turns.length ? c.title : plain.slice(0, 60) || "New chat",
    updated: "now",
    turns: [
      ...c.turns,
      { id: uid, role: "user", blocks: [{ t: "text", text }] },
      { id: tid, role: "assistant", blocks: [], stream: "live" },
    ],
  }))
  const runs = /test|run|deploy|build/i.test(plain)
  const first = step("Reading", "the issue and its linked sessions", "running")
  setSteps(cid, tid, [first])
  later(cid, 700, () => setSteps(cid, tid, [{ ...first, verb: "Read", status: "ok", meta: "3 files" }]))
  if (runs) {
    later(cid, 1100, () => {
      setSteps(cid, tid, [{ ...first, verb: "Read", status: "ok", meta: "3 files" }])
      streamText(
        cid,
        tid,
        "I would like to run the tests on build-01 to check before I change anything.".split(" "),
        0,
        () =>
          patchTurn(cid, tid, (t) => ({
            ...t,
            stream: undefined,
            blocks: [
              ...t.blocks,
              {
                t: "approval",
                summary: "Run the test suite on build-01",
                items: ["npm test -- deploy"],
                decision: "pending",
              },
            ],
          })),
      )
    })
  } else {
    later(cid, 900, () =>
      streamText(
        cid,
        tid,
        "Here is what I found. The issue is blocked on the arm64 healthcheck, which needs a longer start period. Nothing else in the project depends on it, so the fix is small.".split(
          " ",
        ),
        0,
        () => finish(cid, tid),
      ),
    )
  }
}

/** The person decides on an approval in a turn. */
export function decide(cid: string, tid: string, allowed: boolean) {
  patchTurn(cid, tid, (t) => ({
    ...t,
    stream: allowed ? "live" : undefined,
    blocks: t.blocks.map((b) =>
      b.t === "approval" ? { ...b, decision: allowed ? "allowed" : "denied" } : b,
    ),
  }))
  if (!allowed) {
    patchTurn(cid, tid, (t) => ({
      ...t,
      blocks: [
        ...t.blocks,
        { t: "text", text: ["Understood. I won't run it, and the files stay as they are."] },
      ],
    }))
    return
  }
  const turn = conversationById(cid)?.turns.find((t) => t.id === tid)
  const done = turn?.blocks.find((b) => b.t === "steps")
  const before = done?.t === "steps" ? done.steps : []
  const cmd = turn?.blocks.find((b) => b.t === "approval")
  const arg = cmd?.t === "approval" ? (cmd.items[0] ?? "") : ""
  setSteps(cid, tid, [...before, step("Running", arg, "running")])
  later(cid, 1600, () => {
    setSteps(cid, tid, [
      ...before,
      step("Ran", arg, "ok", {
        meta: "12.4s",
        output: "✓ deploy-arm64 healthy after 9.1s\n\nTests  18 passed (18)",
      }),
    ])
    streamText(
      cid,
      tid,
      "The run passed: the service was healthy after 9.1 seconds, inside the new start period.".split(" "),
      100,
      () => finish(cid, tid),
    )
  })
}

/** Stops a streaming reply where it is. */
export function stop(cid: string) {
  clear(cid)
  patch(cid, (c) => ({
    ...c,
    rates: [...c.rates.slice(1), 0],
    turns: c.turns.map((t) =>
      t.stream === "live"
        ? {
            ...t,
            stream: "stopped",
            blocks: t.blocks.map((b) =>
              b.t === "steps"
                ? {
                    ...b,
                    steps: b.steps.map((s) =>
                      s.status === "running" ? { ...s, status: "error" as const, verb: "Stopped" } : s,
                    ),
                  }
                : b,
            ),
          }
        : t,
    ),
  }))
}

// ── Runs ────────────────────────────────────────────────────────────────────────────────────────────

export interface Run {
  id: string
  task: string
  agent: string
  state: "running" | "ok" | "failed"
  took: string
  started: string
  conversation?: string
}

const TASKS = [
  "Triage new reports",
  "Review pull request",
  "Run deploy test",
  "Summarise the inbox",
  "Check flaky tests",
  "Update the changelog",
]
const AGENTS = ["Triage agent", "Review agent", "Coding agent"]

/** The agent's runs, newest first: hundreds of them, so the list renders only what is in view. */
export const RUNS: Run[] = Array.from({ length: 480 }, (_, i) => {
  const state: Run["state"] = i < 2 ? "running" : i % 11 === 3 ? "failed" : "ok"
  const minutes = i * 17 + 3
  return {
    id: `run-${9120 - i}`,
    task: TASKS[i % TASKS.length]!,
    agent: AGENTS[i % AGENTS.length]!,
    state,
    took: state === "running" ? "" : `${((i * 7) % 50) + 4}s`,
    started:
      minutes < 60
        ? `${minutes}m`
        : minutes < 1440
          ? `${Math.floor(minutes / 60)}h`
          : `${Math.floor(minutes / 1440)}d`,
    conversation: i === 0 ? "c-arm64" : i === 4 ? "c-feed" : undefined,
  }
})
