// The surfaces' way in: draw a value, edit it, filter by it, write it as text, or lay it out as a labelled row of a
// form. Every one goes through the kind's implementation (`registry.ts`); nothing outside this folder draws a typed
// value of its own.

import { createMemo, type JSX, Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import { InfoTip } from "../components/InfoTip"
import { cx } from "../lib/cx"
import { createId } from "../lib/id"
import type { QueryField } from "../lib/query"
import type { EditorProps, FilterProps, ValueProps } from "./kind"
import { FIELD_KINDS } from "./registry"
import type { FieldKindId, FieldSpec } from "./spec"

/** A field's value as plain text: a menu, a label, a screen reader, a spreadsheet. Empty for no value. */
export function fieldText(spec: FieldSpec, value: unknown): string {
  return FIELD_KINDS[spec.kind].text(spec, value)
}

/** The value, read only. */
export function FieldValue(props: ValueProps): JSX.Element {
  return <Dynamic component={FIELD_KINDS[props.spec.kind].Value} {...props} />
}

/** The editor of a field. */
export function FieldEditor(props: EditorProps): JSX.Element {
  // The value as a memo: a row that is read again with the same value does not reach the control, which would put a
  // draft the store refused back to the saved value.
  const value = createMemo(() => props.value)
  return <Dynamic component={FIELD_KINDS[props.spec.kind].Editor} {...props} value={value()} />
}

/** The control of a filter rule's value, or nothing for a kind that cannot be filtered. */
export function FieldFilter(props: FilterProps): JSX.Element {
  const Filter = FIELD_KINDS[props.spec.kind].Filter
  return Filter ? <Filter {...props} /> : null
}

/** What a filter's field is as a field: its kind and the limits its controls take. */
export function specOfQueryField(f: QueryField): FieldSpec {
  const kind: FieldKindId =
    f.type === "number"
      ? "number"
      : f.type === "boolean"
        ? "boolean"
        : f.type === "date"
          ? f.datetime
            ? "datetime"
            : "date"
          : f.type === "enum"
            ? "enum"
            : "text"
  return {
    name: f.name,
    title: f.label,
    kind,
    ...(f.integer ? { integer: true } : {}),
    ...(f.min !== undefined ? { min: f.min } : {}),
    ...(f.max !== undefined ? { max: f.max } : {}),
    ...(f.step !== undefined ? { step: f.step } : {}),
    ...(f.unit ? { unit: f.unit } : {}),
    ...(f.units ? { units: f.units } : {}),
    ...(f.options ? { options: f.options.map((o) => ({ value: o.value, title: o.label })) } : {}),
  }
}

export interface FormFieldProps {
  spec: FieldSpec
  /** The refusal at this field, already in words. */
  error?: string | undefined
  /** `row`: the label beside the control (a switch). Default by kind. */
  layout?: "stack" | "row" | undefined
  /** The control. */
  children: JSX.Element
  class?: string | undefined
}

/**
 * One field of a form (a create dialog, a settings page, a connection form, a params dialog): its label, a marker
 * where it may be left out, the control, and what was refused at it. A switch sits beside its label, as on a phone's
 * settings; every other control is under it.
 */
export function FormField(props: FormFieldProps): JSX.Element {
  const id = createId("ff")
  const row = () => (props.layout ?? (props.spec.kind === "boolean" ? "row" : "stack")) === "row"
  return (
    <div
      class={cx("nc-fieldrow", row() && "nc-fieldrow--row", props.class)}
      data-part="field-row"
      data-field={props.spec.name}
      data-kind={props.spec.kind}
      data-invalid={props.error ? "" : undefined}
    >
      <span class="nc-fieldrow__label" id={`${id}-label`}>
        {props.spec.title}
        <Show when={!props.spec.required && props.spec.kind !== "boolean"}>
          <span class="nc-fieldrow__optional"> (optional)</span>
        </Show>
        <Show when={props.spec.help}>{(h) => <InfoTip label={props.spec.title}>{h()}</InfoTip>}</Show>
      </span>
      <div class="nc-fieldrow__control">{props.children}</div>
      <Show when={props.error}>
        {(m) => (
          <p class="nc-fieldrow__message nc-fieldrow__message--error" role="alert">
            {m()}
          </p>
        )}
      </Show>
    </div>
  )
}
