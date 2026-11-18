import { describe, expect, test } from "bun:test"
import {
  clamp,
  decimalsOf,
  evaluateExpression,
  formatWithUnits,
  snap,
  tidy,
  UNITS,
} from "../src/lib/expression"

const ok = (input: string, opts?: Parameters<typeof evaluateExpression>[1]) => {
  const r = evaluateExpression(input, opts)
  if (!r.ok) throw new Error(`${input}: ${r.error}`)
  return r.value
}
const err = (input: string, opts?: Parameters<typeof evaluateExpression>[1]) => {
  const r = evaluateExpression(input, opts)
  if (r.ok) throw new Error(`${input} gave ${r.value}, expected an error`)
  return r.error
}

describe("evaluateExpression: numbers", () => {
  test("plain numbers, decimals and exponents", () => {
    expect(ok("12")).toBe(12)
    expect(ok("  3.25 ")).toBe(3.25)
    expect(ok(".5")).toBe(0.5)
    expect(ok("2.")).toBe(2)
    expect(ok("1e3")).toBe(1000)
    expect(ok("2.5E-2")).toBe(0.025)
  })
  test("a decimal comma reads as a point", () => {
    expect(ok("1,5")).toBe(1.5)
  })
  test("empty input is no value", () => {
    expect(ok("")).toBeNull()
    expect(ok("   ")).toBeNull()
  })
})

describe("evaluateExpression: precedence", () => {
  test("multiplication before addition", () => {
    expect(ok("12*4")).toBe(48)
    expect(ok("2+3*4")).toBe(14)
    expect(ok("2*3+4")).toBe(10)
    expect(ok("10-4-3")).toBe(3)
    expect(ok("100/10/5")).toBe(2)
    expect(ok("8/2*4")).toBe(16)
  })
  test("parentheses", () => {
    expect(ok("(3+4)/2")).toBe(3.5)
    expect(ok("((1+2)*(3+4))")).toBe(21)
    expect(ok("2*(3+(4-1))")).toBe(12)
  })
  test("other ways to write times and minus", () => {
    expect(ok("3×4")).toBe(12)
    expect(ok("12÷4")).toBe(3)
    expect(ok("3x4")).toBe(12)
    expect(ok("3 x 4")).toBe(12)
    expect(ok("10−3")).toBe(7)
  })
  test("binary noise is rounded away", () => {
    expect(ok("0.1+0.2")).toBe(0.3)
    expect(ok("1.1*3")).toBe(3.3)
  })
})

describe("evaluateExpression: unary minus", () => {
  test("negative numbers without a current value", () => {
    expect(ok("-5")).toBe(-5)
    expect(ok("--5")).toBe(5)
    expect(ok("-(2+3)")).toBe(-5)
    expect(ok("3*-2")).toBe(-6)
    expect(ok("3--2")).toBe(5)
    expect(ok("+4")).toBe(4)
  })
  test("unary minus binds tighter than multiplication", () => {
    expect(ok("-2*3")).toBe(-6)
    expect(ok("2*-3+1")).toBe(-5)
  })
  test("= makes a leading minus absolute", () => {
    expect(ok("=-5", { current: 20 })).toBe(-5)
    expect(ok("=5", { current: 20 })).toBe(5)
  })
})

describe("evaluateExpression: percent", () => {
  test("a - b% is b percent off", () => {
    expect(ok("100-15%")).toBe(85)
    expect(ok("80+25%")).toBe(100)
    expect(ok("(100-15%)*2")).toBe(170)
    expect(ok("200 - 10% - 10%")).toBe(162)
  })
  test("elsewhere b% is a fraction", () => {
    expect(ok("50*10%")).toBe(5)
    expect(ok("10%")).toBe(0.1)
    expect(ok("200/50%")).toBe(400)
  })
  test("in a percentage field % is the unit", () => {
    expect(ok("50%", { units: UNITS.percent })).toBe(50)
    expect(ok("50%-10%", { units: UNITS.percent })).toBe(40)
  })
})

describe("evaluateExpression: relative to the current value", () => {
  test("a leading operator continues from the value", () => {
    expect(ok("+5", { current: 10 })).toBe(15)
    expect(ok("-5", { current: 10 })).toBe(5)
    expect(ok("*2", { current: 10 })).toBe(20)
    expect(ok("/4", { current: 10 })).toBe(2.5)
    expect(ok("-15%", { current: 200 })).toBe(170)
    expect(ok("+10%", { current: 200 })).toBe(220)
    expect(ok("*(1+1)", { current: 3 })).toBe(6)
  })
  test("without a current value the input stands alone", () => {
    expect(ok("+5", { current: null })).toBe(5)
    expect(ok("-5", { current: null })).toBe(-5)
    expect(err("*2", { current: null })).toContain("needs a value")
  })
  test("an input without a leading operator ignores the current value", () => {
    expect(ok("7", { current: 100 })).toBe(7)
  })
})

describe("evaluateExpression: units", () => {
  test("amounts in the field's unit", () => {
    expect(ok("10px", { units: UNITS.px })).toBe(10)
    expect(ok("10 px", { units: UNITS.px })).toBe(10)
    expect(ok("10px*2+4px", { units: UNITS.px })).toBe(24)
  })
  test("conversion to the field's unit", () => {
    expect(ok("1.5h", { units: UNITS.minutes })).toBe(90)
    expect(ok("90m", { units: UNITS.minutes })).toBe(90)
    expect(ok("90min", { units: UNITS.minutes })).toBe(90)
    expect(ok("1h 30m", { units: UNITS.minutes })).toBe(90)
    expect(ok("1h30m", { units: UNITS.minutes })).toBe(90)
    expect(ok("2h-15m", { units: UNITS.minutes })).toBe(105)
    expect(ok("90m", { units: UNITS.hours })).toBe(1.5)
    expect(ok("(1+2)h", { units: UNITS.minutes })).toBe(180)
    expect(ok("2KB", { units: UNITS.bytes })).toBe(2048)
  })
  test("a number without a unit is in the field's own unit", () => {
    expect(ok("45", { units: UNITS.minutes })).toBe(45)
    expect(ok("1h + 15", { units: UNITS.minutes })).toBe(75)
  })
  test("units are matched case-insensitively when there is no exact match", () => {
    expect(ok("2H", { units: UNITS.minutes })).toBe(120)
    expect(ok("1kb", { units: UNITS.bytes })).toBe(1024)
  })
  test("relative amounts in units", () => {
    expect(ok("+30m", { current: 60, units: UNITS.minutes })).toBe(90)
    expect(ok("-1h", { current: 90, units: UNITS.minutes })).toBe(30)
  })
  test("unknown and unwanted units are errors", () => {
    expect(err("10kg", { units: UNITS.minutes })).toContain("Unknown unit")
    expect(err("10px")).toContain("takes no units")
    expect(err("h", { units: UNITS.minutes })).toContain("needs a number")
    expect(err("1h 30", { units: UNITS.minutes })).toContain("needs a unit")
  })
})

describe("evaluateExpression: invalid input", () => {
  test.each([
    ["2+", "Missing a number"],
    ["*", "needs a value"],
    ["(1+2", "Missing “)”"],
    ["1+2)", "Unexpected “)”"],
    ["()", "Missing a number"],
    ["1 2", "Missing an operator"],
    ["1/0", "Division by zero"],
    ["5/(2-2)", "Division by zero"],
    ["abc", "“abc” is not a number"],
    ["2^3", "Unexpected “^”"],
    ["1=2", "Unexpected “=”"],
    ["alert(1)", "is not a number"],
    ["1e999", "not a number"],
  ])("%s", (input, message) => {
    expect(err(input)).toContain(message)
  })
  test("no code is evaluated", () => {
    expect(evaluateExpression("constructor").ok).toBe(false)
    expect(evaluateExpression("__proto__").ok).toBe(false)
    expect(evaluateExpression("Math.PI").ok).toBe(false)
  })
})

describe("number helpers", () => {
  test("decimalsOf", () => {
    expect(decimalsOf(1)).toBe(0)
    expect(decimalsOf(0.25)).toBe(2)
    expect(decimalsOf(0.1)).toBe(1)
    expect(decimalsOf(1e-7)).toBe(7)
  })
  test("clamp and snap", () => {
    expect(clamp(5, 0, 3)).toBe(3)
    expect(clamp(-1, 0)).toBe(0)
    expect(clamp(2)).toBe(2)
    expect(snap(0.3000001, 0.1)).toBe(0.3)
    expect(snap(7, 5)).toBe(5)
    expect(snap(8, 5)).toBe(10)
    expect(snap(4, 2.5, 1)).toBe(3.5)
  })
  test("tidy", () => {
    expect(tidy(0.1 + 0.2)).toBe(0.3)
  })
  test("formatWithUnits", () => {
    expect(formatWithUnits(90, UNITS.minutes, ["h", "m"])).toBe("1h 30m")
    expect(formatWithUnits(60, UNITS.minutes, ["h", "m"])).toBe("1h")
    expect(formatWithUnits(45, UNITS.minutes, ["h", "m"])).toBe("45m")
    expect(formatWithUnits(0, UNITS.minutes, ["h", "m"])).toBe("0m")
    expect(formatWithUnits(-90, UNITS.minutes, ["h", "m"])).toBe("-1h 30m")
    expect(formatWithUnits(1.5, UNITS.minutes, ["h", "m"])).toBe("1.5m")
  })
})
