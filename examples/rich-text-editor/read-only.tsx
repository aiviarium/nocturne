import { EditorServicesProvider, RichTextEditor } from "@aiviarium/nocturne"
import { SAMPLE, SERVICES } from "../_kit/richtext"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Read only",
  frame: "The editor reads window.getSelection(), which does not see into a shadow root.",
  height: 700,
}

export default function ReadOnly() {
  return (
    <EditorServicesProvider value={SERVICES}>
      <RichTextEditor value={SAMPLE} readOnly aria-label="Read only" />
    </EditorServicesProvider>
  )
}
