import type { JSX } from "@solidjs/web"
import {
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectLabel,
  Select as SelectRoot,
  SelectTrigger,
  SelectValue,
} from "@ui-sdk/solid/select"
import { createMemo, For, Show } from "solid-js"
import { cx } from "../lib/cx"
import { createId } from "../lib/id"
import { Icon, type IconName } from "./Icon"
import { usePresentation } from "./Menu"
import { OpenLayer } from "./Popover"

export interface SelectOption<T extends string = string> {
  /** The value this option selects. */
  value: T
  /** Visible text. */
  label: string
  /** A core icon before the label. */
  icon?: IconName
  /** One line under the label. */
  description?: string
  /** Greys the option out and skips it. */
  disabled?: boolean
}

export interface SelectProps<T extends string = string> {
  /** The choices. For long or changing sets such as hosts or scopes. */
  options: SelectOption<T>[]
  /** Selected value. Controlled when set. */
  value?: T
  /** Initial value when uncontrolled. */
  defaultValue?: T
  /** Called with the chosen value. */
  onChange?: (value: T) => void
  /** Label above the control. */
  label?: string
  /** Accessible name when there is no visible label. */
  "aria-label"?: string
  /** Shown while nothing is selected. */
  placeholder?: string
  /** Disables the control. */
  disabled?: boolean
  /** Mono text for IDs and paths. */
  mono?: boolean
  /** Help text below the control, in text-3. */
  help?: string
  /** An error message (danger, says how to fix it), or `true` for the error state alone. */
  error?: string | boolean
  /** The name the value submits under in a form. */
  name?: string
  /** Blocks a form's submit until a value is chosen. */
  required?: boolean
  class?: string
}

/**
 * A dropdown choice: ui-sdk's Select, a button that opens a list box. Typing on the closed trigger finds an
 * option; on a small touch screen the list is a sheet.
 */
export function Select<T extends string = string>(props: SelectProps<T>): JSX.Element {
  const id = createId("select")
  const selected = createMemo(() => props.options.find((o) => o.value === props.value))
  const message = () => (typeof props.error === "string" ? props.error : props.help)
  const invalid = () => Boolean(props.error)
  const presentation = usePresentation()
  return (
    <div data-part="select" class={cx("nc-field", props.class)}>
      <SelectRoot<T>
        value={props.value === undefined ? undefined : props.value}
        defaultValue={props.value === undefined ? props.defaultValue : undefined}
        onValueChange={(value: T | null) => {
          if (value !== null) props.onChange?.(value)
        }}
        items={props.options.map((o) => ({ value: o.value, label: o.label, disabled: o.disabled }))}
        placeholder={props.placeholder ?? "Select…"}
        disabled={props.disabled}
        required={props.required}
        name={props.name}
        presentation={presentation()}
      >
        <Show when={props.label}>
          <SelectLabel class="nc-field__label">{props.label}</SelectLabel>
        </Show>
        <SelectTrigger
          class={cx("nc-input nc-select", props.mono && "nc-mono", invalid() && "nc-input--error")}
          aria-label={props.label ? undefined : props["aria-label"]}
          aria-invalid={invalid() ? "true" : undefined}
          aria-describedby={message() ? `${id}-help` : undefined}
        >
          <span class="nc-select__value">
            <Show when={selected()?.icon}>
              <Icon name={selected()?.icon} size="sm" />
            </Show>
            <SelectValue />
          </span>
          <Icon name="chevron-down" size="sm" class="nc-select__chevron" />
        </SelectTrigger>
        <SelectContent
          sideOffset={4}
          collisionPadding={8}
          data-part="menu"
          class="nc-menu nc-select__list"
          style={{ "min-width": "var(--anchor-width)" }}
        >
          <OpenLayer />
          <For each={props.options} keyed={(option) => option.value}>
            {(option) => (
              <SelectItem
                value={option().value}
                label={option().label}
                disabled={option().disabled}
                class={cx("nc-menu__item", option().description && "nc-menu__item--rich")}
                data-value={option().value}
              >
                <Show when={option().icon}>
                  <Icon name={option().icon} size="sm" />
                </Show>
                <Show
                  when={option().description}
                  fallback={<SelectItemText class="nc-menu__text">{option().label}</SelectItemText>}
                >
                  <span class="nc-menu__text nc-menu__text--stack">
                    <SelectItemText>{option().label}</SelectItemText>
                    <span class="nc-menu__desc nc-meta">{option().description}</span>
                  </span>
                </Show>
                <SelectItemIndicator class="nc-menu__check">
                  <Icon name="check" size="sm" />
                </SelectItemIndicator>
              </SelectItem>
            )}
          </For>
        </SelectContent>
      </SelectRoot>
      <Show when={message()}>
        <span id={`${id}-help`} class={["nc-field__help", { "nc-field__help--error": invalid() }]}>
          {message()}
        </span>
      </Show>
    </div>
  )
}
