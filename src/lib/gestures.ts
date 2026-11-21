// The decisions behind the phone's gestures, as pure functions so they are tested without a finger: whether an
// edge swipe goes back, which detent a dragged sheet settles at, what a swiped list row does, and when a pull
// refreshes. Distances are px, velocities px per ms (positive: right or down).

/** Movement before a gesture picks a direction; until then a scroll can still win. */
export const LOCK_DISTANCE = 10

/** Which way a drag is going once it has moved far enough, or null while it is still undecided. */
export function lockDirection(dx: number, dy: number): "x" | "y" | null {
  if (Math.hypot(dx, dy) < LOCK_DISTANCE) return null
  return Math.abs(dx) > Math.abs(dy) ? "x" : "y"
}

/** The strip at the left edge of a screen where a swipe back starts. */
export const EDGE_WIDTH = 20

/**
 * Whether a swipe from the left edge goes back when the finger lifts: past 35% of the width, or a flick to the
 * right faster than 0.5 px/ms that has moved at least 24 px. A flick back to the left cancels however far it went.
 */
export function swipeBack(g: { dx: number; vx: number; width: number }): "back" | "cancel" {
  if (g.vx < -0.3) return "cancel"
  if (g.dx >= g.width * 0.35) return "back"
  if (g.vx > 0.5 && g.dx >= 24) return "back"
  return "cancel"
}

/** Where a sheet may rest: half the screen, nearly all of it, or its content's own height. */
export type Detent = "medium" | "large" | "fit"

/** What a list row does when it is let go after a sideways swipe. */
export type RowSwipe = "close" | "leading" | "trailing" | "full-leading" | "full-trailing"

/**
 * A row reveals its trailing actions when dragged left (negative dx) past half their width, its leading actions
 * when dragged right; a drag past 60% of the row's width, or a fast flick past the actions, runs the first action
 * on that side at once (a full swipe). A side without actions cannot open.
 */
export function rowSwipe(g: {
  dx: number
  vx: number
  width: number
  leading: number
  trailing: number
}): RowSwipe {
  const left = g.dx < 0
  const reveal = left ? g.trailing : g.leading
  if (!reveal) return "close"
  const d = Math.abs(g.dx)
  const fast = left ? g.vx < -0.8 : g.vx > 0.8
  if (d >= g.width * 0.6 || (fast && d > reveal)) return left ? "full-trailing" : "full-leading"
  if (d >= reveal / 2 || (fast && d > 16)) return left ? "trailing" : "leading"
  return "close"
}

/** How far the content follows a pull: it slows as it goes, like a rubber band. */
export function rubberBand(distance: number, limit = 120): number {
  if (distance <= 0) return 0
  return Math.round(limit * (1 - 1 / (distance / limit + 1)))
}

/** A pull refreshes when the content has followed it this far (after the rubber band). */
export const PULL_THRESHOLD = 56

export function pullRefreshes(distance: number): boolean {
  return rubberBand(distance) >= PULL_THRESHOLD
}
