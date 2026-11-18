import { Icon, IconButton, ListRow, type LucideNode, RowList } from "@aiviarium/nocturne"
import { For } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A grip and a delete button on every row",
  note: "Controls that repeat on every row: a grip to drag it by and a delete button beside its time. They crowd the row, put a destructive action one stray click away, and say what the row itself, its menu and the Delete key already do.",
}

const GRIP: LucideNode = [
  ["circle", { cx: "9", cy: "12", r: "1" }],
  ["circle", { cx: "9", cy: "5", r: "1" }],
  ["circle", { cx: "9", cy: "19", r: "1" }],
  ["circle", { cx: "15", cy: "12", r: "1" }],
  ["circle", { cx: "15", cy: "5", r: "1" }],
  ["circle", { cx: "15", cy: "19", r: "1" }],
]

/** A grip and a delete button on each row, on purpose. */
export default function GripAndDelete() {
  return (
    <RowList label="Pipeline steps">
      <For each={["Build", "Test", "Deploy to staging", "Smoke test"]}>
        {(s) => (
          <ListRow
            leading={
              <span style={{ display: "inline-flex", color: "var(--text-3)", cursor: "grab" }}>
                <Icon node={GRIP} size="sm" />
              </span>
            }
            title={s}
            meta="2m"
            persistentActions={<IconButton size="sm" icon="trash" label={`Delete ${s}`} />}
          />
        )}
      </For>
    </RowList>
  )
}
