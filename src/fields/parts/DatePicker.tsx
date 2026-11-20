// The control a day or an instant is picked with: at rest it reads like the table does ("Dec 1, 2026") in the
// person's locale, and it opens a calendar, with a time of day where the field is an instant.

import type { JSX } from "@solidjs/web"
import { createSignal, Show } from "solid-js"
import { Button } from "../../components/Button"
import { Icon } from "../../components/Icon"
import { aria } from "../../lib/aria"
import { cx } from "../../lib/cx"
import { Empty } from "../Empty"
import { formatDate, joinInstant, splitInstant } from "../format"
import { Calendar, dayOf } from "./Calendar"
import { PickerSurface } from "./PickerSurface"

export interface DatePickerProps {
  /** `YYYY-MM-DD`, or an RFC 3339 instant with `time`. */
  value: string | null
  onChange(value: string | null): void
  label: string
  /** An instant: a time of day goes with the day. */
  time?: boolean | undefined
  required?: boolean | undefined
  disabled?: boolean | undefined
  invalid?: boolean | undefined
  variant?: "inline" | "boxed" | undefined
  autofocus?: boolean | undefined
}

export function DatePicker(props: DatePickerProps): JSX.Element {
  const [open, setOpen] = createSignal(false)
  const [anchor, setAnchor] = createSignal<HTMLElement>()
  const parts = () => (props.time ? splitInstant(props.value ?? "") : { day: props.value ?? "", time: "" })
  const set = (day: string, time: string) => props.onChange(props.time ? joinInstant(day, time) : day || null)
  const close = () => {
    setOpen(false)
    queueMicrotask(() => anchor()?.focus())
  }
  return (
    <>
      <button
        ref={(el) => {
          setAnchor(el)
          if (props.autofocus) queueMicrotask(() => el.focus())
        }}
        type="button"
        class={cx(
          "nc-field-pick",
          props.variant === "boxed" ? "nc-input nc-select" : "nc-field-pick--inline",
        )}
        aria-label={props.label}
        aria-haspopup="dialog"
        aria-expanded={aria(open())}
        aria-invalid={props.invalid ? "true" : undefined}
        disabled={props.disabled}
        data-part="date-picker"
        onClick={() => setOpen(!open())}
      >
        <Show when={props.value} fallback={<Empty />}>
          {(v) => <span>{formatDate(v(), !!props.time)}</span>}
        </Show>
        <Show when={props.variant === "boxed"}>
          <Icon name="calendar" size="sm" class="nc-select__chevron" />
        </Show>
      </button>
      <PickerSurface open={open()} anchor={anchor()} onClose={close} label={props.label} class="nc-field-pop">
        <div class="nc-field-pop__body" role="dialog" aria-label={props.label}>
          <Calendar
            value={parts().day || null}
            autofocus
            onPick={(day) => {
              set(day, parts().time)
              if (!props.time) close()
            }}
          />
          <Show when={props.time}>
            <input
              type="time"
              class="nc-input nc-field-time"
              aria-label={`${props.label}, time`}
              value={parts().time}
              onChange={(e) => parts().day && set(parts().day, e.currentTarget.value)}
              onKeyDown={(e) => e.key === "Enter" && close()}
            />
          </Show>
          <div class="nc-field-pop__foot">
            <Button size="sm" variant="ghost" onClick={() => set(dayOf(new Date()), parts().time || "09:00")}>
              Today
            </Button>
            <Show when={!props.required && props.value}>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  props.onChange(null)
                  close()
                }}
              >
                Clear
              </Button>
            </Show>
            <Show when={props.time}>
              <Button size="sm" variant="secondary" onClick={close}>
                Done
              </Button>
            </Show>
          </div>
        </div>
      </PickerSurface>
    </>
  )
}
