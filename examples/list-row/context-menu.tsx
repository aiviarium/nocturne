import { Button, ListRow, type RowKey, RowList } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A menu for the row, or for the selection",
  note: "Right-click a row, press the Menu key or Shift+F10 on it, or long-press it on a touch screen. Select two or three rows first (Cmd or Ctrl, or Shift, and a click) and right-click one of them: the menu acts on all of them. A row outside the selection is selected alone first, as in a file manager.",
  toasts: true,
}

interface Session {
  id: string
  title: string
  model: string
  ago: string
  archived?: boolean
}

const SESSIONS: Session[] = [
  { id: "a1", title: "Fix the redirect loop", model: "Opus", ago: "4m" },
  { id: "a2", title: "Review the replicas PR", model: "Sonnet", ago: "1h" },
  { id: "a3", title: "Write the release notes", model: "Opus", ago: "2h" },
  { id: "a4", title: "Profile the board view", model: "Haiku", ago: "Yesterday" },
  { id: "a5", title: "Port the docs search", model: "Sonnet", ago: "3d" },
]

export default function RowMenus() {
  const [sessions, setSessions] = createSignal(SESSIONS)
  const [selected, setSelected] = createSignal<RowKey[]>(["a2", "a3"])
  const archive = (keys: RowKey[]) =>
    setSessions(sessions().map((s) => (keys.includes(s.id) ? { ...s, archived: true } : s)))
  return (
    <RowList
      label="Sessions"
      items={sessions()}
      getKey={(s) => s.id}
      itemLabel={(s) => s.title}
      selectable
      selected={selected()}
      onSelectedChange={setSelected}
      onRemove={(keys) => {
        const before = sessions()
        setSessions(before.filter((s) => !keys.includes(s.id)))
        return () => setSessions(before)
      }}
      bulkActions={(_, keys) => (
        <Button size="sm" variant="ghost" icon="archive" onClick={() => archive(keys)}>
          Archive
        </Button>
      )}
      rowMenu={({ keys }) => {
        const n = keys.length > 1 ? ` ${keys.length}` : ""
        return [
          ...(keys.length === 1
            ? [
                { id: "open", label: "Open", icon: "arrow-up-right" as const },
                { id: "split", label: "Open in a split", icon: "layers" as const },
                { id: "rename", label: "Rename", icon: "edit" as const, shortcut: "F2" },
              ]
            : [{ type: "label" as const, label: `${keys.length} selected` }]),
          { id: "archive", label: `Archive${n}`, icon: "archive" as const, onSelect: () => archive(keys) },
          { type: "separator" },
          { id: "delete", label: `Delete${n}`, icon: "trash" as const, danger: true },
        ]
      }}
    >
      {(s) => (
        <ListRow
          icon="agent"
          title={s.title}
          secondary={s.model}
          meta={s.ago}
          muted={s.archived}
          onClick={() => {}}
          onRename={(title) => setSessions(sessions().map((x) => (x.id === s.id ? { ...x, title } : x)))}
        />
      )}
    </RowList>
  )
}
