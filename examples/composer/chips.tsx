import { Composer } from "@aiviarium/nocturne"
import { COMMANDS, MENTIONS, SKILLS } from "../_kit/data"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Chips in the input",
  note: "A value with chips: each one is a single unit. One backspace removes it, the caret never enters it.",
  surface: "none",
  frame: "The composer keeps its caret with window.getSelection(), which does not see into a shadow root.",
  height: 140,
}

export default function ComposerChips() {
  return (
    <Composer
      defaultValue={[
        { type: "chip", trigger: "/", id: "review", label: "review" },
        { type: "text", text: " the changes in " },
        { type: "chip", trigger: "@", id: "f1", label: "useTasks.ts", kind: "file", icon: "file" },
        { type: "text", text: " with " },
        { type: "chip", trigger: "@", id: "p1", label: "Sarah Chen", kind: "person" },
        { type: "text", text: ", then " },
        { type: "chip", trigger: "$", id: "rn", label: "release-notes" },
        { type: "text", text: " " },
      ]}
      commands={COMMANDS}
      mentions={MENTIONS}
      skills={SKILLS}
    />
  )
}
