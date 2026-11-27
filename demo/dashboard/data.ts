// The dashboard's figures: Acme's week in numbers and the live readings its widgets follow. Everything is made up
// here and moves on timers in the views; nothing is fetched.
import type { IconName, WidgetPlacement } from "@aiviarium/nocturne"

export type Range = "24h" | "7d" | "30d"

export const RANGES: Array<{ value: Range; label: string }> = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
]

/** The axis under a chart of the range, oldest first. */
export const AXIS: Record<Range, string[]> = {
  "24h": ["-24h", "-12h", "Now"],
  "7d": ["Mon", "Thu", "Today"],
  "30d": ["-30d", "-15d", "Today"],
}

/** The headline figures for a range. */
export interface Headline {
  id: string
  label: string
  value: string
  unit?: string
  delta?: { direction: "up" | "down"; value: string; sentiment?: "good" | "bad" }
  meter?: { value: number; tone?: "accent" | "info" | "success" | "warning" | "danger" }
  limit?: string
}

export const HEADLINES: Record<Range, Headline[]> = {
  "24h": [
    {
      id: "open",
      label: "Open issues",
      value: "42",
      delta: { direction: "down", value: "3", sentiment: "good" },
    },
    { id: "deploys", label: "Deploys", value: "9", delta: { direction: "up", value: "2" } },
    {
      id: "errors",
      label: "Error rate",
      value: "0.31",
      unit: "%",
      delta: { direction: "up", value: "0.12", sentiment: "bad" },
      meter: { value: 31, tone: "warning" },
    },
    { id: "runners", label: "Runner minutes", value: "1,920", limit: "of 5,000", meter: { value: 38 } },
  ],
  "7d": [
    {
      id: "open",
      label: "Open issues",
      value: "42",
      delta: { direction: "down", value: "8", sentiment: "good" },
    },
    { id: "deploys", label: "Deploys", value: "58", delta: { direction: "up", value: "11" } },
    {
      id: "errors",
      label: "Error rate",
      value: "0.18",
      unit: "%",
      delta: { direction: "down", value: "0.04", sentiment: "good" },
      meter: { value: 18, tone: "success" },
    },
    { id: "runners", label: "Runner minutes", value: "11,400", limit: "of 35,000", meter: { value: 33 } },
  ],
  "30d": [
    {
      id: "open",
      label: "Open issues",
      value: "42",
      delta: { direction: "up", value: "5", sentiment: "bad" },
    },
    { id: "deploys", label: "Deploys", value: "231", delta: { direction: "up", value: "40" } },
    {
      id: "errors",
      label: "Error rate",
      value: "0.22",
      unit: "%",
      delta: { direction: "down", value: "0.02", sentiment: "good" },
      meter: { value: 22, tone: "success" },
    },
    {
      id: "runners",
      label: "Runner minutes",
      value: "47,800",
      limit: "of 150,000",
      meter: { value: 32 },
    },
  ],
}

/** A wobbly series of `n` values around `base`, the same for the same seed. */
export function series(n: number, base: number, swing: number, seed = 1): number[] {
  return Array.from({ length: n }, (_, i) =>
    Math.max(
      1,
      Math.round(base + swing * Math.sin(i * 0.7 + seed) + (swing / 2) * Math.cos(i * 1.9 + seed * 3)),
    ),
  )
}

/** The next reading of a live series: drift from the last one, kept inside the bounds. */
export function drift(last: number, step: number, lo: number, hi: number): number {
  const next = last + (Math.random() - 0.5) * 2 * step
  return Math.min(hi, Math.max(lo, Math.round(next * 10) / 10))
}

/** The deploy pipeline the Deploy widget walks through. */
export const DEPLOY_STEPS = ["Build", "Test", "Canary", "Production"]

/** Uptime of the API over the last 30 days: one bad day and one with no data. */
export const UPTIME_DAYS: Array<"up" | "down" | "none"> = Array.from({ length: 30 }, (_, i) =>
  i === 17 ? "down" : i === 18 ? "none" : "up",
)

/** The hosts the Fleet place shows, with their readings at the start. */
export interface FleetHost {
  id: string
  name: string
  region: string
  degraded?: string
  cpu: number
  memory: number
  disk: number
  days: Array<"up" | "down" | "none">
}
export const FLEET: FleetHost[] = [
  { id: "build-01", name: "build-01", region: "fra-1", cpu: 64, memory: 71, disk: 48, days: UPTIME_DAYS },
  {
    id: "build-02",
    name: "build-02",
    region: "fra-1",
    degraded: "Disk at 92% since 17:42",
    cpu: 38,
    memory: 55,
    disk: 92,
    days: Array.from({ length: 30 }, (_, i) => (i >= 27 ? "down" : "up")),
  },
  {
    id: "edge-ams",
    name: "edge-ams",
    region: "ams-2",
    cpu: 22,
    memory: 40,
    disk: 31,
    days: Array.from({ length: 30 }, () => "up"),
  },
]

// ── The grid ────────────────────────────────────────────────────────────────────────────────────────

export type TileKind =
  | "alerts"
  | "deploy"
  | "build"
  | "requests"
  | "tokens"
  | "machine"
  | "queue"
  | "disk"
  | "uptime"
  | "budget"
  | "cycle"
  | "issues"

/** What each kind is called in the add menu, and the size it starts at. */
export const KINDS: Record<
  TileKind,
  { label: string; icon: IconName; w: number; h: number; minW?: number; minH?: number }
> = {
  alerts: { label: "Alerts", icon: "triangle-alert", w: 12, h: 2 },
  deploy: { label: "Deploy", icon: "package", w: 4, h: 2, minW: 3 },
  build: { label: "Build timer", icon: "clock", w: 4, h: 2, minW: 3 },
  requests: { label: "Requests", icon: "activity", w: 8, h: 4, minW: 4, minH: 3 },
  tokens: { label: "Agent output", icon: "bolt", w: 4, h: 2, minW: 3 },
  machine: { label: "build-01", icon: "cpu", w: 4, h: 3, minW: 3, minH: 2 },
  queue: { label: "Runner queue", icon: "gauge", w: 4, h: 3, minW: 3, minH: 2 },
  disk: { label: "Artifact storage", icon: "hard-drive", w: 4, h: 2, minW: 3 },
  uptime: { label: "API uptime", icon: "server", w: 4, h: 2, minW: 3 },
  budget: { label: "Error budget", icon: "shield", w: 4, h: 1, minW: 3, minH: 1 },
  cycle: { label: "Cycle 24", icon: "refresh-cw", w: 4, h: 2, minW: 3 },
  issues: { label: "Open issues", icon: "circle-dot", w: 4, h: 3, minW: 3, minH: 2 },
}

export const DEFAULT_LAYOUT: Omit<WidgetPlacement, "zone">[] = [
  { id: "alerts", x: 0, y: 0, w: 12, h: 2 },
  { id: "requests", x: 0, y: 2, w: 8, h: 4, minW: 4, minH: 3 },
  { id: "deploy", x: 8, y: 2, w: 4, h: 2, minW: 3 },
  { id: "build", x: 8, y: 4, w: 4, h: 2, minW: 3 },
  { id: "machine", x: 0, y: 6, w: 4, h: 3, minW: 3, minH: 2 },
  { id: "queue", x: 4, y: 6, w: 4, h: 3, minW: 3, minH: 2 },
  { id: "issues", x: 8, y: 6, w: 4, h: 3, minW: 3, minH: 2 },
  { id: "tokens", x: 0, y: 9, w: 4, h: 2, minW: 3 },
  { id: "disk", x: 4, y: 9, w: 4, h: 2, minW: 3 },
  { id: "uptime", x: 8, y: 9, w: 4, h: 2, minW: 3 },
  { id: "budget", x: 0, y: 11, w: 4, h: 1, minW: 3, minH: 1 },
  { id: "cycle", x: 4, y: 11, w: 4, h: 2, minW: 3 },
]
