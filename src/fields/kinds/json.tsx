// Anything a form cannot lay out: shown as compact JSON, edited as text that holds JSON.
import { type JSX, Show } from "solid-js"
import { TextField } from "../../components/TextField"
import { Empty } from "../Empty"
import type { EditorProps, FieldKind, ValueProps } from "../kind"
import { isEmpty } from "../spec"

const asText = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : JSON.stringify(v))

function Value(props: ValueProps): JSX.Element {
  return (
    <Show when={!isEmpty(props.value)} fallback={<Empty />}>
      <span class="nc-field-mono nc-field-json">{asText(props.value)}</span>
    </Show>
  )
}

function Editor(props: EditorProps): JSX.Element {
  return (
    <TextField
      mono
      aria-label={props.spec.title}
      value={asText(props.value)}
      disabled={props.disabled}
      error={props.error ? true : undefined}
      autofocus={props.autofocus}
      onInput={(e) => {
        props.onTouch?.()
        if (props.commit !== "leave") props.onCommit(e.currentTarget.value)
      }}
      onChange={(e) => props.commit === "leave" && props.onCommit(e.currentTarget.value)}
    />
  )
}

export const json: FieldKind = {
  text: (_s, v) => asText(v),
  Value,
  Editor,
}
