import type { JSX } from "@solidjs/web"
import { createEffect, createSignal, onCleanup, Show } from "solid-js"
import { caretAt } from "../lib/caret"
import { createControllable } from "../lib/controllable"
import { cx } from "../lib/cx"
import { clamp, decimalsOf, evaluateExpression, snap, tidy, type Units } from "../lib/expression"
import { createId } from "../lib/id"
import { usePhone } from "../lib/phone"
import { Icon } from "./Icon"

export interface NumberFieldProps {
  /** The value. Controlled when set (`null` is empty). */
  value?: number | null
  /** Initial value when uncontrolled. */
  defaultValue?: number | null
  /**
   * Called with each new value: a committed entry (Enter, blur), a step (arrow keys, the stepper buttons) and
   * every move of a scrub. `null` when the field was emptied.
   */
  onChange?: (value: number | null) => void
  /** Called once an interaction ends: a commit, a step, the end of a scrub. For saving. */
  onCommit?: (value: number | null) => void
  /** Label above the field. Dragging it sideways scrubs the value. */
  label?: string
  /** Accessible name when there is no visible label. */
  "aria-label"?: string
  /** Help text below the field. */
  help?: string
  /** An error from outside (a form's validation), or `true` for the state alone. */
  error?: string | boolean
  /** Bounds. Typed and stepped values are clamped to them. */
  min?: number
  max?: number
  /** The step of the arrow keys, the stepper buttons and the scrub. Default 1. */
  step?: number
  /** The step with Shift (and of Page Up and Page Down). Default ten steps. */
  largeStep?: number
  /** The step with Alt. Default a tenth of a step. */
  smallStep?: number
  /** Whole numbers only: typed values are rounded. */
  integer?: boolean
  /** Shown after the number, in text-3: `px`, `%`, `h`. */
  unit?: string
  /** Units typed values may use, converted to the field's unit (`UNITS.minutes` takes `1.5h` and `90m`). */
  units?: Units
  /** Writes the value at rest (not while editing). Default the number at the step's precision. */
  format?: (value: number) => string
  /** Empty is not allowed: an emptied field shows an error and keeps its value. */
  required?: boolean
  /** Shown while empty. */
  placeholder?: string
  /** `default`: a 30px form field. `inline`: text at rest for property lists and table cells, 28px. */
  variant?: "default" | "inline"
  /**
   * Buttons that step the value. `split`: − at the start and + at the end (a phone's default); `stacked`: up and
   * down, one over the other, at the end (the desktop's); `true` picks by device. On a phone they are on whenever
   * the field is a form field.
   */
  steppers?: boolean | "split" | "stacked"
  /** Drag to scrub: on the label, and with a mouse on the field at rest. Default on. */
  scrub?: boolean
  disabled?: boolean
  readOnly?: boolean
  id?: string
  name?: string
  class?: string
  style?: JSX.CSSProperties
  /** Receives the `input` element. */
  inputRef?: (el: HTMLInputElement) => void
}

const SCRUB_THRESHOLD = 3
const MAX_LOCKED_MOVE = 120

/**
 * A number field. Type a value or a sum (`12*4`, `(3+4)/2`, `100-15%`, `+5` from the current value, `1.5h` in a
 * field with units), evaluated on Enter or blur; input it cannot read keeps the old value and shows why. Arrow
 * keys step (Shift ten steps, Alt a tenth), Page Up and Down take ten steps; drag
 * the label sideways to scrub, with the pointer locked where the browser allows. Inline variant for property
 * lists and table cells.
 */
export function NumberField(props: NumberFieldProps): JSX.Element {
  const id = props.id ?? createId("number")
  const helpId = `${id}-help`
  const labelId = `${id}-label`
  const phone = usePhone()
  const [value, setValue] = createControllable<number | null>({
    value: () => props.value,
    defaultValue: props.defaultValue ?? null,
    onChange: (v) => props.onChange?.(v),
  })
  const [text, setText] = createSignal("")
  const [editing, setEditing] = createSignal(false)
  const [typeError, setTypeError] = createSignal<string | null>(null)
  const [scrubbing, setScrubbingSignal] = createSignal(false)
  // The scrub cursor shows everywhere while dragging, not only over the label.
  const setScrubbing = (on: boolean) => {
    setScrubbingSignal(on)
    if (on) document.documentElement.setAttribute("data-nc-scrubbing", "")
    else document.documentElement.removeAttribute("data-nc-scrubbing")
  }
  let input!: HTMLInputElement
  /** Focus came from a press on the field: the caret goes where it was pressed, nothing is selected. */
  let pointerFocus = false

  const step = () => (props.step && props.step > 0 ? props.step : 1)
  const decimals = () => Math.max(decimalsOf(step()), decimalsOf(props.smallStep ?? step() / 10) - 1, 0)
  const raw = (v: number | null) => (v === null ? "" : String(tidy(v)))
  const shown = (v: number | null) => {
    if (v === null) return ""
    if (props.format) return props.format(v)
    return String(Number(v.toFixed(Math.min(10, Math.max(decimals(), decimalsOf(v))))))
  }
  // The text follows the value while the person is not typing.
  createEffect(
    () => [value(), editing()] as const,
    ([v, e]) => {
      if (!e) setText(shown(v))
    },
  )

  const fit = (v: number): number => {
    let n = clamp(v, props.min, props.max)
    if (props.integer) n = Math.round(n)
    return tidy(n)
  }
  const emit = (v: number | null, commit: boolean) => {
    if (v !== value()) setValue(v)
    if (commit) props.onCommit?.(v)
  }

  /** Reads the typed text. Returns false when it cannot, leaving the error showing. */
  const commitText = (): boolean => {
    const t = text()
    if (t === raw(value()) || (!editing() && t === shown(value()))) {
      setTypeError(null)
      return true
    }
    const r = evaluateExpression(t, { current: value(), units: props.units })
    if (!r.ok) {
      setTypeError(r.error)
      return false
    }
    if (r.value === null && props.required) {
      setTypeError("Enter a number")
      return false
    }
    setTypeError(null)
    const next = r.value === null ? null : fit(r.value)
    emit(next, true)
    setText(editing() ? raw(next) : shown(next))
    return true
  }

  const stepBy = (delta: number) => {
    if (props.disabled || props.readOnly) return
    if (editing() && text() !== raw(value()) && !commitText()) return
    const cur = value()
    // From empty, the first step lands on the lower bound (or 0). A step adds to the value as it is, at the
    // precision of the two, so 19.9 less ten is 9.9.
    const next =
      cur === null
        ? fit(props.min ?? 0)
        : fit(Number((cur + delta).toFixed(Math.min(10, Math.max(decimalsOf(delta), decimalsOf(cur))))))
    emit(next, true)
    setTypeError(null)
    if (editing()) setText(raw(next))
  }
  const large = () => props.largeStep ?? step() * 10
  const small = () => props.smallStep ?? step() / 10
  const stepFor = (e: { shiftKey: boolean; altKey: boolean }) =>
    e.shiftKey ? large() : e.altKey ? small() : step()

  const onKeyDown = (e: KeyboardEvent) => {
    if (props.readOnly || props.disabled) return
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault()
        stepBy(stepFor(e))
        break
      case "ArrowDown":
        e.preventDefault()
        stepBy(-stepFor(e))
        break
      case "PageUp":
        e.preventDefault()
        stepBy(large())
        break
      case "PageDown":
        e.preventDefault()
        stepBy(-large())
        break
      case "Enter":
        e.preventDefault()
        if (commitText() && props.variant === "inline") input.blur()
        else if (typeError() === null) input.select()
        break
      case "Escape":
        if (text() !== raw(value()) || typeError()) {
          e.preventDefault()
          e.stopPropagation()
          setTypeError(null)
          setText(raw(value()))
          input.select()
        } else if (props.variant === "inline") input.blur()
        break
    }
  }

  // ── scrubbing ──
  let scrub: {
    id: number
    x: number
    moved: boolean
    acc: number
    start: number
    from: "label" | "input"
    target: HTMLElement
  } | null = null
  const canScrub = () => props.scrub !== false && !props.disabled && !props.readOnly
  const onScrubDown = (e: PointerEvent, from: "label" | "input") => {
    if (!canScrub() || e.button !== 0) return
    // On the field itself only a mouse scrubs, and only at rest: a tap is for typing, and once the field is
    // being edited a drag selects text.
    if (from === "input" && (e.pointerType !== "mouse" || editing())) {
      pointerFocus = true
      return
    }
    e.preventDefault()
    scrub = {
      id: e.pointerId,
      x: e.clientX,
      moved: false,
      acc: 0,
      start: value() ?? props.min ?? 0,
      from,
      target: e.currentTarget as HTMLElement,
    }
    document.addEventListener("pointermove", onScrubMove, true)
    document.addEventListener("pointerup", onScrubUp, true)
    document.addEventListener("pointercancel", onScrubUp, true)
  }
  const onScrubMove = (e: PointerEvent) => {
    if (!scrub || e.pointerId !== scrub.id) return
    const locked = document.pointerLockElement === scrub.target
    // Browsers report a jump of hundreds of pixels on the first moves after the lock takes; no hand moves that
    // far between two events, so such a move is dropped.
    if (locked && Math.abs(e.movementX) > MAX_LOCKED_MOVE) return
    const dx = locked ? e.movementX : e.clientX - scrub.x
    if (!locked) scrub.x = e.clientX
    if (!scrub.moved) {
      scrub.acc += dx
      if (Math.abs(scrub.acc) < SCRUB_THRESHOLD) return
      scrub.moved = true
      scrub.acc = 0
      setScrubbing(true)
      if (editing() && text() !== raw(value())) commitText()
      scrub.start = value() ?? props.min ?? 0
      try {
        // A promise in newer browsers; a refusal (no gesture, iframe without permission) leaves plain dragging.
        const p = (
          scrub.target as HTMLElement & { requestPointerLock(o?: unknown): unknown }
        ).requestPointerLock?.({
          unadjustedMovement: true,
        })
        if (p && typeof (p as Promise<void>).catch === "function")
          (p as Promise<void>).catch(() => {
            try {
              ;(scrub?.target as HTMLElement | undefined)?.requestPointerLock?.()
            } catch {}
          })
      } catch {}
    }
    // Pixels to value: a step per pixel; Shift ten, Alt a tenth, read on every move so they can change mid-drag.
    const unit = stepFor(e)
    scrub.acc += dx * unit
    const next = fit(snap(scrub.start + scrub.acc, unit, 0))
    if (next !== value()) emit(next, false)
    e.preventDefault()
  }
  const onScrubUp = (e: PointerEvent) => {
    if (!scrub || e.pointerId !== scrub.id) return
    const { moved, from } = scrub
    scrub = null
    document.removeEventListener("pointermove", onScrubMove, true)
    document.removeEventListener("pointerup", onScrubUp, true)
    document.removeEventListener("pointercancel", onScrubUp, true)
    if (document.pointerLockElement) document.exitPointerLock?.()
    setScrubbing(false)
    if (moved) props.onCommit?.(value())
    else if (from === "input") {
      // A click without a drag: edit, with the caret where the field was clicked.
      pointerFocus = true
      input.focus()
      const at = caretAt(input, e.clientX)
      input.setSelectionRange(at, at)
    } else {
      input.focus()
      input.select()
    }
  }
  onCleanup(() => {
    if (scrubbing()) setScrubbing(false)
    document.removeEventListener("pointermove", onScrubMove, true)
    document.removeEventListener("pointerup", onScrubUp, true)
    document.removeEventListener("pointercancel", onScrubUp, true)
  })

  const invalid = () => Boolean(typeError() || props.error)
  const message = () => typeError() ?? (typeof props.error === "string" ? props.error : props.help)
  const inline = () => props.variant === "inline"
  const steppers = () =>
    !props.readOnly && (Boolean(props.steppers) || (phone() && !inline() && props.steppers !== false))
  const stepLayout = (): "split" | "stacked" =>
    props.steppers === "split" || props.steppers === "stacked"
      ? props.steppers
      : phone()
        ? "split"
        : "stacked"
  const atMin = () => props.min !== undefined && value() !== null && value()! <= props.min
  const atMax = () => props.max !== undefined && value() !== null && value()! >= props.max

  const stepButton = (dir: 1 | -1) => (
    <button
      type="button"
      class="nc-number__step"
      data-dir={dir > 0 ? "up" : "down"}
      tabindex={-1}
      aria-label={dir > 0 ? "Increase" : "Decrease"}
      disabled={props.disabled || (dir > 0 ? atMax() : atMin())}
      onPointerDown={(e) => e.preventDefault()}
      onClick={(e) => stepBy(dir * stepFor(e))}
    >
      <Show when={stepLayout() === "split"} fallback={<Icon name="chevron-down" size="sm" />}>
        <Icon name={dir > 0 ? "plus" : "minus"} size="sm" />
      </Show>
    </button>
  )

  const field = (
    <div
      class={cx("nc-number", inline() ? "nc-number--inline" : "nc-input", invalid() && "nc-input--error")}
      data-scrubbing={scrubbing() || undefined}
      data-scrub={(canScrub() && !editing()) || undefined}
      data-steppers={steppers() ? stepLayout() : undefined}
      data-disabled={props.disabled || undefined}
      data-invalid={invalid() || undefined}
    >
      <Show when={steppers() && stepLayout() === "split"}>
        <span class="nc-number__steps nc-number__steps--start">{stepButton(-1)}</span>
      </Show>
      <input
        id={id}
        ref={(el) => {
          input = el
          props.inputRef?.(el)
        }}
        name={props.name}
        class="nc-number__input"
        type="text"
        size={1}
        style={
          inline()
            ? // Inline, the field is as wide as its text, so a unit follows the number.
              {
                width: `calc(${Math.max(1, (text() || (props.placeholder ?? "—")).length)}ch + 2px + var(--nc-inset) - 1px + ${
                  props.unit ? "var(--space-1)" : "var(--nc-inset) - 1px"
                })`,
              }
            : undefined
        }
        inputmode={
          phone() && props.min !== undefined && props.min >= 0 && !props.units ? "decimal" : undefined
        }
        autocomplete="off"
        spellcheck={false}
        role="spinbutton"
        aria-valuenow={value() ?? undefined}
        aria-valuemin={props.min}
        aria-valuemax={props.max}
        aria-valuetext={value() === null ? "Empty" : `${shown(value())}${props.unit ? ` ${props.unit}` : ""}`}
        aria-label={props.label ? undefined : props["aria-label"]}
        aria-labelledby={props.label ? labelId : undefined}
        aria-invalid={invalid() ? "true" : undefined}
        aria-describedby={message() ? helpId : undefined}
        aria-required={props.required ? "true" : undefined}
        title={inline() && typeError() ? typeError()! : undefined}
        placeholder={props.placeholder ?? (inline() ? "—" : undefined)}
        disabled={props.disabled}
        readonly={props.readOnly}
        value={text()}
        onFocus={() => {
          const byPointer = pointerFocus
          pointerFocus = false
          setEditing(true)
          setText(typeError() ? text() : raw(value()))
          // Tabbing in selects the value, to type over it; a press keeps the caret where it was put.
          if (!byPointer) queueMicrotask(() => input.select())
        }}
        onBlur={() => {
          commitText()
          setEditing(false)
          if (!typeError()) setText(shown(value()))
        }}
        onInput={(e) => {
          setText(e.currentTarget.value)
          if (typeError()) setTypeError(null)
        }}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => onScrubDown(e, "input")}
      />
      <Show when={props.unit && (!inline() || editing() || value() !== null)}>
        <span class="nc-number__unit" aria-hidden="true">
          {props.unit}
        </span>
      </Show>
      <Show when={steppers() && stepLayout() === "split"}>
        <span class="nc-number__steps nc-number__steps--end">{stepButton(1)}</span>
      </Show>
      <Show when={steppers() && stepLayout() === "stacked"}>
        <span class="nc-number__steps nc-number__steps--stacked">
          {stepButton(1)}
          {stepButton(-1)}
        </span>
      </Show>
    </div>
  )

  return (
    <Show
      when={!inline()}
      fallback={
        <div
          data-part="number-field"
          data-variant="inline"
          class={cx("nc-number-field", props.class)}
          style={props.style}
        >
          {field}
          <Show when={typeError()}>
            <span id={helpId} class="nc-visually-hidden" role="alert">
              {typeError()}
            </span>
          </Show>
        </div>
      }
    >
      <div data-part="number-field" class={cx("nc-field nc-number-field", props.class)} style={props.style}>
        <Show when={props.label}>
          <label
            id={labelId}
            class="nc-field__label nc-number__label"
            for={id}
            data-scrub={canScrub() || undefined}
            onPointerDown={(e) => onScrubDown(e, "label")}
          >
            {props.label}
          </label>
        </Show>
        {field}
        <Show when={message()}>
          <span
            id={helpId}
            class={[
              "nc-field__help",
              {
                "nc-field__help--error": invalid() && Boolean(typeError() || typeof props.error === "string"),
              },
            ]}
            role={typeError() ? "alert" : undefined}
          >
            {message()}
          </span>
        </Show>
      </div>
    </Show>
  )
}
