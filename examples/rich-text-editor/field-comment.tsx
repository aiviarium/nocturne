import { Card, EditorServicesProvider, RichTextEditor } from "@aiviarium/nocturne"
import { SERVICES } from "../_kit/richtext"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Field and comment",
  note: "The same editor as an issue's description field and as a reply.",
  surface: "none",
  frame: "The editor reads window.getSelection(), which does not see into a shadow root.",
  height: 220,
}

export default function FieldAndComment() {
  return (
    <EditorServicesProvider value={SERVICES}>
      <div class="ex-col">
        <RichTextEditor
          variant="field"
          value={null}
          placeholder="Describe the issue"
          aria-label="Description"
        />
        <Card>
          <RichTextEditor
            variant="comment"
            value={null}
            placeholder="Reply, @ to mention"
            aria-label="Reply"
          />
        </Card>
      </div>
    </EditorServicesProvider>
  )
}
