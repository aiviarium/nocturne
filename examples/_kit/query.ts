// A typed issue schema and rows for the QueryBuilder examples.
import { emptyQuery, type QueryField, type QueryGroup } from "@aiviarium/nocturne"

export const PEOPLE = [
  { value: "user://mira", label: "Mira Okonkwo" },
  { value: "user://jonas", label: "Jonas Lindqvist" },
  { value: "user://sarah", label: "Sarah Chen" },
]

export const ISSUE_FIELDS: QueryField[] = [
  { name: "title", label: "Title", type: "text", icon: "file" },
  {
    name: "state",
    label: "State",
    type: "enum",
    icon: "circle-dot",
    options: [
      { value: "backlog", label: "Backlog" },
      { value: "todo", label: "Todo" },
      { value: "progress", label: "In progress" },
      { value: "review", label: "In review" },
      { value: "done", label: "Done" },
    ],
  },
  { name: "assignee", label: "Assignee", type: "person", icon: "user", options: PEOPLE },
  { name: "estimate", label: "Estimate", type: "number", icon: "chart", integer: true, min: 0, unit: "pt" },
  { name: "due", label: "Due date", type: "date", icon: "calendar", key: "due" },
  { name: "updatedAt", label: "Updated", type: "date", datetime: true, icon: "clock", key: "updated" },
  {
    name: "labels",
    label: "Labels",
    type: "relation",
    multiple: true,
    icon: "tag",
    options: [
      { value: "label://bug", label: "Bug" },
      { value: "label://feature", label: "Feature" },
      { value: "label://auth", label: "Auth" },
      { value: "label://design", label: "Design" },
    ],
  },
  { name: "archived", label: "Archived", type: "boolean", icon: "archive" },
]

export interface QueryIssue {
  id: string
  key: string
  title: string
  state: string
  assignee: string | null
  estimate: number | null
  due: string | null
  updatedAt: string
  labels: string[]
  archived: boolean
}

export const QUERY_ISSUES: QueryIssue[] = [
  {
    id: "1",
    key: "WEB-142",
    title: "Flaky deploy test on the arm64 runner",
    state: "progress",
    assignee: "user://mira",
    estimate: 3,
    due: "2026-11-18",
    updatedAt: "2026-11-16T08:12:00Z",
    labels: ["label://bug"],
    archived: false,
  },
  {
    id: "2",
    key: "WEB-141",
    title: "Empty state for the activity feed",
    state: "todo",
    assignee: "user://jonas",
    estimate: 2,
    due: null,
    updatedAt: "2026-11-15T15:40:00Z",
    labels: ["label://feature", "label://design"],
    archived: false,
  },
  {
    id: "3",
    key: "WEB-139",
    title: "Sign-in loops behind a path-prefixed proxy",
    state: "review",
    assignee: "user://sarah",
    estimate: 5,
    due: "2026-11-20",
    updatedAt: "2026-11-14T10:00:00Z",
    labels: ["label://bug", "label://auth"],
    archived: false,
  },
  {
    id: "4",
    key: "WEB-137",
    title: "Contrast of muted labels in light mode",
    state: "backlog",
    assignee: null,
    estimate: 1,
    due: null,
    updatedAt: "2026-11-02T09:30:00Z",
    labels: ["label://design"],
    archived: false,
  },
  {
    id: "5",
    key: "WEB-133",
    title: "Import issues from a CSV export",
    state: "done",
    assignee: "user://mira",
    estimate: 8,
    due: "2026-11-01",
    updatedAt: "2026-11-03T17:05:00Z",
    labels: ["label://feature"],
    archived: true,
  },
  {
    id: "6",
    key: "WEB-130",
    title: "Session tokens expire during long uploads",
    state: "progress",
    assignee: "user://sarah",
    estimate: 3,
    due: "2026-11-17",
    updatedAt: "2026-11-16T07:55:00Z",
    labels: ["label://bug", "label://auth"],
    archived: false,
  },
]

/** The example's starting filter: open work estimated over two points. */
export function startingQuery(): QueryGroup {
  return {
    ...emptyQuery(),
    rules: [
      { field: "state", op: "anyOf", value: ["todo", "progress", "review"] },
      { field: "estimate", op: "gt", value: 2 },
    ],
  }
}
