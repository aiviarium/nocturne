// A reference to an entity (`ref`) or several (`refs`): each as the entity's chip; editing opens a search of the
// entities the field points at, and picking one again takes it out of a list.

import type { JSX } from "@solidjs/web"
import { createSignal, For, Show } from "solid-js"
import { Icon } from "../../components/Icon"
import { TextField } from "../../components/TextField"
import { aria } from "../../lib/aria"
import { createLoaded } from "../../lib/resource"
import { Empty } from "../Empty"
import type { EditorProps, FieldKind, ValueProps } from "../kind"
import { PickerSurface } from "../parts/PickerSurface"
import { fieldRuntime } from "../runtime"
import { type FieldSpec, isEmpty } from "../spec"

/** The entity URIs a value names: a bare id gets the field's scheme. */
function uris(spec: FieldSpec, value: unknown): string[] {
  const list = Array.isArray(value) ? value : value == null || value === "" ? [] : [value]
  return list
    .map(String)
    .map((v) => (v.includes("://") ? v : spec.scheme ? `${spec.scheme}://${v}` : ""))
    .filter(Boolean)
}

function Chip(props: { uri: string }): JSX.Element {
  const chip = fieldRuntime().refChip
  return chip ? chip(props) : <span>{props.uri}</span>
}

function Value(props: ValueProps): JSX.Element {
  const list = () => uris(props.spec, props.value)
  const shown = () => (props.compact ? list().slice(0, 2) : list())
  return (
    <Show when={list().length > 0} fallback={<Empty />}>
      <span class="nc-field-refs">
        <For each={shown()}>{(u) => <Chip uri={u} />}</For>
        <Show when={list().length > shown().length}>
          <span class="nc-meta">+{list().length - shown().length}</span>
        </Show>
      </span>
    </Show>
  )
}

function Editor(props: EditorProps): JSX.Element {
  const multi = () => !!props.spec.multiple
  const values = () => uris(props.spec, props.value)
  const [open, setOpen] = createSignal(false)
  const [text, setText] = createSignal("")
  const [anchor, setAnchor] = createSignal<HTMLElement>()
  const found = createLoaded(
    () => (open() ? { text: text(), scheme: props.spec.scheme } : null),
    (q) => fieldRuntime().searchRefs?.(q),
  )
  const pick = (uri: string) => {
    if (multi()) {
      const have = values()
      props.onCommit(have.includes(uri) ? have.filter((u) => u !== uri) : [...have, uri])
    } else {
      props.onCommit(uri)
      setOpen(false)
    }
  }
  const boxed = () => props.variant === "boxed"
  return (
    <span class="nc-field-refs" data-part="ref-picker" data-variant={props.variant ?? "inline"}>
      <For each={values()}>{(u) => <Chip uri={u} />}</For>
      <Show when={!props.disabled}>
        <button
          type="button"
          ref={setAnchor}
          class={
            boxed() && !values().length
              ? "nc-field-chip nc-input nc-select nc-field-chip--boxed"
              : "nc-field-chip nc-field-chip--plain"
          }
          aria-label={values().length ? `Change ${props.spec.title}` : props.spec.title}
          aria-haspopup="listbox"
          aria-expanded={aria(open())}
          aria-invalid={props.error ? "true" : undefined}
          onClick={() => {
            setText("")
            setOpen((o) => !o)
          }}
        >
          <Show when={!values().length}>
            <Empty />
          </Show>
          <Icon
            name={values().length || boxed() ? "chevron-down" : "plus"}
            size="sm"
            class={boxed() && !values().length ? "nc-select__chevron" : undefined}
          />
        </button>
        <PickerSurface
          open={open()}
          anchor={anchor()}
          onClose={() => setOpen(false)}
          label={props.spec.title}
          class="nc-field-pop nc-field-pop--list"
        >
          <div class="nc-field-pop__list">
            <TextField
              variant="search"
              label={`Find ${props.spec.title}`}
              placeholder="Search"
              autofocus
              value={text()}
              onInput={(e) => setText(e.currentTarget.value)}
            />
            <div class="nc-field-results" role="listbox" aria-label={props.spec.title}>
              <For each={found.value() ?? []}>
                {(e) => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={aria(values().includes(e.uri))}
                    class="nc-field-result"
                    onClick={() => pick(e.uri)}
                  >
                    <span>{e.title}</span>
                    <Show when={values().includes(e.uri)}>
                      <Icon name="check" size="sm" />
                    </Show>
                  </button>
                )}
              </For>
              <Show when={!found.loading() && (found.value() ?? []).length === 0}>
                <div class="nc-meta nc-field-none">No matches</div>
              </Show>
            </div>
            <Show when={!props.spec.required && values().length > 0 && !multi()}>
              <button
                type="button"
                class="nc-field-result"
                onClick={() => {
                  props.onCommit(null)
                  setOpen(false)
                }}
              >
                Clear
              </button>
            </Show>
          </div>
        </PickerSurface>
      </Show>
    </span>
  )
}

export const ref: FieldKind = {
  text: (spec, v) => (isEmpty(v) ? "" : uris(spec, v).join(", ")),
  Value,
  Editor,
}
