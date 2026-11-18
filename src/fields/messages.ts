// What a refused value says at its field. The store names the constraint (`required`, `maxLength`, …) and the field;
// the words are made here, once, from the code and the field's declared limits, in a form that does not repeat the
// field's name ("At most 80 characters", not "field title must be at most 80 characters"). A code this does not
// know shows the store's own message.
import { formatNumber } from "./format"
import { type FieldSpec, optionOf } from "./spec"

export interface Refusal {
  /** The store's constraint code: `required`, `min`, `max`, `minLength`, `maxLength`, `pattern`, `enum`, `transitions`. */
  constraint?: string | undefined
  /** The store's own sentence, for a code that is not known. */
  message?: string | undefined
  /** `transitions`: the value the field had and the one it was given. */
  from?: unknown
  to?: unknown
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
export const characters = (n: number) => count(n, "character", "characters")
export const items = (n: number) => count(n, "item", "items")

/**
 * The words of a refusal that does not repeat the field's name, for the checks a form makes before it asks the
 * store and for the store's own codes (`refusalMessage` below).
 */
export const phrase = {
  required: "Required",
  atLeast: (what: string) => `At least ${what}`,
  atMost: (what: string) => `At most ${what}`,
  moreThan: (what: string) => `More than ${what}`,
  lessThan: (what: string) => `Less than ${what}`,
  multiple: (n: string) => `A multiple of ${n}`,
  pattern: "Not in the expected format",
  email: "Not an email address",
  url: "Not a full URL, such as https://example.com",
  number: "Not a number",
  whole: "Whole numbers only",
  choose: "Choose a value",
  listed: "Not one of the listed values",
  json: "Not valid JSON",
  enum: "Choose one of the values",
} as const

/** The message for a refusal of `spec`'s field. */
export function refusalMessage(spec: FieldSpec | undefined, r: Refusal): string {
  const num = (n: number) => (spec ? formatNumber(spec, n) : String(n))
  switch (r.constraint) {
    case "required":
      return phrase.required
    case "min":
      if (spec?.min != null) return phrase.atLeast(num(spec.min))
      break
    case "max":
      if (spec?.max != null) return phrase.atMost(num(spec.max))
      break
    case "minLength":
      if (spec?.minLength != null) return phrase.atLeast(characters(spec.minLength))
      break
    case "maxLength":
      if (spec?.maxLength != null) return phrase.atMost(characters(spec.maxLength))
      break
    case "pattern":
      return phrase.pattern
    case "enum":
      return phrase.enum
    case "transitions":
      if (spec?.options && r.from != null && r.to != null)
        return `Cannot change from ${optionOf(spec, r.from).title} to ${optionOf(spec, r.to).title}`
      return "Cannot change to that value"
  }
  return r.message || "Not accepted"
}

/** The refusal an error from the store is, when it is a constraint on one field. */
export function refusalOf(e: unknown): (Refusal & { field: string }) | null {
  const err = e as { code?: string; message?: string; details?: { field?: unknown; constraint?: unknown } }
  if (err?.code !== "INVALID" || typeof err.details?.field !== "string") return null
  return {
    field: err.details.field,
    constraint: typeof err.details.constraint === "string" ? err.details.constraint : undefined,
    message: err.message,
  }
}
