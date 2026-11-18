import { ListRow, RowList } from "@aiviarium/nocturne"
import { For } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A menu that ignores the selection",
  verdict: "dont",
  note: "Three rows are selected, but the right-clicked row's menu says Archive and Delete for that row alone: the person cannot tell whether Delete takes one row or three.",
}

const TITLES = [
  "Fix the redirect loop",
  "Review the replicas PR",
  "Write the release notes",
  "Port the docs search",
]

/** A per-row menu beside a selection, on purpose: the rows are not the list's items, so it cannot know. */
export default function MenuOnOneRow() {
  return (
    <RowList label="Sessions">
      <For each={TITLES}>
        {(t, i) => (
          <ListRow
            icon="agent"
            title={t}
            meta="2h"
            selected={i() < 3}
            onClick={() => {}}
            menu={[
              { id: "archive", label: "Archive", icon: "archive" },
              { id: "delete", label: "Delete", icon: "trash", danger: true },
            ]}
          />
        )}
      </For>
    </RowList>
  )
}
