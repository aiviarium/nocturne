import { type LogEntry, LogViewer } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Streaming log",
  note: "Monospace log output paired with StreamState, wrap toggle, copy, and level accents.",
}

const ENTRIES: LogEntry[] = [
  { id: 1, at: "2026-11-19T09:00:01Z", level: "state", text: "Queued job apply on studio" },
  { id: 2, at: "2026-11-19T09:00:02Z", level: "info", text: "Connecting to studio (192.0.2.10)..." },
  { id: 3, at: "2026-11-19T09:00:03Z", level: "info", text: "Checking generation 42 -> 43" },
  { id: 4, at: "2026-11-19T09:00:04Z", level: "warn", text: "Unit rookery-agent.service will restart" },
  { id: 5, at: "2026-11-19T09:00:05Z", level: "info", text: "Applied configuration cleanly." },
]

export default function LogViewerLive() {
  return (
    <LogViewer title="Apply studio" streamState="live" entries={ENTRIES} showTimestamps maxHeight="220px" />
  )
}
