import { createEffect, createSignal, type JSX, on, Show, splitProps } from "solid-js"
import { cx } from "../lib/cx"

export interface InlineFieldProps
  extends Omit<JSX.HTMLAttributes<HTMLElement>, "onInput" | "onChange" | "children" | "title"> {
  /** The saved value. */
  value: string
  /** Called with the new value when the edit is committed (Enter, or leaving the field) and it changed. */
  onCommit: (value: string) => void
  /** Called on every keystroke, for a live preview. */
  onInput?: (value: string) => void
  /** Accessible name: what is edited ("Title", "Estimate"). */
  label: string
  /** Shown in text-3 while empty. */
  placeholder?: string
  /**
   * `title`: a page or issue title at the title size. `text` (default): body text, a property value in a
   * `PropertyList` row. `mono`: an ID, path or duration.
   */
  variant?: "title" | "text" | "mono"
  /** Wraps onto more lines (a title that is long); Enter still commits, Shift+Enter is a new line where allowed. */
  multiline?: boolean
  /** Read only: looks the same, takes no edits. */
  readOnly?: boolean
  /** Select the text when the field takes focus. */
  selectOnFocus?: boolean
}

/**
 * Text that is edited where it is shown: a page title, an issue's estimate, a property value. At rest it reads
 * as text; hover shows a bg-3 fill so it is discoverable, and keyboard or pointer focus shows the field's edge
 * and the focus ring. Enter commits, Escape puts the saved value back, and leaving the field commits. It is a
 * real `input` (or `textarea` with `multiline`) with a label.
 */
export function InlineField(props: InlineFieldProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "value",
    "onCommit",
    "onInput",
    "label",
    "placeholder",
    "variant",
    "multiline",
    "readOnly",
    "selectOnFocus",
    "class",
  ])
  const [draft, setDraft] = createSignal(local.value)
  let editing = false
  // A new saved value (from another device, or after a save) replaces the draft while it is not being edited.
  createEffect(
    on(
      () => local.value,
      (v) => {
        if (!editing) setDraft(v)
      },
    ),
  )
  const commit = () => {
    editing = false
    const next = local.multiline ? draft().replace(/\s*\n\s*/g, " ") : draft()
    if (next !== local.value) local.onCommit(next)
  }
  const revert = (el: HTMLInputElement | HTMLTextAreaElement) => {
    editing = false
    setDraft(local.value)
    el.value = local.value
    el.blur()
  }
  const handlers = {
    onFocus: (e: FocusEvent) => {
      editing = true
      if (local.selectOnFocus) (e.currentTarget as HTMLInputElement).select()
    },
    onInput: (e: InputEvent) => {
      const v = (e.currentTarget as HTMLInputElement).value
      setDraft(v)
      local.onInput?.(v)
    },
    onBlur: () => commit(),
    onKeyDown: (e: KeyboardEvent) => {
      const el = e.currentTarget as HTMLInputElement
      if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
        revert(el)
      } else if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        e.preventDefault()
        el.blur()
      }
    },
  }
  const className = () => cx("nc-inline-field", `nc-inline-field--${local.variant ?? "text"}`, local.class)
  return (
    <Show
      when={local.multiline}
      fallback={
        <input
          data-part="inline-field"
          class={className()}
          aria-label={local.label}
          placeholder={local.placeholder}
          readOnly={local.readOnly}
          value={draft()}
          title={draft() || undefined}
          spellcheck={local.variant !== "mono"}
          {...handlers}
          {...(rest as JSX.InputHTMLAttributes<HTMLInputElement>)}
        />
      }
    >
      <textarea
        data-part="inline-field"
        class={cx(className(), "nc-inline-field--multiline")}
        aria-label={local.label}
        placeholder={local.placeholder}
        readOnly={local.readOnly}
        value={draft()}
        rows={1}
        ref={(el) => {
          // Grows with its text: a title that wraps is as tall as its lines.
          const fit = () => {
            el.style.height = "auto"
            el.style.height = `${el.scrollHeight}px`
          }
          createEffect(on(draft, () => queueMicrotask(fit)))
        }}
        {...handlers}
        {...(rest as JSX.TextareaHTMLAttributes<HTMLTextAreaElement>)}
      />
    </Show>
  )
}
