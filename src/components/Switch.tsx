import type { JSX } from "@solidjs/web"
import { CheckboxIndicator, Checkbox as CheckboxRoot } from "@ui-sdk/solid/checkbox"
import { Radio, RadioGroup as RadioGroupRoot, RadioIndicator } from "@ui-sdk/solid/radio"
import { Switch as SwitchRoot, SwitchThumb } from "@ui-sdk/solid/switch"
import { For, omit, Show } from "solid-js"
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

/** A two-state toggle for a setting that applies immediately: ui-sdk's Switch. */
export function Switch(props: SwitchProps): JSX.Element {
  const rest = omit(
    props,
    "checked",
    "defaultChecked",
    "onChange",
    "label",
    "danger",
    "class",
    "type",
    "disabled",
  )
  const control = () => (
    <SwitchRoot
      data-part="switch"
      checked={props.checked}
      defaultChecked={props.checked === undefined ? props.defaultChecked : undefined}
      onCheckedChange={(next: boolean) => props.onChange?.(next)}
      disabled={props.disabled === true || props.disabled === ""}
      class={cx("nc-switch", props.danger && "nc-switch--danger", !props.label && props.class)}
      {...(rest as Record<string, unknown>)}
    >
      <SwitchThumb class="nc-switch__thumb" />
    </SwitchRoot>
  )
  return (
    <Show when={props.label} fallback={control()}>
      <label data-part="switch-label" class={cx("nc-row nc-row--control", props.class)}>
        {control()}
        {props.label}
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

const toState = (v: boolean | "mixed" | undefined) => (v === "mixed" ? "indeterminate" : v)

/** A checkbox for a choice that is applied later: ui-sdk's Checkbox. */
export function Checkbox(props: CheckboxProps): JSX.Element {
  const rest = omit(props, "checked", "defaultChecked", "onChange", "label", "class", "type", "disabled")
  const control = () => (
    <CheckboxRoot
      data-part="checkbox"
      checked={toState(props.checked)}
      defaultChecked={props.checked === undefined ? props.defaultChecked : undefined}
      onCheckedChange={(next: boolean | "indeterminate") => props.onChange?.(next === true)}
      disabled={props.disabled === true || props.disabled === ""}
      class={cx("nc-check", !props.label && props.class)}
      {...(rest as Record<string, unknown>)}
    >
      <CheckboxIndicator
        class="nc-check__indicator"
        render={(part: Record<string, unknown>, state: { indeterminate: boolean }) => (
          <span {...part}>
            <Show when={state.indeterminate} fallback={<Icon name="check" class="nc-check__mark" />}>
              <span class="nc-check__dash" />
            </Show>
          </span>
        )}
      />
    </CheckboxRoot>
  )
  return (
    <Show when={props.label} fallback={control()}>
      <label data-part="checkbox-label" class={cx("nc-row nc-row--control", props.class)}>
        {control()}
        {props.label}
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

/** One choice of a few visible options: ui-sdk's RadioGroup. Arrow keys move the choice; only the chosen radio is
 * tabbable. */
export function RadioGroup<T extends string = string>(props: RadioGroupProps<T>): JSX.Element {
  return (
    <RadioGroupRoot<T>
      data-part="radio-group"
      aria-label={props.label}
      value={props.value}
      defaultValue={props.value === undefined ? props.defaultValue : undefined}
      onValueChange={(next: T | null) => {
        if (next !== null) props.onChange?.(next)
      }}
      loop
      class={cx("nc-row nc-radio-group", props.vertical && "nc-radio-group--vertical", props.class)}
    >
      <For each={props.options}>
        {(option) => (
          <label class="nc-row nc-row--control">
            <Radio value={option.value} disabled={option.disabled} class="nc-radio">
              <RadioIndicator class="nc-radio__dot" />
            </Radio>
            {option.label}
          </label>
        )}
      </For>
    </RadioGroupRoot>
  )
}
