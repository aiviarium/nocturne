// Issues of a project, for the patterns and blocks that list them.
import type { BadgeTone, DotStatus } from "@aiviarium/nocturne"

export interface Issue {
  id: string
  key: string
  title: string
  state: "backlog" | "todo" | "progress" | "review" | "blocked" | "done"
  assignee?: string
  labels: Array<[BadgeTone, string]>
  updated: string
  unread?: boolean
}

export const ISSUES: Issue[] = [
  {
    id: "1",
    key: "WEB-142",
    title: "Flaky deploy test on the arm64 runner",
    state: "blocked",
    assignee: "Mira Okonkwo",
    labels: [["danger", "Bug"]],
    updated: "12m",
    unread: true,
  },
  {
    id: "2",
    key: "WEB-141",
    title: "Empty state for the activity feed",
    state: "progress",
    assignee: "Jonas Lindqvist",
    labels: [["accent", "Feature"]],
    updated: "1h",
  },
  {
    id: "3",
    key: "WEB-139",
    title: "Sign-in loops behind a path-prefixed proxy",
    state: "review",
    assignee: "Sarah Chen",
    labels: [
      ["danger", "Bug"],
      ["info", "Auth"],
    ],
    updated: "3h",
  },
  {
    id: "4",
    key: "WEB-137",
    title: "Contrast of muted labels in light mode",
    state: "todo",
    labels: [["neutral", "Design"]],
    updated: "1d",
  },
  {
    id: "5",
    key: "WEB-133",
    title: "Move the read replicas behind the shared load balancer",
    state: "todo",
    assignee: "Jonas Lindqvist",
    labels: [["neutral", "Infra"]],
    updated: "2d",
  },
  {
    id: "6",
    key: "WEB-130",
    title: "Keyboard shortcut sheet: rebind and reset",
    state: "backlog",
    labels: [["accent", "Feature"]],
    updated: "4d",
  },
  {
    id: "7",
    key: "WEB-128",
    title: "Widget picker remembers the last category",
    state: "done",
    assignee: "Sarah Chen",
    labels: [],
    updated: "5d",
  },
]

/** Only the states worth a word in a list: the normal ones say nothing. */
export const ISSUE_STATE: Partial<Record<Issue["state"], [DotStatus, string]>> = {
  blocked: ["error", "Blocked"],
  review: ["warn", "In review"],
  progress: ["ai", "In progress"],
}

export const STATE_NAME: Record<Issue["state"], string> = {
  backlog: "Backlog",
  todo: "Todo",
  progress: "In progress",
  review: "In review",
  blocked: "Blocked",
  done: "Done",
}
