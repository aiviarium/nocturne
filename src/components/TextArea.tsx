import type { JSX } from "@solidjs/web"
import { omit, Show } from "solid-js"
import { cx } from "../lib/cx"
import { createId } from "../lib/id"
import { DICTATION_KEY, DictationBar, joinDictated, useDictation } from "./Dictation"
import { Icon } from "./Icon"
import { IconButton } from "./IconButton"

export interface TextAreaProps extends Omit<JSX.TextareaHTMLAttributes<HTMLTextAreaElement>, "ref"> {
  /** Label above the input. */
  label?: string
  /** Help text below the input, in text-3. */
  help?: string
  /** An error message (danger, says how to fix it), or `true` for the error state alone. */
  error?: string | boolean
  /** Receives the `textarea` element. */
  textareaRef?: (el: HTMLTextAreaElement) => void
  /**
   * Dictation, from the `TranscriberProvider` above. On by default where one is available; the transcript
   * lands at the caret and fires `input` like typing does.
   */
  dictation?: boolean
}

/**
 * A multi-line input for writing at length, with dictation: a mic in the corner, push-to-talk (hold
 * Ctrl Shift Space), the recording strip with timer, level and live text, and the blocked state.
 */
export function TextArea(props: TextAreaProps): JSX.Element {
  const rest = omit(props, "label", "help", "error", "textareaRef", "dictation", "class", "id", "onKeyDown")
  const id = props.id ?? createId("textarea")
  const helpId = `${id}-help`
  let el: HTMLTextAreaElement | undefined
  // Where the caret was when recording started: focus may move to the dictation buttons.
  let range = { start: 0, end: 0 }
  const remember = () => {
    if (el) range = { start: el.selectionStart, end: el.selectionEnd }
  }
  const dictation = useDictation({
    enabled: () => props.dictation !== false && !rest.disabled && !rest.readonly,
    insert: (text) => {
      if (!el) return
      const v = el.value
      const start = Math.min(range.start, v.length)
      const end = Math.min(range.end, v.length)
      const piece = joinDictated(v.slice(0, start), text, v.slice(end))
      el.focus()
      el.setRangeText(piece, start, end, "end")
      const caret = start + piece.length
      el.setSelectionRange(caret, caret)
      range = { start: caret, end: caret }
      // Controlled callers hear about it the way they hear about typing; their new value must not move
      // the caret to the end.
      el.dispatchEvent(new Event("input", { bubbles: true }))
      if (el.selectionEnd !== caret) el.setSelectionRange(caret, caret)
    },
  })
  const state = () => dictation.state()
  const message = () => (typeof props.error === "string" ? props.error : props.help)
  const invalid = () => Boolean(props.error)
  const shown = () => dictation.available() || state().state !== "idle" || Boolean(state().error)
  const onKeyDown: JSX.EventHandler<HTMLTextAreaElement, KeyboardEvent> = (e) => {
    if (dictation.onKeyDown(e)) {
      remember()
      return
    }
    const h = props.onKeyDown
    if (typeof h === "function") h(e)
    else if (Array.isArray(h)) h[0](h[1], e)
  }
  return (
    <div data-part="text-area" class={cx("nc-field", props.class)} data-dictation={state().state}>
      <Show when={props.label}>
        <label class="nc-field__label" for={id}>
          {props.label}
        </label>
      </Show>
      <div class={["nc-textarea", { "nc-textarea--dictation": shown() }]}>
        <textarea
          id={id}
          ref={(e) => {
            el = e
            props.textareaRef?.(e)
          }}
          class={cx("nc-input nc-textarea__input body", invalid() && "nc-input--error")}
          aria-invalid={invalid() ? "true" : undefined}
          aria-describedby={message() ? helpId : undefined}
          onKeyDown={onKeyDown}
          {...rest}
        />
        <Show when={shown()}>
          <div class="nc-textarea__tools">
            <Show
              when={state().state === "recording"}
              fallback={
                <IconButton
                  round
                  icon="mic"
                  label={state().state === "transcribing" ? "Transcribing" : "Start dictation"}
                  shortcut={DICTATION_KEY.label}
                  disabled={state().state === "transcribing"}
                  onPointerDown={remember}
                  onClick={() => {
                    remember()
                    state().onStart?.()
                  }}
                />
              }
            >
              <DictationBar dictation={state()} part="status" compact class="nc-textarea__status" />
              <IconButton round icon="close" label="Cancel dictation" onClick={() => state().onCancel?.()} />
              <button
                type="button"
                class="nc-send nc-send--accent"
                aria-label="Finish dictation"
                onClick={() => state().onFinish?.()}
              >
                <Icon name="check" />
              </button>
            </Show>
          </div>
        </Show>
      </div>
      <Show when={shown()}>
        <Show when={state().state === "transcribing"}>
          <DictationBar dictation={state()} part="status" class="nc-textarea__dictation" />
        </Show>
        <DictationBar dictation={state()} part="live" />
        <DictationBar dictation={state()} part="notice" class="nc-textarea__dictation" />
      </Show>
      <Show when={message()}>
        <span id={helpId} class={["nc-field__help", { "nc-field__help--error": invalid() }]}>
          {message()}
        </span>
      </Show>
    </div>
  )
}
