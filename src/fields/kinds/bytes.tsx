// A piece of binary data: read as its size, and where the field is edited uploaded, replaced, cleared and
// downloaded. The content is read in the browser and handed over as bytes, so the field's limit (`maxBytes`, 1 MiB
// unless it declares one) is checked before anything is sent.

import type { JSX } from "@solidjs/web"
import { createSignal, Show } from "solid-js"
import { Button } from "../../components/Button"
import { Icon } from "../../components/Icon"
import { IconButton } from "../../components/IconButton"
import { DropdownMenu } from "../../components/Menu"
import { cx } from "../../lib/cx"
import { Empty } from "../Empty"
import { formatBytes } from "../format"
import type { EditorProps, FieldKind, ValueProps } from "../kind"
import { isEmpty } from "../spec"

/** What a `bytes` field holds when it declares no limit. */
export const DEFAULT_MAX_BYTES = 1024 * 1024

/** The content a value stands for: bytes, an array of numbers or base64 text. Null when it is none of them. */
export function bytesOf(v: unknown): Uint8Array | null {
  if (v instanceof Uint8Array) return v
  if (Array.isArray(v)) return Uint8Array.from(v as number[])
  if (typeof v === "string") {
    try {
      const raw = atob(v)
      return Uint8Array.from(raw, (c) => c.charCodeAt(0))
    } catch {
      return null
    }
  }
  return null
}

/** The size a value stands for, without decoding base64. */
function size(v: unknown): number | null {
  if (Array.isArray(v)) return v.length
  if (typeof v === "object" && v !== null && "byteLength" in v)
    return (v as { byteLength: number }).byteLength
  if (typeof v === "string") return Math.floor((v.replace(/=+$/, "").length * 3) / 4)
  return null
}

const words = (v: unknown) => (size(v) === null ? "Binary data" : formatBytes(size(v) as number))

/** Why a file cannot be put in the field, or null. */
export function tooLarge(bytes: number, max: number | undefined): string | null {
  const limit = max ?? DEFAULT_MAX_BYTES
  return bytes > limit ? `${formatBytes(bytes)} is more than this field takes (${formatBytes(limit)})` : null
}

function download(name: string, v: unknown) {
  const data = bytesOf(v)
  if (!data) return
  const url = URL.createObjectURL(new Blob([data.slice().buffer], { type: "application/octet-stream" }))
  const a = document.createElement("a")
  a.href = url
  a.download = `${name}.bin`
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Value(props: ValueProps): JSX.Element {
  return (
    <Show when={!isEmpty(props.value)} fallback={<Empty />}>
      <span class="nc-field-number">{words(props.value)}</span>
    </Show>
  )
}

function Editor(props: EditorProps): JSX.Element {
  let input!: HTMLInputElement
  const [failed, setFailed] = createSignal("")
  const [busy, setBusy] = createSignal(false)
  const has = () => !isEmpty(props.value)
  const pick = () => input.click()
  async function put(file: File | undefined) {
    if (!file) return
    const refusal = tooLarge(file.size, props.spec.maxBytes)
    if (refusal) {
      setFailed(refusal)
      input.value = ""
      return
    }
    setBusy(true)
    setFailed("")
    try {
      const content = new Uint8Array(await file.arrayBuffer())
      props.onTouch?.()
      props.onCommit(content)
    } catch (e) {
      setFailed(e instanceof Error ? e.message : "The file could not be read")
    } finally {
      setBusy(false)
      input.value = ""
    }
  }
  return (
    <span
      class={cx("nc-field-upload", props.variant === "boxed" && "nc-field-upload--boxed")}
      data-part="bytes-field"
    >
      <input
        ref={input}
        type="file"
        class="nc-visually-hidden"
        tabindex="-1"
        aria-label={`${props.spec.title}, choose a file`}
        disabled={props.disabled || busy()}
        onChange={(e) => void put(e.currentTarget.files?.[0])}
      />
      <Show
        when={has()}
        fallback={
          <Show when={!props.disabled} fallback={<Empty />}>
            <Button
              size="sm"
              variant="secondary"
              icon="upload"
              loading={busy()}
              aria-invalid={props.error ? "true" : undefined}
              data-action="upload"
              onClick={pick}
            >
              Upload
            </Button>
          </Show>
        }
      >
        <span class="nc-field-file" data-part="bytes-chip">
          <Icon name="file" size="sm" />
          <span class="nc-field-number">{words(props.value)}</span>
        </span>
        <IconButton
          label={`${props.spec.title}, download`}
          icon="download"
          data-action="download"
          onClick={() => download(props.spec.name, props.value)}
        />
        <Show when={!props.disabled}>
          <DropdownMenu
            label={`${props.spec.title}, content`}
            placement="bottom-end"
            items={[
              { id: "replace", label: "Replace…", icon: "upload" as const },
              ...(props.spec.required
                ? []
                : [{ id: "clear", label: "Clear", icon: "trash" as const, danger: true }]),
            ]}
            onSelect={(a) => (a === "replace" ? pick() : props.onCommit(null))}
            trigger={(t) => <IconButton {...t} label={`${props.spec.title}, content actions`} icon="more" />}
          />
        </Show>
      </Show>
      <Show when={failed()}>
        {(m) => (
          <span class="nc-fieldrow__message nc-fieldrow__message--error" role="alert">
            {m()}
          </span>
        )}
      </Show>
    </span>
  )
}

export const bytes: FieldKind = {
  text: (_s, v) => (isEmpty(v) ? "" : words(v)),
  Value,
  Editor,
}
