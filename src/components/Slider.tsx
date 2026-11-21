import type { JSX } from "@solidjs/web"
import {
  createSliderController,
  SliderControl,
  SliderIndicator,
  Slider as SliderRoot,
  SliderThumb,
  SliderTrack,
} from "@ui-sdk/solid/slider"
import { createMemo, createSignal, For, Show } from "solid-js"
import { cx } from "../lib/cx"
import { clamp, decimalsOf, snap } from "../lib/expression"
import { createId } from "../lib/id"
import { NumberField } from "./NumberField"

export interface SliderMark {
  /** Where the mark sits. */
  value: number
  /** Text under it. A mark without a label is a tick. */
  label?: string
}

interface SliderCommonProps {
  /** Lower bound. Default 0. */
  min?: number
  /** Upper bound. Default 100. */
  max?: number
  /** The step a value snaps to and arrow keys move by. Default 1. */
  step?: number
  /** What Page Up and Page Down (and Shift with an arrow) move by. Default a tenth of the range, on the step. */
  largeStep?: number
  /** Label above the slider, with the value at its right. */
  label?: string
  /** Accessible name when there is no visible label. */
  "aria-label"?: string
  /** Help text below. */
  help?: string
  /** Writes a value for the readout and for assistive technology: `(v) => \`${v}%\``. */
  format?: (value: number) => string
  /** Unit after the value in the readout and in the attached field. */
  unit?: string
  /** Show the value at the right of the label. Default on when there is a label and no field. */
  showValue?: boolean
  /** Tick marks: `true` at every step, a number for every n-th step. */
  ticks?: boolean | number
  /** Labelled positions under the track ("Low", "High", or values). */
  marks?: SliderMark[]
  /** A NumberField beside the slider for an exact value (horizontal only). */
  field?: boolean
  /** `vertical` stands it up; its height is `--nc-slider-length` (default 120px). */
  orientation?: "horizontal" | "vertical"
  disabled?: boolean
  /** Called once a change ends: pointer released, a key pressed, the field committed. */
  onCommit?: () => void
  class?: string
  id?: string
}

export interface SliderProps extends SliderCommonProps {
  /** The value. Controlled when set. */
  value?: number
  /** Initial value when uncontrolled. Default `min`. */
  defaultValue?: number
  /** Called with every value while dragging, and on each key. */
  onChange?: (value: number) => void
}

export interface RangeSliderProps extends SliderCommonProps {
  /** The two ends. Controlled when set. */
  value?: [number, number]
  /** Initial ends when uncontrolled. Default the bounds. */
  defaultValue?: [number, number]
  /** Called with both ends while dragging, and on each key. */
  onChange?: (value: [number, number]) => void
  /** The smallest gap between the ends. Default 0. */
  minDistance?: number
  /** Accessible names of the two thumbs. Default "Minimum" and "Maximum". */
  thumbLabels?: [string, string]
}

/**
 * A slider: one value on a track, with ARIA slider semantics. Arrow keys move a step (Shift a large step),
 * Page Up and Down a large step, Home and End to the bounds; drag the thumb or press the track. Steps with
 * ticks and labelled marks, an attached NumberField for an exact value, and a vertical form. On a phone the
 * track stays compact and the hit area is 44px.
 */
export function Slider(props: SliderProps): JSX.Element {
  return (
    <SliderCore
      {...props}
      count={1}
      value={props.value}
      defaultValue={props.defaultValue ?? props.min ?? 0}
      onValue={(v) => props.onChange?.(v as number)}
      thumbLabel={() => (props.label ? undefined : props["aria-label"])}
    />
  )
}

/** A slider with two thumbs for a range. The thumbs cannot pass each other (nor come closer than `minDistance`). */
export function RangeSlider(props: RangeSliderProps): JSX.Element {
  return (
    <SliderCore
      {...props}
      field={false}
      count={2}
      value={props.value}
      defaultValue={props.defaultValue ?? [props.min ?? 0, props.max ?? 100]}
      onValue={(v) => props.onChange?.(v as [number, number])}
      minDistance={props.minDistance}
      thumbLabel={(i) => {
        const name = props.thumbLabels?.[i] ?? (i === 0 ? "Minimum" : "Maximum")
        return props.label ? `${props.label}, ${name.toLowerCase()}` : name
      }}
    />
  )
}

interface CoreProps extends SliderCommonProps {
  count: 1 | 2
  value: number | number[] | undefined
  defaultValue: number | number[]
  onValue: (value: number | number[]) => void
  minDistance?: number
  thumbLabel: (index: number) => string | undefined
}

/**
 * ui-sdk's Slider does the keys, the drag, the press on the track and a hidden range input per thumb, which a
 * phone's screen reader adjusts with its own gestures. This draws the head, ticks, marks and the attached field.
 */
function SliderCore(props: CoreProps): JSX.Element {
  const min = () => props.min ?? 0
  const max = () => ((props.max ?? 100) > min() ? (props.max ?? 100) : min() + 1)
  const step = () => (props.step && props.step > 0 ? props.step : 1)
  const large = () => props.largeStep ?? Math.max(step(), snap((max() - min()) / 10, step()))
  const vertical = () => props.orientation === "vertical"
  const fix = (v: number) => {
    const d = Math.max(decimalsOf(step()), decimalsOf(min()))
    return Number(clamp(snap(v, step(), min()), min(), max()).toFixed(d))
  }
  const pct = (v: number) => ((clamp(v, min(), max()) - min()) / (max() - min())) * 100
  const text = (v: number) => (props.format ? props.format(v) : `${v}${props.unit ? ` ${props.unit}` : ""}`)
  const showValue = () => props.showValue ?? (Boolean(props.label) && !props.field)
  const pos = (p: number): JSX.CSSProperties => (vertical() ? { bottom: `${p}%` } : { left: `${p}%` })
  const tickValues = createMemo(() => {
    if (!props.ticks) return []
    const every = typeof props.ticks === "number" ? props.ticks : 1
    const d = step() * every
    const count = Math.floor((max() - min()) / d + 1e-9)
    if (count > 200) return []
    return Array.from({ length: count + 1 }, (_, i) => fix(min() + i * d))
  })
  const values = (v: number | number[]) => (Array.isArray(v) ? v : [v])
  // The attached field moves the slider as a person would, so an uncontrolled slider follows it too.
  const controller = createSliderController()
  // Not ui-sdk's Field: a Field draws its children again when its state changes, which replaced the thumbs (and
  // lost their focus) on every step.
  const id = props.id ?? createId("slider")
  const labelId = `${id}-label`
  const helpId = `${id}-help`
  // What the ticks, the readout and the field show: the value as it moves, whether or not it is controlled.
  const [moving, setMoving] = createSignal<number | number[]>(props.defaultValue)
  const current = () => values(props.value ?? moving())
  return (
    <>
      <SliderRoot
        id={id}
        data-part="slider"
        data-orientation={vertical() ? "vertical" : "horizontal"}
        data-disabled={props.disabled || undefined}
        class={cx("nc-field nc-slider-field", props.class)}
        aria-labelledby={props.count > 1 && props.label ? labelId : undefined}
        value={props.value}
        defaultValue={props.value === undefined ? props.defaultValue : undefined}
        onValueChange={(v: number | number[]) => {
          setMoving(v)
          props.onValue(v)
        }}
        onValueCommit={() => props.onCommit?.()}
        min={min()}
        max={max()}
        step={step()}
        largeStep={large()}
        minStepsBetweenThumbs={props.minDistance ? Math.round(props.minDistance / step()) : 0}
        orientation={vertical() ? "vertical" : "horizontal"}
        disabled={props.disabled}
        format={(v: number) => text(v)}
        controller={controller}
      >
        <Show when={props.label || showValue()}>
          <div class="nc-slider__head">
            <Show when={props.label}>
              <span id={labelId} class="nc-field__label">
                {props.label}
              </span>
            </Show>
            <Show when={showValue()}>
              <span class="nc-slider__value" aria-hidden="true">
                {current().map(text).join(" – ")}
              </span>
            </Show>
          </div>
        </Show>
        <div class="nc-slider__row">
          <div class="nc-slider__body">
            <SliderControl class="nc-slider">
              <SliderTrack class="nc-slider__track">
                <SliderIndicator class="nc-slider__fill" />
                <For each={Array.from({ length: props.count }, (_, i) => i)}>
                  {(i) => (
                    <SliderThumb
                      index={i}
                      class="nc-slider__thumb"
                      aria-label={props.thumbLabel(i)}
                      aria-labelledby={props.label && !props.thumbLabel(i) ? labelId : undefined}
                      aria-describedby={props.help ? helpId : undefined}
                    />
                  )}
                </For>
              </SliderTrack>
              <For each={tickValues()}>
                {(t) => {
                  const on = () => {
                    const v = current()
                    const [a, b] = v.length > 1 ? [v[0]!, v[1]!] : [min(), v[0]!]
                    return t >= Math.min(a, b) - 1e-9 && t <= Math.max(a, b) + 1e-9
                  }
                  return <span class="nc-slider__tick" data-on={on() || undefined} style={pos(pct(t))} />
                }}
              </For>
            </SliderControl>
            <Show when={props.marks?.length && !vertical()}>
              <div class="nc-slider__marks" aria-hidden="true">
                <For each={props.marks}>
                  {(m) => (
                    <span
                      class="nc-slider__mark"
                      data-edge={pct(m.value) <= 0 ? "start" : pct(m.value) >= 100 ? "end" : undefined}
                      style={pos(pct(m.value))}
                    >
                      {m.label ?? text(m.value)}
                    </span>
                  )}
                </For>
              </div>
            </Show>
          </div>
          <Show when={props.field && !vertical()}>
            <NumberField
              class="nc-slider__field"
              aria-label={props.label ?? props["aria-label"] ?? "Value"}
              value={current()[0] ?? null}
              min={min()}
              max={max()}
              step={step()}
              unit={props.unit}
              format={props.format && !props.unit ? props.format : undefined}
              required
              disabled={props.disabled}
              steppers={false}
              onChange={(v) => v !== null && controller.setValue(fix(v))}
              onCommit={() => props.onCommit?.()}
            />
          </Show>
        </div>
        <Show when={props.help}>
          <span id={helpId} class="nc-field__help">
            {props.help}
          </span>
        </Show>
      </SliderRoot>
    </>
  )
}
