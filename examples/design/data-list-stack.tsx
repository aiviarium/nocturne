import { Button, TextField } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A stack of fields and buttons",
  note: "Each item a labelled field of its own with a Remove button, and a big Add under them: three times the height, no order, and no keyboard between the rows.",
}

/** Built from separate fields, on purpose. */
export default function DataListStack() {
  return (
    <div class="ex-col ex-form">
      {["web", "auth", "safari"].map((t, i) => (
        <div class="ex-row" style={{ "flex-wrap": "nowrap", "align-items": "flex-end" }}>
          <TextField label={`Tag ${i + 1}`} value={t} />
          <Button>Remove</Button>
        </div>
      ))}
      <div>
        <Button icon="plus">Add tag</Button>
      </div>
    </div>
  )
}
