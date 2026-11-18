import { createMemo, createSignal, type JSX, Show } from "solid-js"
import { createControllable } from "../lib/controllable"
import { cx } from "../lib/cx"
import { createId } from "../lib/id"
import { usePhone } from "../lib/phone"
import { Icon, type IconName } from "./Icon"
import { Menu, type MenuItemEntry } from "./Menu"
import { Popover } from "./Popover"
import { Sheet } from "./Sheet"

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
  class?: string
}

/** A dropdown choice. A real button with `aria-haspopup="listbox"`; the list is a Menu of radio items. */
export function Select<T extends string = string>(props: SelectProps<T>): JSX.Element {
  const id = createId("select")
  const [open, setOpen] = createSignal(false)
  const [trigger, setTrigger] = createSignal<HTMLButtonElement>()
  const [value, setValue] = createControllable<T | undefined>({
    value: () => props.value,
    defaultValue: props.defaultValue,
    onChange: (v) => v !== undefined && props.onChange?.(v),
  })
  const selected = createMemo(() => props.options.find((o) => o.value === value()))
  const items = createMemo<MenuItemEntry[]>(() =>
    props.options.map((o) => ({
      id: o.value,
      label: o.label,
      icon: o.icon,
      description: o.description,
      disabled: o.disabled,
      checked: o.value === value(),
    })),
  )
  const close = () => {
    setOpen(false)
    queueMicrotask(() => trigger()?.focus())
  }
  const phone = usePhone()
  const message = () => (typeof props.error === "string" ? props.error : props.help)
  const invalid = () => Boolean(props.error)
  const menu = () => (
    <Menu
      label={props.label ?? props["aria-label"] ?? "Options"}
      items={items()}
      radio
      onRequestClose={close}
      onSelect={(v) => {
        setValue(v as T)
        close()
      }}
    />
  )
  return (
    <div data-part="select" class={cx("nc-field", props.class)}>
      <Show when={props.label}>
        <label class="nc-field__label" for={id}>
          {props.label}
        </label>
      </Show>
      <button
        id={id}
        ref={setTrigger}
        type="button"
        class={cx("nc-input nc-select", props.mono && "nc-mono", invalid() && "nc-input--error")}
        aria-haspopup="listbox"
        aria-expanded={open()}
        aria-label={props["aria-label"]}
        aria-invalid={invalid() || undefined}
        aria-describedby={message() ? `${id}-help` : undefined}
        disabled={props.disabled}
        onClick={() => setOpen(!open())}
        onKeyDown={(e) => {
          if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !open()) {
            e.preventDefault()
            setOpen(true)
          }
        }}
      >
        <span class="nc-select__value" classList={{ "nc-select__value--placeholder": !selected() }}>
          <Show when={selected()?.icon}>
            <Icon name={selected()?.icon} size="sm" />
          </Show>
          {selected()?.label ?? props.placeholder ?? "Select…"}
        </span>
        <Icon name="chevron-down" size="sm" class="nc-select__chevron" />
      </button>
      <Show when={message()}>
        <span id={`${id}-help`} class="nc-field__help" classList={{ "nc-field__help--error": invalid() }}>
          {message()}
        </span>
      </Show>
      <Show
        when={phone()}
        fallback={
          <Popover open={open()} anchor={trigger()} matchWidth onClose={close}>
            {menu()}
          </Popover>
        }
      >
        {/* A picker on a phone is a sheet. */}
        <Sheet
          open={open()}
          title={props.label ?? props["aria-label"]}
          detents={["fit"]}
          flush
          onClose={close}
        >
          {menu()}
        </Sheet>
      </Show>
    </div>
  )
}
