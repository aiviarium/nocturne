// Terminal sessions of a host, with the table columns that show them.
import { type DataColumn, type DotStatus, State } from "@aiviarium/nocturne"

export interface Session {
  id: string
  title: string
  user: string
  state: "running" | "exited" | "failed" | "lost"
  ago: number
  exit: string | null
  mb: number
}

export const HOST_SESSIONS: Session[] = [
  { id: "s_7f2a", title: "Coding agent", user: "agent", state: "running", ago: 912, exit: null, mb: 3.4 },
  { id: "s_7e91", title: "npm test", user: "agent", state: "running", ago: 640, exit: null, mb: 1.2 },
  { id: "s_7d10", title: "update", user: "root", state: "exited", ago: 3600, exit: "0", mb: 0.6 },
  { id: "s_7c44", title: "build", user: "operator", state: "failed", ago: 5400, exit: "1", mb: 2.1 },
  { id: "s_7b02", title: "shell", user: "operator", state: "running", ago: 7200, exit: null, mb: 0.3 },
  { id: "s_7a77", title: "Review agent", user: "agent", state: "lost", ago: 10800, exit: null, mb: 4.0 },
  { id: "s_79e0", title: "backup", user: "root", state: "exited", ago: 86400, exit: "0", mb: 0.9 },
]

const DOT: Record<Session["state"], DotStatus> = {
  running: "live",
  exited: "neutral",
  failed: "error",
  lost: "warn",
}

const ago = (s: number) =>
  s < 3600
    ? `${Math.round(s / 60)}m ago`
    : s < 86400
      ? `${Math.round(s / 3600)}h ago`
      : `${Math.round(s / 86400)}d ago`

export const SESSION_COLUMNS: DataColumn<Session>[] = [
  { id: "id", header: "ID", accessor: (r) => r.id, type: "mono", sortable: true, width: "88px" },
  { id: "title", header: "Session", accessor: (r) => r.title, sortable: true },
  { id: "user", header: "User", accessor: (r) => r.user, sortable: true },
  {
    id: "state",
    header: "State",
    accessor: (r) => r.state,
    sortable: true,
    cell: (r) => (
      <State status={DOT[r.state]}>{r.exit && r.state === "failed" ? `exit ${r.exit}` : r.state}</State>
    ),
  },
  {
    id: "ago",
    header: "Started",
    accessor: (r) => ago(r.ago),
    sortValue: (r) => -r.ago,
    type: "time",
    sortable: true,
  },
  { id: "exit", header: "Exit", accessor: (r) => r.exit, type: "num" },
  {
    id: "mb",
    header: "Output",
    accessor: (r) => `${r.mb.toFixed(1)} MB`,
    sortValue: (r) => r.mb,
    type: "num",
    sortable: true,
  },
]
