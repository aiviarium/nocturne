import { Button, ListRow, type RowKey, RowList } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "The menu acts on the selection",
  note: "Three rows are selected; a right click on any of them opens a menu that says what it acts on: “3 selected”, Archive 3, Delete 3. A right click outside the selection selects that row alone first.",
}

const TITLES = [
  "Fix the redirect loop",
  "Review the replicas PR",
  "Write the release notes",
  "Port the docs search",
]

export default function MenuOnSelection() {
  const [selected, setSelected] = createSignal<RowKey[]>(TITLES.slice(0, 3))
  return (
    <RowList
      label="Sessions"
      items={TITLES}
      getKey={(t) => t}
      selectable
      selected={selected()}
      onSelectedChange={setSelected}
      bulkActions={() => (
        <Button size="sm" variant="ghost" icon="archive">
          Archive
        </Button>
      )}
      rowMenu={({ keys }) => {
        const n = keys.length > 1 ? ` ${keys.length}` : ""
        return [
          ...(keys.length > 1 ? [{ type: "label" as const, label: `${keys.length} selected` }] : []),
          { id: "archive", label: `Archive${n}`, icon: "archive" as const },
          { id: "delete", label: `Delete${n}`, icon: "trash" as const, danger: true },
        ]
      }}
    >
      {(t) => <ListRow icon="agent" title={t} meta="2h" />}
    </RowList>
  )
}
