import type { JSX } from "@solidjs/web"

/** No value: one em dash, muted, wherever a value is read. */
export function Empty(): JSX.Element {
  return (
    <span data-part="field-empty" class="nc-meta nc-field-empty" aria-label="Empty">
      —
    </span>
  )
}
