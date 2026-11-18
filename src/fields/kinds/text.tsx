// Text, paths and the `url` and `email` formats: a line of words.
import { type JSX, Match, Switch } from "solid-js"
import { InlineField } from "../../components/InlineField"
import { TextField } from "../../components/TextField"
import { Empty } from "../Empty"
import type { EditorProps, FieldKind, FilterProps, ValueProps } from "../kind"
import { isEmpty } from "../spec"

function Value(props: ValueProps): JSX.Element {
  const text = () => String(props.value ?? "")
  return (
    <Switch fallback={<span class={props.spec.mono ? "nc-field-mono" : undefined}>{text()}</span>}>
      <Match when={isEmpty(props.value)}>
        <Empty />
      </Match>
      <Match when={props.spec.format === "url"}>
        <a href={text()} target="_blank" rel="noreferrer noopener" class="nc-field-link">
          {text()}
        </a>
      </Match>
      <Match when={props.spec.format === "email"}>
        <a href={`mailto:${text()}`} class="nc-field-link">
          {text()}
        </a>
      </Match>
    </Switch>
  )
}

function Editor(props: EditorProps): JSX.Element {
  const text = () => (typeof props.value === "string" ? props.value : "")
  const commit = (v: string) => props.onCommit(v === "" ? null : v)
  return (
    <Switch>
      <Match when={props.variant === "boxed"}>
        <TextField
          aria-label={props.spec.title}
          mono={props.spec.mono}
          value={text()}
          placeholder={props.spec.placeholder}
          disabled={props.disabled}
          error={props.error ? true : undefined}
          autofocus={props.autofocus}
          onInput={(e) => {
            props.onTouch?.()
            if (props.commit !== "leave") commit(e.currentTarget.value)
          }}
          onChange={(e) => props.commit === "leave" && commit(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (props.commit === "leave" && e.key === "Enter") {
              e.preventDefault()
              e.currentTarget.blur()
            }
          }}
        />
      </Match>
      <Match when={true}>
        <InlineField
          label={props.spec.title}
          value={text()}
          readOnly={props.disabled}
          variant={props.title ? "title" : props.spec.mono ? "mono" : "text"}
          aria-invalid={props.error ? true : undefined}
          onInput={() => props.onTouch?.()}
          onCommit={commit}
        />
      </Match>
    </Switch>
  )
}

function Filter(props: FilterProps): JSX.Element {
  return (
    <TextField
      aria-label={props.label}
      placeholder="Text"
      value={typeof props.value === "string" ? props.value : ""}
      autofocus={props.autofocus}
      onInput={(e) => props.onChange(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          props.onDone?.()
        }
      }}
    />
  )
}

export const text: FieldKind = {
  text: (_s, v) => (isEmpty(v) ? "" : String(v)),
  Value,
  Editor,
  Filter,
}
