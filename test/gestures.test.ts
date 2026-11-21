// The decisions behind the phone's gestures (src/lib/gestures.ts) and the bar's choice of actions.
import { describe, expect, test } from "bun:test"
import {
  lockDirection,
  PULL_THRESHOLD,
  pullRefreshes,
  rowSwipe,
  rubberBand,
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
