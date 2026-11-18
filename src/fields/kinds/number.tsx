// Numbers: integers, decimals, counters, and the `percent`, `duration` and `progress` formats. A number with both
// bounds can be a slider. Typed values may be sums (`12*4`); the field says why it cannot read what was typed.
import { type JSX, Match, Show, Switch } from "solid-js"
import { NumberField } from "../../components/NumberField"
import { Slider } from "../../components/Slider"
import { Empty } from "../Empty"
import { formatNumber } from "../format"
import type { EditorProps, FieldKind, FilterProps, ValueProps } from "../kind"
import type { FieldSpec } from "../spec"

const numeric = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null)

function Value(props: ValueProps): JSX.Element {
  return (
    <Show when={numeric(props.value) !== null} fallback={<Empty />}>
      <span class="nc-field-number">{formatNumber(props.spec, numeric(props.value) as number)}</span>
    </Show>
  )
}

/** The editor of a number; `currency` passes the way its amounts are written. */
export function NumberEditor(
  props: EditorProps & { format?: ((n: number) => string) | undefined },
): JSX.Element {
  const spec = (): FieldSpec => props.spec
  const boxed = () => props.variant === "boxed"
  const live = () => boxed() && props.commit !== "leave"
  const range = () =>
    spec().slider &&
    spec().min != null &&
    spec().max != null &&
    (spec().max as number) > (spec().min as number)
  return (
    <Switch>
      <Match when={range()}>
        <Slider
          label={spec().title}
          min={spec().min as number}
          max={spec().max as number}
          step={spec().step ?? (spec().integer ? 1 : ((spec().max as number) - (spec().min as number)) / 100)}
          unit={spec().unit}
          value={numeric(props.value) ?? (spec().min as number)}
          field
          disabled={props.disabled}
          onChange={(v) => props.onCommit(v)}
        />
      </Match>
      <Match when={true}>
        <NumberField
          variant={boxed() ? "default" : "inline"}
          aria-label={spec().title}
          value={numeric(props.value)}
          integer={spec().integer}
          {...(spec().min != null ? { min: spec().min as number } : {})}
          {...(spec().max != null ? { max: spec().max as number } : {})}
          {...(spec().step != null ? { step: spec().step as number } : {})}
          unit={spec().unit}
          format={props.format ?? ((n) => formatNumber(spec(), n))}
          steppers={false}
          scrub={false}
          readOnly={props.disabled || spec().readOnly}
          error={!!props.error}
          inputRef={(el) => props.autofocus && queueMicrotask(() => el.focus())}
          // A form takes every change; a page in place saves when the entry is committed.
          {...(live()
            ? { onChange: (v: number | null) => props.onCommit(v) }
            : { onCommit: (v: number | null) => props.onCommit(v) })}
        />
      </Match>
    </Switch>
  )
}

function Filter(props: FilterProps): JSX.Element {
  return (
    <NumberField
      aria-label={props.label}
      value={numeric(props.value)}
      min={props.spec.min}
      max={props.spec.max}
      step={props.spec.step}
      integer={props.spec.integer}
      unit={props.spec.unit}
      class="nc-qvalue__number"
      onChange={(n) => props.onChange(n)}
    />
  )
}

export const number: FieldKind = {
  text: (spec, v) => (numeric(v) === null ? "" : formatNumber(spec, numeric(v) as number)),
  Value,
  Editor: NumberEditor,
  Filter,
}
