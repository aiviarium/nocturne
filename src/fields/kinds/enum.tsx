// One of a closed set of values, each with its title and tone: a chip that opens the values. The ones a field's
// `transitions` do not allow from the current value are greyed out.
import { For, type JSX, Show } from "solid-js"
import { Badge, type BadgeTone } from "../../components/Badge"
import { Icon } from "../../components/Icon"
import { DropdownMenu } from "../../components/Menu"
import { type DotStatus, State } from "../../components/StatusDot"
import { cx } from "../../lib/cx"
import { Empty } from "../Empty"
import type { EditorProps, FieldKind, FilterProps, ValueProps } from "../kind"
import { OptionList, OptionPicker } from "../parts/OptionList"
import { type FieldTone, isEmpty, optionOf } from "../spec"

/** The badge of an enum tone. */
export function toneBadge(t: FieldTone | undefined): BadgeTone {
  switch (t) {
    case "accent":
      return "accent"
    case "positive":
      return "success"
    case "negative":
      return "danger"
    default:
      return "neutral"
  }
}

/** The dot of a state in a list, for an enum tone: the dot says the tone, the word says the value. */
export function toneDot(t: FieldTone | undefined): DotStatus {
  switch (t) {
    case "positive":
      return "ok"
    case "negative":
      return "error"
    case "accent":
      return "neutral"
    default:
      return "idle"
  }
}

function Value(props: ValueProps): JSX.Element {
  const o = () => optionOf(props.spec, props.value)
  return (
    <Show when={!isEmpty(props.value)} fallback={<Empty />}>
      <Show when={props.dot} fallback={<Badge tone={toneBadge(o().tone)}>{o().title}</Badge>}>
        <State status={toneDot(o().tone)}>{o().title}</State>
      </Show>
    </Show>
  )
}

function Segmented(props: EditorProps): JSX.Element {
  return (
    <fieldset class="nc-seg nc-field-seg">
      <legend class="nc-visually-hidden">{props.spec.title}</legend>
      <For each={props.spec.options ?? []}>
        {(o) => (
          <button
            type="button"
            class="nc-seg__item"
            aria-pressed={props.value === o.value}
            disabled={props.disabled || (props.allowed ? !props.allowed(o.value) : false)}
            onClick={() => props.value !== o.value && props.onCommit(o.value)}
          >
            {o.title}
          </button>
        )}
      </For>
    </fieldset>
  )
}

function Editor(props: EditorProps): JSX.Element {
  return (
    <Show when={props.spec.presentation !== "segmented"} fallback={<Segmented {...props} />}>
      <Menu {...props} />
    </Show>
  )
}

function Menu(props: EditorProps): JSX.Element {
  const options = () => props.spec.options ?? []
  // A value that is the empty string and listed ("Default") is a choice, not the lack of one.
  const emptyListed = () => options().some((o) => o.value === "")
  const current = () =>
    typeof props.value === "string" && (props.value !== "" || emptyListed()) ? props.value : null
  const clearable = () => !props.spec.required && !emptyListed() && current() !== null
  return (
    <DropdownMenu
      label={props.spec.title}
      placement="bottom-start"
      radio
      items={[
        ...options().map((o) => ({
          id: o.value,
          label: o.title,
          ...(o.description ? { description: o.description } : {}),
          checked: o.value === current(),
          disabled: props.allowed ? !props.allowed(o.value) && o.value !== current() : false,
        })),
        ...(clearable() ? [{ type: "separator" as const }, { id: "", label: "Clear" }] : []),
      ]}
      onSelect={(id) => {
        if (id === "" || id !== current()) props.onCommit(id === "" ? null : id)
      }}
      trigger={(t) => (
        <button
          {...t}
          type="button"
          class={cx("nc-field-chip", props.variant === "boxed" && "nc-input nc-select nc-field-chip--boxed")}
          data-part="enum-picker"
          aria-label={props.spec.title}
          aria-invalid={props.error ? true : undefined}
          disabled={props.disabled}
        >
          <Show when={current()} fallback={<Empty />}>
            {(v) => {
              const o = () => optionOf(props.spec, v())
              return <Badge tone={toneBadge(o().tone)}>{o().title}</Badge>
            }}
          </Show>
          <Show when={!props.disabled}>
            <Icon name="chevron-down" size="sm" class="nc-select__chevron" />
          </Show>
        </button>
      )}
    />
  )
}

function Filter(props: FilterProps): JSX.Element {
  const list = () =>
    Array.isArray(props.value)
      ? (props.value as string[])
      : typeof props.value === "string" && props.value
        ? [props.value]
        : []
  const options = () => (props.spec.options ?? []).map((o) => ({ value: o.value, label: o.title }))
  const toggle = (x: string) => {
    if (!props.multiple) {
      props.onChange(x)
      props.onDone?.()
    } else props.onChange(list().includes(x) ? list().filter((y) => y !== x) : [...list(), x])
  }
  return (
    <Show
      when={props.layout !== "row"}
      fallback={
        <OptionPicker
          options={options()}
          value={list()}
          multiple={!!props.multiple}
          label={props.label}
          onChange={(x) => props.onChange(props.multiple ? x : (x[0] ?? null))}
        />
      }
    >
      <OptionList
        options={options()}
        value={list()}
        multiple={!!props.multiple}
        label={props.spec.title}
        autoFocus={props.autofocus}
        onToggle={toggle}
      />
    </Show>
  )
}

export const enumKind: FieldKind = {
  text: (spec, v) => (isEmpty(v) ? "" : optionOf(spec, v).title),
  Value,
  Editor,
  Filter,
}
