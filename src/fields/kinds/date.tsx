// A day (`YYYY-MM-DD`): read as the person's locale writes it, picked from a calendar.
import { type JSX, Show } from "solid-js"
import { Empty } from "../Empty"
import { formatDate } from "../format"
import type { EditorProps, FieldKind, FilterProps, ValueProps } from "../kind"
import { DatePicker } from "../parts/DatePicker"
import { isEmpty } from "../spec"

const day = (v: unknown) => (typeof v === "string" && v ? v : null)

function Value(props: ValueProps): JSX.Element {
  return (
    <Show when={day(props.value)} fallback={<Empty />}>
      {(v) => <span>{formatDate(v(), false)}</span>}
    </Show>
  )
}

function Editor(props: EditorProps): JSX.Element {
  return (
    <DatePicker
      value={day(props.value)}
      label={props.spec.title}
      required={props.spec.required}
      disabled={props.disabled}
      invalid={!!props.error}
      variant={props.variant}
      autofocus={props.autofocus}
      onChange={(v) => props.onCommit(v)}
    />
  )
}

function Filter(props: FilterProps): JSX.Element {
  return (
    <DatePicker
      value={day(props.value)}
      label={props.label}
      variant="boxed"
      autofocus={props.autofocus}
      onChange={(v) => props.onChange(v)}
    />
  )
}

export const date: FieldKind = {
  text: (_s, v) => (isEmpty(v) ? "" : formatDate(String(v), false)),
  Value,
  Editor,
  Filter,
}
