import { type JSX, Show, splitProps } from "solid-js"
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
  const [local, rest] = splitProps(props, [
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
  ])
  const id = local.id ?? createId("field")
  const helpId = `${id}-help`
  const message = () => (typeof local.error === "string" ? local.error : local.help)
  const invalid = () => Boolean(local.error)
  return (
    <Show
      when={local.variant === "search"}
      fallback={
        <div data-part="text-field" class={cx("nc-field", local.class)}>
          <Show when={local.label}>
            <label class="nc-field__label" for={id}>
              {local.label}
            </label>
          </Show>
          <input
            id={id}
            ref={(el) => local.inputRef?.(el)}
            class={cx("nc-input", local.mono && "nc-mono", invalid() && "nc-input--error")}
            aria-invalid={invalid() || undefined}
            aria-describedby={message() ? helpId : undefined}
            value={rest.value ?? local.defaultValue}
            {...rest}
          />
          <Show when={message()}>
            <span id={helpId} class="nc-field__help" classList={{ "nc-field__help--error": invalid() }}>
              {message()}
            </span>
          </Show>
        </div>
      }
    >
      <label data-part="text-field" data-variant="search" class={cx("nc-search", local.class)}>
        <Icon name={local.icon ?? "search"} size="sm" />
        <input
          id={id}
          type="search"
          ref={(el) => local.inputRef?.(el)}
          aria-label={local.label ?? rest["aria-label"] ?? "Search"}
          value={rest.value ?? local.defaultValue}
          {...rest}
        />
        <Show when={local.kbd}>
          <Kbd keys={local.kbd} />
        </Show>
      </label>
    </Show>
  )
}
