import type { JSX } from "@solidjs/web"
import { createEffect, createSignal, omit, Show, untrack } from "solid-js"
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
  const rest = omit(
    props,
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
  )
  // The saved value seeds the draft once; the effect below keeps it in step from then on.
  const [draft, setDraft] = createSignal(untrack(() => props.value))
  let editing = false
  // A new saved value (from another device, or after a save) replaces the draft while it is not being edited.
  createEffect(
    () => props.value,
    (v) => {
      if (!editing) setDraft(v)
    },
  )
  const commit = () => {
    const wasEditing = editing
    editing = false
    // Escape reverts, then blurs: the blur that follows must not commit the text it put back.
    if (!wasEditing) return
    const next = props.multiline ? draft().replace(/\s*\n\s*/g, " ") : draft()
    if (next !== props.value) props.onCommit(next)
  }
  const revert = (el: HTMLInputElement | HTMLTextAreaElement) => {
    // A draft write is read back only after the next flush, so the restored text goes to the field here.
    editing = false
    el.value = props.value
    setDraft(() => props.value)
    el.blur()
  }
  const handlers = {
    onFocus: (e: FocusEvent) => {
      editing = true
      if (props.selectOnFocus) (e.currentTarget as HTMLInputElement).select()
    },
    onInput: (e: InputEvent) => {
      const v = (e.currentTarget as HTMLInputElement).value
      setDraft(v)
      props.onInput?.(v)
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
  const className = () => cx("nc-inline-field", `nc-inline-field--${props.variant ?? "text"}`, props.class)
  let area: HTMLTextAreaElement | undefined
  // Grows with its text: a title that wraps is as tall as its lines.
  createEffect(draft, () =>
    queueMicrotask(() => {
      if (!area) return
      area.style.height = "auto"
      area.style.height = `${area.scrollHeight}px`
    }),
  )
  return (
    <Show
      when={props.multiline}
      fallback={
        <input
          data-part="inline-field"
          class={className()}
          aria-label={props.label}
          placeholder={props.placeholder}
          readonly={props.readOnly}
          value={draft()}
          title={draft() || undefined}
          spellcheck={props.variant === "mono" ? "false" : "true"}
          {...handlers}
          {...(rest as JSX.InputHTMLAttributes<HTMLInputElement>)}
        />
      }
    >
      <textarea
        data-part="inline-field"
        class={cx(className(), "nc-inline-field--multiline")}
        aria-label={props.label}
        placeholder={props.placeholder}
        readonly={props.readOnly}
        value={draft()}
        rows={1}
        ref={area}
        {...handlers}
        {...(rest as JSX.TextareaHTMLAttributes<HTMLTextAreaElement>)}
      />
    </Show>
  )
}
