import { Composer, type ComposerAttachment } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import { COMMANDS, MENTIONS, SKILLS } from "../_kit/data"
import { screenshot } from "../_kit/media"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Attachments",
  note: "An image with a preview shows as a thumbnail, other files as a chip. Each one has a remove button.",
  surface: "none",
  frame: "The composer keeps its caret with window.getSelection(), which does not see into a shadow root.",
  height: 180,
}

const START: ComposerAttachment[] = [
  { id: "shot", name: "signup-page.png", kind: "image", preview: screenshot(320, 200) },
  { id: "notes", name: "release-plan.md", icon: "file" },
]

export default function ComposerAttachments() {
  const [attachments, setAttachments] = createSignal<ComposerAttachment[]>(START)
  return (
    <Composer
      placeholder="Ask about the screenshot"
      attachments={attachments()}
      onRemoveAttachment={(id) => setAttachments((list) => list.filter((a) => a.id !== id))}
      onAttach={() => setAttachments(START)}
      commands={COMMANDS}
      mentions={MENTIONS}
      skills={SKILLS}
    />
  )
}
