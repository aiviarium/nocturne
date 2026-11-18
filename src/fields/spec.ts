// What a field is, for every surface that shows or edits a typed value: the one description the widget set of
// the library takes. A JSON Schema property maps onto it through `fieldOfSchema`, and an app's own field types
// through an adapter of its own, so the type systems stay apart and the controls are the same.
import type { Units } from "../lib/expression"

/** The kinds, each with one implementation in `fields/kinds/<kind>.tsx`. */
export type FieldKindId =
  | "text"
  | "longtext"
  | "richtext"
  | "number"
  | "currency"
  | "boolean"
  | "date"
  | "datetime"
  | "enum"
  | "ref"
  | "tags"
  | "secret"
  | "json"
  | "blob"
  | "bytes"
  | "vector"

export type FieldTone = "neutral" | "accent" | "positive" | "negative"

export interface FieldOption {
  value: string
  title: string
  /** One line under the title in the list of values. */
  description?: string | undefined
  tone?: FieldTone | undefined
}

export interface FieldSpec {
  /** The name the value is stored under. */
  name: string
  /** What people call it: labels, headers, chips, screen readers. */
  title: string
  kind: FieldKindId
  required?: boolean
  /** Lists (`refs`, `tags`): the value is an array. */
  multiple?: boolean
  /** Text in a monospace face: paths, ids. */
  mono?: boolean
  integer?: boolean
  min?: number
  max?: number
  step?: number
  unit?: string
  /** Units a typed number may use, converted to `unit` (`UNITS.minutes` takes `1.5h`). */
  units?: Units
  minLength?: number
  maxLength?: number
  pattern?: string
  /** `percent`, `duration` and `progress` of a number; `url` and `email` of a text. */
  format?: "percent" | "duration" | "progress" | "url" | "email"
  /** ISO 4217, of a `currency`. */
  currency?: string
  /** An `enum`'s values with their titles and tones. */
  options?: FieldOption[]
  /** A `ref`: the entity scheme it points at. */
  scheme?: string
  /** A `boolean`'s words for true and false, in place of Yes and No. */
  trueTitle?: string
  falseTitle?: string
  /** A `bytes` field: the largest content it takes, in bytes (the field's constraint; 1 MiB when not declared). */
  maxBytes?: number
  /** A `vector`: its number of dimensions. */
  dimensions?: number
  /** A `secret` that already has a value: a blank field keeps it. */
  stored?: boolean
  /** A number with both bounds shown as a slider. */
  slider?: boolean
  /** An enum of few values as a row of buttons instead of a menu. */
  presentation?: "segmented"
  /** Shown but not changed: a counter the store assigns. */
  readOnly?: boolean
  placeholder?: string
  /** One line the field's author gave, shown with the control. */
  help?: string
}

/** Nothing to show: no value, an empty string or an empty list. */
export function isEmpty(v: unknown): boolean {
  return v == null || v === "" || (Array.isArray(v) && v.length === 0)
}

/** "closeOn" as "Close on". */
export const labelOf = (name: string) =>
  name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase())

/** The title of an enum value. */
export function optionOf(spec: FieldSpec, value: unknown): FieldOption {
  const v = String(value)
  return spec.options?.find((o) => o.value === v) ?? { value: v, title: labelOf(v) }
}
