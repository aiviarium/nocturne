let counter = 0

/** A document-unique id for `aria-*` wiring. */
export function createId(prefix = "nc"): string {
  counter += 1
  return `${prefix}-${counter}`
}
