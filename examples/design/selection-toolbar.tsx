import { Button, Checkbox, ListRow, RowList } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A toolbar that is always there",
  verdict: "dont",
  note: "A row of disabled bulk buttons and a checkbox on every row, for a selection nobody has made: chrome for the rare case, taking room in the normal one.",
}

/** Selection chrome shown before anything is selected, on purpose. */
export default function SelectionToolbar() {
  return (
    <div class="ex-col" style={{ gap: "var(--space-1)" }}>
      <div class="ex-row">
        <Checkbox label="Select all" />
        <Button size="sm" disabled>
          Archive
        </Button>
        <Button size="sm" disabled>
          Delete
        </Button>
      </div>
      <RowList label="Sessions">
        {["Fix the redirect loop", "Review the replicas PR", "Write the release notes"].map((t) => (
          <ListRow leading={<Checkbox aria-label={`Select ${t}`} />} title={t} meta="2h" />
        ))}
      </RowList>
    </div>
  )
}
