// Formatted text (ProseMirror JSON): read as its plain text, edited in the shared rich text editor the platform
// has for every formatted text (`@aiviarium/nocturne` editor, the `field` variant). Inline it hands the document over when the
// editor is left; in a form it hands over every change.

import type { JSX } from "@solidjs/web"
import { Show } from "solid-js"
import { RichTextEditor, type RichTextJSON } from "../../editor"
import { cx } from "../../lib/cx"
import { Empty } from "../Empty"
import type { EditorProps, FieldKind, ValueProps } from "../kind"
import { isEmpty } from "../spec"

/** The text of ProseMirror JSON (or of a string), paragraphs on lines of their own. */
export function plainOf(v: unknown): string {
  if (typeof v === "string") return v
  const out: string[] = []
  const walk = (n: unknown) => {
    if (!n || typeof n !== "object") return
    const node = n as { text?: unknown; content?: unknown[]; type?: string }
    if (typeof node.text === "string") out.push(node.text)
    node.content?.forEach((c, i) => {
      if (i > 0 && (c as { type?: string }).type !== "text") out.push("\n")
      walk(c)
    })
  }
  walk(v)
  return out.join("")
}

/** A document of paragraphs for a plain string a field holds from before it was formatted text. */
const docOf = (v: unknown): RichTextJSON | null => {
  if (v && typeof v === "object" && (v as { type?: unknown }).type === "doc") return v as RichTextJSON
  if (typeof v === "string" && v)
    return {
      type: "doc",
      content: v
        .split("\n")
        .map((line) =>
          line ? { type: "paragraph", content: [{ type: "text", text: line }] } : { type: "paragraph" },
        ),
    }
  return null
}

function Value(props: ValueProps): JSX.Element {
  return (
    <Show when={!isEmpty(props.value) && plainOf(props.value)} fallback={<Empty />}>
      {(t) => <span class={cx("nc-field-long", props.compact && "nc-field-long--compact")}>{t()}</span>}
    </Show>
  )
}

function Editor(props: EditorProps): JSX.Element {
  const boxed = () => props.variant === "boxed"
  const everyChange = () => boxed() && props.commit !== "leave"
  // What the editor holds that was not handed over yet (inline: until it is left).
  let pending: RichTextJSON | undefined
  const hand = (doc: RichTextJSON) => {
    if (JSON.stringify(doc) === JSON.stringify(props.value)) return
    props.onCommit(plainOf(doc).trim() === "" && !props.spec.required ? null : doc)
  }
  return (
    <div
      class={cx("nc-field-rich", boxed() && "nc-field-rich--boxed")}
      data-part="richtext-field"
      data-invalid={props.error ? "" : undefined}
    >
      <RichTextEditor
        variant="field"
        value={docOf(props.value)}
        readOnly={props.disabled}
        aria-label={props.spec.title}
        placeholder="—"
        blockPlaceholder={null}
        autofocus={props.autofocus}
        onChange={(doc) => {
          props.onTouch?.()
          if (everyChange()) hand(doc)
          else pending = doc
        }}
        onFocusChange={(focused) => {
          if (focused || everyChange() || !pending) return
          const doc = pending
          pending = undefined
          hand(doc)
        }}
      />
    </div>
  )
}

export const richtext: FieldKind = {
  text: (_s, v) => (isEmpty(v) ? "" : plainOf(v)),
  Value,
  Editor,
}
