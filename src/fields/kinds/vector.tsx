// An embedding: read as its number of dimensions, with a copy of the numbers where the field is shown on its own.
// A vector is written by code (the model that makes it), so the control never edits it.

import type { JSX } from "@solidjs/web"
import { createSignal, Show } from "solid-js"
import { IconButton } from "../../components/IconButton"
import { Empty } from "../Empty"
import type { EditorProps, FieldKind, ValueProps } from "../kind"
import { isEmpty } from "../spec"

/** The numbers a value stands for: an array or a typed array. Null when it is none. */
export function numbersOf(v: unknown): number[] | null {
  if (Array.isArray(v)) return v as number[]
  if (ArrayBuffer.isView(v) && !(v instanceof DataView)) return Array.from(v as unknown as ArrayLike<number>)
  return null
}

const dims = (v: unknown) => {
  const n = numbersOf(v)
  return n ? `${n.length} dimensions` : "Vector"
}

function Value(props: ValueProps): JSX.Element {
  return (
    <Show when={!isEmpty(props.value)} fallback={<Empty />}>
      <span class="nc-field-number">{dims(props.value)}</span>
    </Show>
  )
}

function Editor(props: EditorProps): JSX.Element {
  const [copied, setCopied] = createSignal(false)
  const copy = async () => {
    const n = numbersOf(props.value)
    if (!n) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(n))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }
  return (
    <span class="nc-field-upload" data-part="vector-field">
      <Value spec={props.spec} value={props.value} />
      <Show when={!isEmpty(props.value)}>
        <IconButton
          label={copied() ? `${props.spec.title}, copied` : `${props.spec.title}, copy the numbers`}
          icon={copied() ? "check" : "copy"}
          data-action="copy"
          onClick={() => void copy()}
        />
      </Show>
    </span>
  )
}

export const vector: FieldKind = {
  text: (_s, v) => (isEmpty(v) ? "" : dims(v)),
  Value,
  Editor,
}
