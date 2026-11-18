// An amount in a currency: written the same in a table, a list, a record page and a form.
import { type JSX, Show } from "solid-js"
import { Empty } from "../Empty"
import { formatMoney } from "../format"
import type { EditorProps, FieldKind, ValueProps } from "../kind"
import { NumberEditor, number } from "./number"

const amount = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null)

function Value(props: ValueProps): JSX.Element {
  return (
    <Show when={amount(props.value) !== null} fallback={<Empty />}>
      <span class="nc-field-number">{formatMoney(props.spec.currency, amount(props.value) as number)}</span>
    </Show>
  )
}

function Editor(props: EditorProps): JSX.Element {
  return <NumberEditor {...props} format={(n) => formatMoney(props.spec.currency, n)} />
}

export const currency: FieldKind = {
  text: (spec, v) => (amount(v) === null ? "" : formatMoney(spec.currency, amount(v) as number)),
  Value,
  Editor,
  ...(number.Filter ? { Filter: number.Filter } : {}),
}
