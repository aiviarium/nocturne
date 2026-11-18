import { Button, ListRow, RowList } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A bar while something is selected",
  verdict: "do",
  note: "Nothing about selection shows until a row is selected; then the count and what can be done with it, at the list's foot.",
}

export default function SelectionBar() {
  return (
    <RowList
      label="Sessions"
      items={["Fix the redirect loop", "Review the replicas PR", "Write the release notes"]}
      getKey={(t) => t}
      selectable
      defaultSelected={["Fix the redirect loop", "Write the release notes"]}
      bulkActions={() => (
        <Button size="sm" variant="ghost" icon="archive">
          Archive
        </Button>
      )}
    >
      {(t) => <ListRow icon="agent" title={t} meta="2h" />}
    </RowList>
  )
}
