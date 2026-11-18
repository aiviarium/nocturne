import { ContextMenu, ListRow, RowList, toast } from "@aiviarium/nocturne"
import { For } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "The row's menu is where the row is",
  verdict: "do",
  note: "Right-click a row (or press the menu key on it). On a phone the same menu opens on a long press.",
  toasts: true,
}

const PAGES = ["Launch plan", "Host setup runbook", "Release notes 0.6"]

export default function RowContextMenu() {
  return (
    <RowList label="Pages">
      <For each={PAGES}>
        {(page) => (
          <ContextMenu
            label={page}
            items={() => [
              { id: "open", label: "Open", icon: "arrow-up-right" },
              { id: "pin", label: "Pin", icon: "star" },
              { id: "link", label: "Copy link", icon: "link", shortcut: "Ctrl L" },
              { type: "separator" },
              { id: "delete", label: "Delete", icon: "trash", danger: true },
            ]}
            onSelect={(id) => toast({ title: `${id} · ${page}` })}
          >
            <ListRow icon="file" title={page} meta="4m" onClick={() => {}} />
          </ContextMenu>
        )}
      </For>
    </RowList>
  )
}
