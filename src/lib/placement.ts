// Nocturne names a floating element's place in one word, such as `bottom-start`; ui-sdk takes a side and an
// alignment.
import type { Placement } from "./position"

export type { Placement }

/** placementSide splits a placement into the side and alignment ui-sdk's popups take. */
export function placementSide(placement: Placement): {
  side: "top" | "bottom" | "left" | "right"
  align: "start" | "center" | "end"
} {
  const [side, align] = placement.split("-") as [
    "top" | "bottom" | "left" | "right",
    "start" | "end" | undefined,
  ]
  return { side, align: align ?? "center" }
}
