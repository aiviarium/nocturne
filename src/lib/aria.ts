/** The string form of an ARIA boolean attribute: `"true"` or `"false"`. */
export function aria(value: unknown): "true" | "false" {
  return value ? "true" : "false"
}

/** The string form of `aria-checked`, which has a third state for a partial select-all. */
export function ariaChecked(value: boolean | "mixed" | undefined): "true" | "false" | "mixed" | undefined {
  if (value === undefined) return undefined
  if (value === "mixed") return "mixed"
  return value ? "true" : "false"
}
