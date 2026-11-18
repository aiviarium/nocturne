/** Where a floating element sits relative to its anchor. `-start` aligns edges, `-end` aligns the far edges. */
export type Placement =
  | "bottom-start"
  | "bottom"
  | "bottom-end"
  | "top-start"
  | "top"
  | "top-end"
  | "right-start"
  | "right"
  | "left-start"
  | "left"

export interface Box {
  left: number
  top: number
  width: number
  height: number
}

export interface PositionResult {
  left: number
  top: number
  placement: Placement
}

const OPPOSITE: Record<string, string> = { top: "bottom", bottom: "top", left: "right", right: "left" }

function place(anchor: Box, float: Box, placement: Placement, offset: number): { left: number; top: number } {
  const [side, align = "center"] = placement.split("-") as [string, string | undefined]
  let left = 0
  let top = 0
  if (side === "bottom" || side === "top") {
    top = side === "bottom" ? anchor.top + anchor.height + offset : anchor.top - float.height - offset
    if (align === "start") left = anchor.left
    else if (align === "end") left = anchor.left + anchor.width - float.width
    else left = anchor.left + (anchor.width - float.width) / 2
  } else {
    left = side === "right" ? anchor.left + anchor.width + offset : anchor.left - float.width - offset
    if (align === "start") top = anchor.top
    else top = anchor.top + (anchor.height - float.height) / 2
  }
  return { left, top }
}

function overflows(pos: { left: number; top: number }, float: Box, viewport: Box, side: string): boolean {
  if (side === "bottom") return pos.top + float.height > viewport.top + viewport.height
  if (side === "top") return pos.top < viewport.top
  if (side === "right") return pos.left + float.width > viewport.left + viewport.width
  return pos.left < viewport.left
}

/**
 * Compute the fixed position of a floating box. If it does not fit on the requested side it
 * flips to the opposite side when that fits better, then clamps into the viewport with `padding`.
 */
export function computePosition(options: {
  anchor: Box
  float: Box
  viewport: Box
  placement?: Placement
  offset?: number
  padding?: number
}): PositionResult {
  const { anchor, float, viewport } = options
  const offset = options.offset ?? 4
  const padding = options.padding ?? 8
  let placement = options.placement ?? "bottom-start"
  const side = placement.split("-")[0] as string
  let pos = place(anchor, float, placement, offset)
  if (overflows(pos, float, viewport, side)) {
    const flipped = placement.replace(side, OPPOSITE[side] as string) as Placement
    const flippedPos = place(anchor, float, flipped, offset)
    if (!overflows(flippedPos, float, viewport, OPPOSITE[side] as string)) {
      pos = flippedPos
      placement = flipped
    }
  }
  const minLeft = viewport.left + padding
  const maxLeft = viewport.left + viewport.width - float.width - padding
  const minTop = viewport.top + padding
  const maxTop = viewport.top + viewport.height - float.height - padding
  return {
    left: Math.max(minLeft, Math.min(pos.left, Math.max(minLeft, maxLeft))),
    top: Math.max(minTop, Math.min(pos.top, Math.max(minTop, maxTop))),
    placement,
  }
}
