import { createMemo, createSignal, For, Index, type JSX, Show } from "solid-js"
import { createControllable } from "../lib/controllable"
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
  const min = () => props.min ?? 0
  const [value, setValue] = createControllable<number>({
    value: () => props.value,
    defaultValue: props.defaultValue ?? props.min ?? 0,
    onChange: (v) => props.onChange?.(v),
  })
  return (
    <SliderCore
      {...props}
      values={[value()]}
      set={(_, v) => setValue(v)}
      fillFrom={() => min()}
      thumbLabel={() => undefined}
      field={props.field}
      fieldValue={value()}
      onField={(v) => setValue(v)}
    />
  )
}

/** A slider with two thumbs for a range. The thumbs cannot pass each other (nor come closer than `minDistance`). */
export function RangeSlider(props: RangeSliderProps): JSX.Element {
  const [value, setValue] = createControllable<[number, number]>({
    value: () => props.value,
    defaultValue: props.defaultValue ?? [props.min ?? 0, props.max ?? 100],
    onChange: (v) => props.onChange?.(v),
  })
  const gap = () => props.minDistance ?? 0
  return (
    <SliderCore
      {...props}
      field={false}
      values={value()}
      set={(i, v) => {
        const [a, b] = value()
        if (i === 0) setValue([Math.min(v, b - gap()), b])
        else setValue([a, Math.max(v, a + gap())])
      }}
      thumbLabel={(i) => props.thumbLabels?.[i] ?? (i === 0 ? "Minimum" : "Maximum")}
    />
  )
}

interface CoreProps extends SliderCommonProps {
  values: number[]
  set: (index: number, value: number) => void
  /** Single slider: the fill runs from here to the thumb. */
  fillFrom?: () => number
  thumbLabel: (index: number) => string | undefined
  fieldValue?: number
  onField?: (v: number) => void
}

function SliderCore(props: CoreProps): JSX.Element {
  const id = props.id ?? createId("slider")
  const labelId = `${id}-label`
  const helpId = `${id}-help`
  const min = () => props.min ?? 0
  const max = () => ((props.max ?? 100) > min() ? (props.max ?? 100) : min() + 1)
  const step = () => (props.step && props.step > 0 ? props.step : 1)
  const large = () => props.largeStep ?? Math.max(step(), snap((max() - min()) / 10, step()))
  const vertical = () => props.orientation === "vertical"
  const [active, setActive] = createSignal<number | null>(null)
  const thumbs: HTMLDivElement[] = []
  let track!: HTMLDivElement

  const fix = (v: number) => {
    const d = Math.max(decimalsOf(step()), decimalsOf(min()))
    return Number(clamp(snap(v, step(), min()), min(), max()).toFixed(d))
  }
  const pct = (v: number) => ((clamp(v, min(), max()) - min()) / (max() - min())) * 100
  const text = (v: number) => (props.format ? props.format(v) : `${v}${props.unit ? ` ${props.unit}` : ""}`)
  const readout = () => props.values.map(text).join(" – ")
  const showValue = () => props.showValue ?? (Boolean(props.label) && !props.field)

  const move = (i: number, v: number) => {
    const next = fix(v)
    if (next !== props.values[i]) props.set(i, next)
  }

  const onKeyDown = (e: KeyboardEvent, i: number) => {
    if (props.disabled) return
    const v = props.values[i]!
    const s = e.shiftKey ? large() : step()
    let next: number | null = null
    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = v + s
        break
      case "ArrowLeft":
      case "ArrowDown":
        next = v - s
        break
      case "PageUp":
        next = v + large()
        break
      case "PageDown":
        next = v - large()
        break
      case "Home":
        next = min()
        break
      case "End":
        next = max()
        break
    }
    if (next === null) return
    e.preventDefault()
    move(i, next)
    props.onCommit?.()
  }

  // ── pointer ──
  const valueAt = (e: PointerEvent) => {
    const r = track.getBoundingClientRect()
    const f = vertical() ? (r.bottom - e.clientY) / (r.height || 1) : (e.clientX - r.left) / (r.width || 1)
    return min() + clamp(f, 0, 1) * (max() - min())
  }
  let drag: { id: number; index: number } | null = null
  const onPointerDown = (e: PointerEvent) => {
    if (props.disabled || (e.pointerType === "mouse" && e.button !== 0)) return
    const v = valueAt(e)
    // The nearest thumb; between two at one spot, the one on the side pressed.
    let index = 0
    if (props.values.length > 1) {
      const [a, b] = props.values as [number, number]
      index = Math.abs(v - a) < Math.abs(v - b) || (a === b && v < a) ? 0 : 1
    }
    drag = { id: e.pointerId, index }
    setActive(index)
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {}
    move(index, v)
    // Focus the thumb so the keys continue from here, without the page scrolling to it.
    thumbs[index]?.focus({ preventScroll: true })
    e.preventDefault()
  }
  const onPointerMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return
    move(drag.index, valueAt(e))
  }
  const onPointerUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return
    drag = null
    setActive(null)
    props.onCommit?.()
  }

  const tickValues = createMemo(() => {
    if (!props.ticks) return []
    const every = typeof props.ticks === "number" ? props.ticks : 1
    const d = step() * every
    const count = Math.floor((max() - min()) / d + 1e-9)
    if (count > 200) return []
    return Array.from({ length: count + 1 }, (_, i) => fix(min() + i * d))
  })
  const fill = () => {
    if (props.values.length > 1) {
      const [a, b] = props.values as [number, number]
      return [pct(a), pct(b)] as const
    }
    const from = pct(props.fillFrom?.() ?? min())
    const to = pct(props.values[0]!)
    return [Math.min(from, to), Math.max(from, to)] as const
  }
  const inFill = (v: number) => {
    const [a, b] = fill()
    const p = pct(v)
    return p >= a - 1e-9 && p <= b + 1e-9
  }
  const pos = (p: number): JSX.CSSProperties => (vertical() ? { bottom: `${p}%` } : { left: `${p}%` })

  return (
    <div
      data-part="slider"
      data-orientation={vertical() ? "vertical" : "horizontal"}
      data-disabled={props.disabled || undefined}
      class={cx("nc-field nc-slider-field", props.class)}
      role={props.values.length > 1 ? "group" : undefined}
      aria-labelledby={props.values.length > 1 && props.label ? labelId : undefined}
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
              {readout()}
            </span>
          </Show>
        </div>
      </Show>
      <div class="nc-slider__row">
        <div class="nc-slider__body">
          <div
            class="nc-slider"
            ref={track}
            data-dragging={active() !== null || undefined}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div class="nc-slider__track">
              <div
                class="nc-slider__fill"
                style={
                  vertical()
                    ? { bottom: `${fill()[0]}%`, height: `${fill()[1] - fill()[0]}%` }
                    : { left: `${fill()[0]}%`, width: `${fill()[1] - fill()[0]}%` }
                }
              />
            </div>
            <For each={tickValues()}>
              {(t) => <span class="nc-slider__tick" data-on={inFill(t) || undefined} style={pos(pct(t))} />}
            </For>
            {/* By position, not value: a thumb stays the same element (and keeps focus) as its value changes. */}
            <Index each={props.values}>
              {(v, index) => {
                const i = () => index
                return (
                  <div
                    ref={(el) => (thumbs[i()] = el)}
                    role="slider"
                    tabIndex={props.disabled ? -1 : 0}
                    class="nc-slider__thumb"
                    data-active={active() === i() || undefined}
                    style={pos(pct(v()))}
                    aria-valuemin={i() === 1 ? props.values[0] : min()}
                    aria-valuemax={i() === 0 && props.values.length > 1 ? props.values[1] : max()}
                    aria-valuenow={v()}
                    aria-valuetext={text(v())}
                    aria-orientation={vertical() ? "vertical" : "horizontal"}
                    aria-disabled={props.disabled || undefined}
                    aria-label={
                      props.thumbLabel(i())
                        ? props.label
                          ? `${props.label}, ${props.thumbLabel(i())!.toLowerCase()}`
                          : props.thumbLabel(i())
                        : props.label
                          ? undefined
                          : props["aria-label"]
                    }
                    aria-labelledby={!props.thumbLabel(i()) && props.label ? labelId : undefined}
                    aria-describedby={props.help ? helpId : undefined}
                    onKeyDown={(e) => onKeyDown(e, i())}
                  />
                )
              }}
            </Index>
          </div>
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
            value={props.fieldValue ?? null}
            min={min()}
            max={max()}
            step={step()}
            unit={props.unit}
            format={props.format && !props.unit ? props.format : undefined}
            required
            disabled={props.disabled}
            steppers={false}
            onChange={(v) => v !== null && props.onField?.(v)}
            onCommit={() => props.onCommit?.()}
          />
        </Show>
      </div>
      <Show when={props.help}>
        <span id={helpId} class="nc-field__help">
          {props.help}
        </span>
      </Show>
    </div>
  )
}
