import type { JSX } from "@solidjs/web"
import { omit, Show } from "solid-js"
import { cx } from "../lib/cx"
import { createId } from "../lib/id"
import { Icon, type IconName } from "./Icon"
import { Kbd } from "./Kbd"

export interface TextFieldProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "ref"> {
  /** Label above the input. For the search variant it becomes the `aria-label`. */
  label?: string
  /** Help text below the input, in text-3. */
  help?: string
  /** An error message (danger, says how to fix it), or `true` for the error state alone. */
  error?: string | boolean
  /** `search` puts a 13px icon before the input and an optional shortcut hint after it. */
  variant?: "text" | "search"
  /** Use mono for paths, IDs, tokens and durations. */
  mono?: boolean
  /** Icon for the search variant. Default `search`. */
  icon?: IconName
  /** Shortcut hint shown after a search input, for example `Ctrl K`. */
  kbd?: string
  /** Initial value for an uncontrolled field. */
  defaultValue?: string
  /** Receives the `input` element. */
  inputRef?: (el: HTMLInputElement) => void
}

/** A single-line input, 30px high, with a label, help text and an error state, plus the search variant. */
export function TextField(props: TextFieldProps): JSX.Element {
  const rest = omit(
    props,
    "label",
    "help",
    "error",
    "variant",
    "mono",
    "icon",
    "kbd",
    "inputRef",
    "defaultValue",
    "class",
    "id",
  )
  const id = props.id ?? createId("field")
  const helpId = `${id}-help`
  const message = () => (typeof props.error === "string" ? props.error : props.help)
  const invalid = () => Boolean(props.error)
  return (
    <Show
      when={props.variant === "search"}
      fallback={
        <div data-part="text-field" class={cx("nc-field", props.class)}>
          <Show when={props.label}>
            <label class="nc-field__label" for={id}>
              {props.label}
            </label>
          </Show>
          <input
            id={id}
            ref={(el) => props.inputRef?.(el)}
            class={cx("nc-input", props.mono && "nc-mono", invalid() && "nc-input--error")}
            aria-invalid={invalid() ? "true" : undefined}
            aria-describedby={message() ? helpId : undefined}
            value={rest.value ?? props.defaultValue}
            {...rest}
          />
          <Show when={message()}>
            <span id={helpId} class={["nc-field__help", { "nc-field__help--error": invalid() }]}>
              {message()}
            </span>
          </Show>
        </div>
      }
    >
      <label data-part="text-field" data-variant="search" class={cx("nc-search", props.class)}>
        <Icon name={props.icon ?? "search"} size="sm" />
        <input
          id={id}
          type="search"
          ref={(el) => props.inputRef?.(el)}
          aria-label={props.label ?? rest["aria-label"] ?? "Search"}
          value={rest.value ?? props.defaultValue}
          {...rest}
        />
        <Show when={props.kbd}>
          <Kbd keys={props.kbd} />
        </Show>
      </label>
    </Show>
  )
}
