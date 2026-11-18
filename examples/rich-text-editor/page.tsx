import { Card, EditorServicesProvider, RichTextEditor, type RichTextJSON } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import { SAMPLE, SERVICES } from "../_kit/richtext"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A page, in plain mode",
  note: "value and onChange; the writing assistant, dictation and uploads use mock services here.",
  surface: "none",
  frame:
    "The editor's selection, format bar and block handles read window.getSelection(), which does not see into a shadow root.",
  height: 760,
}

export default function RunbookPage() {
  const [value, setValue] = createSignal<RichTextJSON | null>(SAMPLE)
  const [changes, setChanges] = createSignal(0)
  return (
    <EditorServicesProvider value={SERVICES}>
      <Card class="ex-editor-page">
        <RichTextEditor
          value={value()}
          onChange={(v) => {
            setValue(v)
            setChanges((n) => n + 1)
          }}
          aria-label="Runbook"
          placeholder="Write something"
        />
      </Card>
      <p class="nc-meta" data-testid="change-count">
        {changes()} changes
      </p>
    </EditorServicesProvider>
  )
}
