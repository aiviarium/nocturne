// Longer text: it grows with its text, commits when it is left and Escape puts it back.

import type { JSX } from "@solidjs/web"
import { Match, Switch } from "solid-js"
import { cx } from "../../lib/cx"
import { Empty } from "../Empty"
import type { EditorProps, FieldKind, ValueProps } from "../kind"
import { isEmpty } from "../spec"
import { text as textKind } from "./text"

function Value(props: ValueProps): JSX.Element {
  return (
    <Switch>
      <Match when={isEmpty(props.value)}>
        <Empty />
      </Match>
      <Match when={true}>
        <span class={cx("nc-field-long", props.compact && "nc-field-long--compact")}>
          {String(props.value)}
        </span>
      </Match>
    </Switch>
  )
}

function Editor(props: EditorProps): JSX.Element {
  let el: HTMLTextAreaElement | undefined
  const text = () => (typeof props.value === "string" ? props.value : "")
  const fit = () => {
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight + 2}px`
  }
  const commit = (v: string) => props.onCommit(v === "" ? null : v)
  const boxed = () => props.variant === "boxed"
  return (
    <textarea
      ref={(e) => {
        el = e
        queueMicrotask(fit)
      }}
      class={cx(
        boxed() ? "nc-input nc-textarea" : "nc-inline-field nc-inline-field--multiline",
        "nc-field-longinput",
        props.error && boxed() && "nc-input--error",
      )}
      aria-label={props.spec.title}
      aria-invalid={props.error ? "true" : undefined}
      readonly={props.disabled}
      rows={2}
      value={text()}
      onInput={(e) => {
        fit()
        props.onTouch?.()
        if (boxed() && props.commit !== "leave") commit(e.currentTarget.value)
      }}
      onBlur={(e) => {
        if ((!boxed() || props.commit === "leave") && e.currentTarget.value !== text())
          commit(e.currentTarget.value)
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && (!boxed() || props.commit === "leave")) {
          e.stopPropagation()
          e.currentTarget.value = text()
          fit()
          e.currentTarget.blur()
        }
      }}
    />
  )
}

export const longtext: FieldKind = {
  text: textKind.text,
  Value,
  Editor,
  ...(textKind.Filter ? { Filter: textKind.Filter } : {}),
}
