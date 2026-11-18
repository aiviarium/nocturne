import { createSignal, type JSX, Show, splitProps } from "solid-js"
import { createControllable } from "../lib/controllable"
import { cx } from "../lib/cx"
import { Icon } from "./Icon"

export interface SwitchProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "role"> {
  /** On or off. Controlled when set. */
  checked?: boolean
  /** Initial value when uncontrolled. */
  defaultChecked?: boolean
  /** Called with the next value. */
  onChange?: (checked: boolean) => void
  /** Text beside the switch. Without it, give the switch an `aria-label`. */
  label?: JSX.Element
  /** Destructive toggle (such as "Force, end sessions"): danger instead of accent when on. */
  danger?: boolean
}

/** A two-state toggle for a setting that applies immediately. */
export function Switch(props: SwitchProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "checked",
    "defaultChecked",
    "onChange",
    "label",
    "danger",
    "class",
    "type",
  ])
  const [checked, setChecked] = createControllable({
    value: () => local.checked,
    defaultValue: local.defaultChecked ?? false,
    onChange: (v) => local.onChange?.(v),
  })
  const control = (
    <button
      data-part="switch"
      type="button"
      role="switch"
      aria-checked={checked()}
      class={cx("nc-switch", local.danger && "nc-switch--danger", !local.label && local.class)}
      onClick={() => setChecked(!checked())}
      {...rest}
    />
  )
  return (
    <Show when={local.label} fallback={control}>
      <label data-part="switch-label" class={cx("nc-row nc-row--control", local.class)}>
        {control}
        {local.label}
      </label>
    </Show>
  )
}

export interface CheckboxProps
  extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "role"> {
  /** Checked, unchecked, or `"mixed"` for a partial select-all. Controlled when set. */
  checked?: boolean | "mixed"
  /** Initial value when uncontrolled. */
  defaultChecked?: boolean
  /** Called with the next value. A mixed box becomes checked. */
  onChange?: (checked: boolean) => void
  /** Text beside the box. Without it, give the box an `aria-label`. */
  label?: JSX.Element
}

/** A checkbox for a choice that is applied later. */
export function Checkbox(props: CheckboxProps): JSX.Element {
  const [local, rest] = splitProps(props, ["checked", "defaultChecked", "onChange", "label", "class", "type"])
  const [state, setState] = createSignal<boolean | "mixed">(local.defaultChecked ?? false)
  const value = () => (local.checked === undefined ? state() : local.checked)
  const toggle = () => {
    const next = value() === "mixed" ? true : !value()
    if (local.checked === undefined) setState(next)
    local.onChange?.(next)
  }
  const control = (
    <button
      data-part="checkbox"
      type="button"
      role="checkbox"
      aria-checked={value()}
      class={cx("nc-check", !local.label && local.class)}
      onClick={toggle}
      {...rest}
    >
      <Show when={value() === true}>
        <Icon name="check" class="nc-check__mark" />
      </Show>
      <Show when={value() === "mixed"}>
        <span class="nc-check__dash" />
      </Show>
    </button>
  )
  return (
    <Show when={local.label} fallback={control}>
      <label data-part="checkbox-label" class={cx("nc-row nc-row--control", local.class)}>
        {control}
        {local.label}
      </label>
    </Show>
  )
}

export interface RadioOption<T extends string = string> {
  /** The value this option selects. */
  value: T
  /** Visible label. */
  label: JSX.Element
  /** Greys the option out. */
  disabled?: boolean
}

export interface RadioGroupProps<T extends string = string> {
  /** The visible options. For three or four short options, a segmented control may fit better. */
  options: RadioOption<T>[]
  /** Selected value. Controlled when set. */
  value?: T
  /** Initial value when uncontrolled. */
  defaultValue?: T
  /** Called with the chosen value. */
  onChange?: (value: T) => void
  /** Accessible name of the group. */
  label: string
  /** Lay options out in a column instead of a row. */
  vertical?: boolean
  class?: string
}

/** One choice of a few visible options. Arrow keys move the choice; only the chosen radio is tabbable. */
export function RadioGroup<T extends string = string>(props: RadioGroupProps<T>): JSX.Element {
  const [value, setValue] = createControllable<T | undefined>({
    value: () => props.value,
    defaultValue: props.defaultValue,
    onChange: (v) => v !== undefined && props.onChange?.(v),
  })
  const buttons: HTMLButtonElement[] = []
  const enabled = () => props.options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0)
  const move = (from: number, dir: 1 | -1) => {
    const list = enabled()
    const at = list.indexOf(from)
    const next = list[(at + dir + list.length) % list.length] as number
    setValue((props.options[next] as RadioOption<T>).value)
    buttons[next]?.focus()
  }
  const tabbable = (i: number) => {
    const current = props.options.findIndex((o) => o.value === value())
    return current >= 0 ? current === i : i === enabled()[0]
  }
  return (
    <div
      data-part="radio-group"
      role="radiogroup"
      aria-label={props.label}
      class={cx("nc-row nc-radio-group", props.vertical && "nc-radio-group--vertical", props.class)}
    >
      {props.options.map((option, i) => (
        <label class="nc-row nc-row--control">
          <button
            ref={(el) => {
              buttons[i] = el
            }}
            type="button"
            role="radio"
            class="nc-radio"
            aria-checked={value() === option.value}
            disabled={option.disabled}
            tabindex={tabbable(i) ? 0 : -1}
            onClick={() => setValue(option.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault()
                move(i, 1)
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault()
                move(i, -1)
              }
            }}
          />
          {option.label}
        </label>
      ))}
    </div>
  )
}
