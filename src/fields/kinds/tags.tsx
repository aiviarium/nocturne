// A list of short strings (tags, origins): chips when read, a list of fields, one per row, when edited.

import type { JSX } from "@solidjs/web"
import { For, Show } from "solid-js"
import { Badge } from "../../components/Badge"
import { DataList } from "../../components/DataList"
import { Empty } from "../Empty"
import type { EditorProps, FieldKind, ValueProps } from "../kind"
import { isEmpty } from "../spec"

const items = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : [])

function Value(props: ValueProps): JSX.Element {
  const shown = () => (props.compact ? items(props.value).slice(0, 3) : items(props.value))
  return (
    <Show when={items(props.value).length > 0} fallback={<Empty />}>
      <span class="nc-field-refs">
        <For each={shown()}>{(t) => <Badge square>{t}</Badge>}</For>
        <Show when={items(props.value).length > shown().length}>
          <span class="nc-meta">+{items(props.value).length - shown().length}</span>
        </Show>
      </span>
    </Show>
  )
}

function Editor(props: EditorProps): JSX.Element {
  const label = () => props.spec.title.toLowerCase()
  return (
    <DataList
      label={props.spec.title}
      value={items(props.value)}
      onChange={(next) => props.onCommit(next.length ? next : null)}
      itemLabel={(_, i) => `${props.spec.title} ${i + 1}`}
      addLabel={`Add ${label()}`}
      invalid={() => (props.error ? props.error : undefined)}
    />
  )
}

export const tags: FieldKind = {
  text: (_s, v) => (isEmpty(v) ? "" : items(v).join(", ")),
  Value,
  Editor,
}
