// A file kept in the blob store: read as a file chip (its name and size once the app knows them), put, replaced and
// taken out where the field is edited. The app uploads (`configureFields({ uploadBlob })`): the field holds the
// blob's id.

import type { JSX } from "@solidjs/web"
import { createSignal, Show } from "solid-js"
import { Button } from "../../components/Button"
import { Icon } from "../../components/Icon"
import { IconButton } from "../../components/IconButton"
import { DropdownMenu } from "../../components/Menu"
import { cx } from "../../lib/cx"
import { createLoaded } from "../../lib/resource"
import { Empty } from "../Empty"
import { formatBytes } from "../format"
import type { EditorProps, FieldKind, ValueProps } from "../kind"
import { fieldRuntime } from "../runtime"
import { isEmpty } from "../spec"

/** The id the field holds, or empty. */
const idOf = (v: unknown) => (typeof v === "string" && v ? v : "")

function useMeta(id: () => string) {
  const meta = createLoaded(id, (i) => (i ? fieldRuntime().blobInfo?.(i) : undefined))
  return meta.value
}

function Chip(props: { id: string; compact?: boolean | undefined }): JSX.Element {
  const meta = useMeta(() => props.id)
  const name = () => meta()?.name || "File"
  return (
    <span class="nc-field-file" data-part="file-chip">
      <Icon name="file" size="sm" />
      <Show when={meta()?.url} fallback={<span class="nc-field-file__name">{name()}</span>}>
        {(url) => (
          <a class="nc-field-file__name nc-field-link" href={url()} target="_blank" rel="noopener">
            {name()}
          </a>
        )}
      </Show>
      <Show when={!props.compact && meta()?.size != null}>
        <span class="nc-meta">{formatBytes(meta()!.size!)}</span>
      </Show>
    </span>
  )
}

function Value(props: ValueProps): JSX.Element {
  return (
    <Show when={!isEmpty(props.value)} fallback={<Empty />}>
      <Chip id={idOf(props.value)} compact={props.compact} />
    </Show>
  )
}

function Editor(props: EditorProps): JSX.Element {
  let input!: HTMLInputElement
  const [busy, setBusy] = createSignal(false)
  const [failed, setFailed] = createSignal("")
  const id = () => idOf(props.value)
  const pick = () => input.click()
  async function put(file: File | undefined) {
    const up = fieldRuntime().uploadBlob
    if (!file || !up) return
    setBusy(true)
    setFailed("")
    try {
      const stored = await up(file)
      props.onTouch?.()
      props.onCommit(stored.id)
    } catch (e) {
      setFailed(e instanceof Error ? e.message : "The upload failed")
    } finally {
      setBusy(false)
      input.value = ""
    }
  }
  return (
    <span
      class={cx("nc-field-upload", props.variant === "boxed" && "nc-field-upload--boxed")}
      data-part="file-field"
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
        when={id()}
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
        <Chip id={id()} />
        <Show when={!props.disabled}>
          <DropdownMenu
            label={`${props.spec.title}, file`}
            placement="bottom-end"
            items={[
              { id: "replace", label: "Replace…", icon: "upload" as const },
              ...(props.spec.required
                ? []
                : [{ id: "remove", label: "Remove", icon: "trash" as const, danger: true }]),
            ]}
            onSelect={(a) => (a === "replace" ? pick() : props.onCommit(null))}
            trigger={(t) => <IconButton {...t} label={`${props.spec.title}, file actions`} icon="more" />}
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

export const blob: FieldKind = {
  text: (_s, v) => (isEmpty(v) ? "" : "File"),
  Value,
  Editor,
}
