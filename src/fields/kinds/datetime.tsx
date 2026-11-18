// An instant (RFC 3339): read in the person's locale and time zone, picked as a day and a time.
import { type JSX, Show } from "solid-js"
import { Empty } from "../Empty"
import { formatDate } from "../format"
import type { EditorProps, FieldKind, FilterProps, ValueProps } from "../kind"
import { DatePicker } from "../parts/DatePicker"
import { isEmpty } from "../spec"

const instant = (v: unknown) => (typeof v === "string" && v ? v : null)

function Value(props: ValueProps): JSX.Element {
  return (
    <Show when={instant(props.value)} fallback={<Empty />}>
      {(v) => <span>{formatDate(v(), true)}</span>}
    </Show>
  )
}

function Editor(props: EditorProps): JSX.Element {
  return (
    <DatePicker
      time
      value={instant(props.value)}
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
  // A rule asks for days; a value that is an instant is read and edited as one, with its time, like the editor does.
  const value = () => (typeof props.value === "string" && props.value ? props.value : null)
  return (
    <DatePicker
      time={value()?.includes("T") === true}
      value={value()}
      label={props.label}
      variant="boxed"
      autofocus={props.autofocus}
      onChange={(v) => props.onChange(v)}
    />
  )
}

export const datetime: FieldKind = {
  text: (_s, v) => (isEmpty(v) ? "" : formatDate(String(v), true)),
  Value,
  Editor,
  Filter,
}
