// The decisions behind the phone's gestures (src/lib/gestures.ts) and the bar's choice of actions.
import { describe, expect, test } from "bun:test"
import {
  detentHeights,
  lockDirection,
  PULL_THRESHOLD,
  pullRefreshes,
  rowSwipe,
  rubberBand,
  settleDetent,
  swipeBack,
} from "../src/lib/gestures"

describe("direction lock", () => {
  test("undecided until it has moved 10 px, then the larger axis", () => {
    expect(lockDirection(4, 5)).toBeNull()
    expect(lockDirection(12, 3)).toBe("x")
    expect(lockDirection(-3, 14)).toBe("y")
  })
})

describe("swipe back from the edge", () => {
  const width = 390
  test("past 35% of the width goes back", () => {
    expect(swipeBack({ dx: 137, vx: 0, width })).toBe("back")
    expect(swipeBack({ dx: 130, vx: 0, width })).toBe("cancel")
  })
  test("a flick goes back from a short distance, but not from a tiny one", () => {
    expect(swipeBack({ dx: 40, vx: 0.8, width })).toBe("back")
    expect(swipeBack({ dx: 10, vx: 2, width })).toBe("cancel")
  })
  test("a flick back to the left cancels however far it went", () => {
    expect(swipeBack({ dx: 300, vx: -0.5, width })).toBe("cancel")
  })
})

describe("sheet detents", () => {
  test("medium and large when the content is tall", () => {
    expect(detentHeights({ available: 800, content: 2000, detents: ["medium", "large"] })).toEqual([400, 788])
  })
  test("one detent at the content's height when it fits under medium", () => {
    expect(detentHeights({ available: 800, content: 220, detents: ["medium", "large"] })).toEqual([220])
  })
  test("content between medium and large opens at its own height, not at medium", () => {
    expect(detentHeights({ available: 800, content: 600, detents: ["medium", "large"] })).toEqual([600])
    expect(detentHeights({ available: 800, content: 788, detents: ["medium", "large"] })).toEqual([788])
  })
  test("only content taller than large rests at medium and large", () => {
    expect(detentHeights({ available: 800, content: 789, detents: ["medium", "large"] })).toEqual([400, 788])
    expect(detentHeights({ available: 800, content: 2000, detents: ["large"] })).toEqual([788])
  })
  test("fit is the content's height, never more than large", () => {
    expect(detentHeights({ available: 800, content: 5000, detents: ["fit"] })).toEqual([788])
  })
  const h = [400, 788]
  test("a slow release goes to the nearest detent", () => {
    expect(settleDetent(h, 700, 0)).toBe(1)
    expect(settleDetent(h, 520, 0)).toBe(0)
  })
  test("below 60% of the smallest dismisses", () => {
    expect(settleDetent(h, 230, 0)).toBe(-1)
    expect(settleDetent(h, 250, 0)).toBe(0)
  })
  test("a flick moves one detent in its direction, or dismisses from the smallest", () => {
    expect(settleDetent(h, 760, 1.2)).toBe(0)
    expect(settleDetent(h, 420, -1.2)).toBe(1)
    expect(settleDetent(h, 380, 1.2)).toBe(-1)
  })
  test("a sheet that may not be dismissed stays at its smallest", () => {
    expect(settleDetent(h, 100, 0, false)).toBe(0)
    expect(settleDetent(h, 380, 1.2, false)).toBe(0)
  })
})

describe("row swipe actions", () => {
  const row = { width: 360, leading: 76, trailing: 76 }
  test("past half the actions' width they stay open", () => {
    expect(rowSwipe({ ...row, dx: -50, vx: 0 })).toBe("trailing")
    expect(rowSwipe({ ...row, dx: 40, vx: 0 })).toBe("leading")
    expect(rowSwipe({ ...row, dx: -30, vx: 0 })).toBe("close")
  })
  test("past 60% of the row, or a fast flick past the actions, runs the first one", () => {
    expect(rowSwipe({ ...row, dx: -230, vx: 0 })).toBe("full-trailing")
    expect(rowSwipe({ ...row, dx: -100, vx: -1 })).toBe("full-trailing")
    expect(rowSwipe({ ...row, dx: 230, vx: 0 })).toBe("full-leading")
  })
  test("a side without actions does not open", () => {
    expect(rowSwipe({ ...row, leading: 0, dx: 200, vx: 0 })).toBe("close")
  })
})

describe("pull to refresh", () => {
  test("the content follows less and less", () => {
    expect(rubberBand(0)).toBe(0)
    expect(rubberBand(60)).toBeLessThan(60)
    expect(rubberBand(1000)).toBeLessThan(120)
  })
  test("refreshes once it has followed the threshold", () => {
    expect(pullRefreshes(80)).toBe(false)
    expect(pullRefreshes(120)).toBe(true)
    expect(rubberBand(120)).toBeGreaterThanOrEqual(PULL_THRESHOLD)
  })
})
