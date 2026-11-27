// Where a conversation's widgets can sit: a bar over the transcript, the side columns, the bars over and under the
// composer, each bar with a start, a centre and an end, and the composer's own bottom row, at its start and its end. Without room the side columns fold into the bar over the
// composer, and on a phone the top bar does too. The layout itself never changes for it.
import type { WidgetPlacement, WidgetZoneDef } from "@aiviarium/nocturne"

const SIDES = 1240
const PHONE = 560
const AT = { start: "left", center: "centre", end: "right" } as const

const bar = (place: "top" | "above" | "below", name: string): WidgetZoneDef[] =>
  (["start", "center", "end"] as const).map((at) => ({
    id: `${place}-${at}`,
    label: `${name}, ${AT[at]}`,
    forms: ["chip", "line"],
    layout: "row",
    // Over the composer, a widget with something to act on (an approval) grows to a full row.
    grow: place === "above",
  }))
const column = (side: "left" | "right"): WidgetZoneDef[] =>
  (["top", "bottom"] as const).map((end) => ({
    id: `${side}-${end}`,
    label: `${side === "left" ? "Left" : "Right"} column, ${end}`,
    forms: ["card", "line"],
    layout: "column",
  }))

// In the composer's bottom row only chips fit: the model, the effort, a context ring.
const input: WidgetZoneDef[] = (["start", "end"] as const).map((at) => ({
  id: `input-${at}`,
  label: `Input row, ${AT[at]}`,
  forms: ["chip"],
  layout: "row",
}))

export const CHAT_ZONES: WidgetZoneDef[] = [
  ...bar("top", "Top"),
  ...column("left"),
  ...column("right"),
  ...bar("above", "Above input"),
  ...input,
  ...bar("below", "Below input"),
]

export const CHAT_LAYOUT: WidgetPlacement[] = [
  { id: "model", zone: "input-start" },
  { id: "effort", zone: "input-start" },
  { id: "context", zone: "left-top" },
  { id: "files", zone: "left-top" },
  { id: "images", zone: "left-top" },
  { id: "output", zone: "right-top" },
  { id: "tools", zone: "right-top" },
  { id: "approval", zone: "above-start", cfg: { transcript: false } },
  { id: "screen", zone: "right-bottom" },
]

/** The zone a zone's widgets show in at the chat's width. */
export function chatFit(zone: string, width: number): string {
  let z = zone
  if (width < SIDES) z = z.startsWith("left-") ? "above-start" : z.startsWith("right-") ? "above-end" : z
  if (width < PHONE && z.startsWith("top-")) z = z.replace("top-", "above-")
  return z
}
