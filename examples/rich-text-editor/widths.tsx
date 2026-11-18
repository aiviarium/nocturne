import { Card, EditorServicesProvider, RichTextEditor, type RichTextJSON } from "@aiviarium/nocturne"
import { IMAGE, SERVICES } from "../_kit/richtext"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Block widths",
  note: "The text column is the host's --nc-editor-measure, centred. The table is wide and the image full width: choose another width from a block's menu (its handle). A code block may be wide; text stays in the column.",
  surface: "none",
  frame:
    "The editor's selection, format bar and block handles read window.getSelection(), which does not see into a shadow root.",
  height: 720,
}

const t = (text: string): RichTextJSON => ({ type: "text", text })
const p = (text: string): RichTextJSON => ({ type: "paragraph", content: [t(text)] })
const row = (cells: string[], header = false): RichTextJSON => ({
  type: "table_row",
  content: cells.map((c) => ({ type: header ? "table_header" : "table_cell", content: [p(c)] })),
})

const DOC: RichTextJSON = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [t("Hosts")] },
    p(
      "Every host the agents use, with where it runs and who looks after it. The table breaks out of the column.",
    ),
    {
      type: "table",
      attrs: { blockWidth: "wide" },
      content: [
        row(["Host", "Target", "Status", "Owner", "Region", "Last apply"], true),
        row(["build-01", "SSH", "Ready", "Mira", "eu-west", "2 hours ago"]),
        row(["agent-lab", "Cloud", "Applying", "Jonas", "us-east", "now"]),
        row(["field-laptop", "USB", "Behind", "Tomas", "local", "3 days ago"]),
      ],
    },
    p("Deploys per day, edge to edge:"),
    { type: "image", attrs: { src: IMAGE, alt: "Deploys per day", blockWidth: "full" } },
    { type: "code_block", attrs: { language: "sh" }, content: [t("hostctl apply build-01 --profile agent")] },
  ],
}

export default function Widths() {
  return (
    <EditorServicesProvider value={SERVICES}>
      <Card padding="none" class="ex-editor-widths">
        <RichTextEditor value={DOC} aria-label="Hosts" />
      </Card>
    </EditorServicesProvider>
  )
}
