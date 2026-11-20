// A secret: write only. It is never read back or drawn: a stored one shows as set, and a blank field keeps it.

import type { JSX } from "@solidjs/web"
import { Show } from "solid-js"
import { TextField } from "../../components/TextField"
import { Empty } from "../Empty"
import type { EditorProps, FieldKind, ValueProps } from "../kind"

function Value(props: ValueProps): JSX.Element {
  return (
    <Show when={props.spec.stored} fallback={<Empty />}>
      <span class="nc-meta" aria-label="Set">
        ••••••••
      </span>
    </Show>
  )
}

function Editor(props: EditorProps): JSX.Element {
  return (
    <TextField
      type="password"
      mono
      aria-label={props.spec.title}
      value={typeof props.value === "string" ? props.value : ""}
      placeholder={props.spec.stored ? "••••••••••••" : undefined}
      autocomplete="new-password"
      disabled={props.disabled}
      error={props.error ? true : undefined}
      autofocus={props.autofocus}
      onInput={(e) => {
        props.onTouch?.()
        props.onCommit(e.currentTarget.value === "" ? null : e.currentTarget.value)
      }}
    />
  )
}

export const secret: FieldKind = {
  // What a spreadsheet, a label or a screen reader is given is never the secret.
  text: () => "",
  Value,
  Editor,
}
