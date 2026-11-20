// Yes or no: a switch, with the field's own words for true and false where it declares them ("Needs attention",
// "Routine"), never a bare button. Read, it is those words, or a check for a table's cell.

import type { JSX } from "@solidjs/web"
import { Show } from "solid-js"
import { Icon } from "../../components/Icon"
import { Switch } from "../../components/Switch"
import { Tabs } from "../../components/Tabs"
import { Empty } from "../Empty"
import type { EditorProps, FieldKind, FilterProps, ValueProps } from "../kind"
import type { FieldSpec } from "../spec"

/** What the value is called: the declared words, else Yes and No. */
const word = (spec: FieldSpec, on: boolean) => (on ? (spec.trueTitle ?? "Yes") : (spec.falseTitle ?? "No"))

function Value(props: ValueProps): JSX.Element {
  const on = () => props.value === true
  const declared = () => props.spec.trueTitle !== undefined || props.spec.falseTitle !== undefined
  return (
    <Show when={props.value != null} fallback={<Empty />}>
      <Show
        when={declared() || !props.compact}
        fallback={
          // A table's cell with no words of its own: a check for yes, nothing for no.
          <Show when={on()} fallback={<Empty />}>
            <Icon name="check" size="sm" label={word(props.spec, true)} />
          </Show>
        }
      >
        <span class={{ "nc-meta": !on() }}>{word(props.spec, on())}</span>
      </Show>
    </Show>
  )
}

function Editor(props: EditorProps): JSX.Element {
  const on = () => props.value === true
  const declared = () => props.spec.trueTitle !== undefined || props.spec.falseTitle !== undefined
  return (
    <span class="nc-field-switch">
      <Switch
        aria-label={props.spec.title}
        checked={on()}
        disabled={props.disabled}
        onChange={(v) => props.onCommit(v)}
      />
      <Show when={declared()}>
        <span class={["nc-field-switch__word", { "nc-meta": !on() }]}>{word(props.spec, on())}</span>
      </Show>
    </span>
  )
}

function Filter(props: FilterProps): JSX.Element {
  return (
    <Tabs
      label={props.label}
      items={[
        { id: "yes", label: word(props.spec, true) },
        { id: "no", label: word(props.spec, false) },
      ]}
      value={props.value === false ? "no" : "yes"}
      onChange={(id) => props.onChange(id === "yes")}
    />
  )
}

export const boolean: FieldKind = {
  text: (spec, v) => (v == null ? "" : word(spec, v === true)),
  Value,
  Editor,
  Filter,
}
