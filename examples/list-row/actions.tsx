import { Button, ListRow, RowList } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Persistent actions",
  note: "Answer controls that are the point of the row stay visible.",
}

export default function RowActions() {
  return (
    <RowList label="Approvals">
      <ListRow
        icon="sparkle"
        title="Create or overwrite a file"
        secondary="Fix the sign-in redirect loop"
        persistentActions={
          <>
            <Button size="sm" variant="secondary">
              Deny
            </Button>
            <Button size="sm" variant="primary">
              Allow
            </Button>
          </>
        }
      />
    </RowList>
  )
}
