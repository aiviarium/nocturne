import { TextArea, TextField } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Default, help, error and disabled" }

export default function TextFieldStates() {
  return (
    <div class="ex-col">
      <TextField
        label="Issue title"
        defaultValue="Add an empty state to the activity feed"
        help="Default: hover raises the edge, focus uses accent plus the focus ring."
      />
      <TextField label="Host name" defaultValue="build 01" error="Use letters, digits, -, _ or . only." />
      <TextField label="Disabled" defaultValue="Locked on the server" disabled />
      <TextArea
        label="TextArea"
        help="For writing at length. With a TranscriberProvider above it, it has dictation."
        placeholder="A few paragraphs…"
      />
    </div>
  )
}
