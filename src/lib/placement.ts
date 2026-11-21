// Nocturne names a floating element's place in one word, such as `bottom-start`; ui-sdk takes a side and an
// alignment.
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
