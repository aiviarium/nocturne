import { ListRow, NavigationScreen, type RowKey, RowList, reorderItems } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Editing a list on a phone",
  note: "As on iOS: Edit puts a selection circle at each row's start, and the bar at the foot acts on the selection. Press and hold a row for its menu and move the finger to drag it; swipe it to the left to delete it.",
  phone: true,
  height: 560,
  toasts: true,
}

const PINS = [
  { id: "a", title: "Launch plan", icon: "file" },
  { id: "b", title: "Inbox", icon: "inbox" },
  { id: "c", title: "Fix the redirect loop", icon: "agent" },
  { id: "d", title: "host-01", icon: "server" },
  { id: "e", title: "Cycle 14", icon: "calendar" },
] as const

export default function PhoneEdit() {
  const [pins, setPins] = createSignal<readonly (typeof PINS)[number][]>(PINS)
  const [editing, setEditing] = createSignal(false)
  const [selected, setSelected] = createSignal<RowKey[]>([])
  return (
    <NavigationScreen
      title="Pinned"
      largeTitle
      actions={[
        {
          id: "edit",
          label: editing() ? "Done" : "Edit",
          primary: editing(),
          onClick: () => {
            setEditing(!editing())
            setSelected([])
          },
        },
      ]}
    >
      <RowList
        label="Pinned"
        items={pins()}
        getKey={(p) => p.id}
        itemLabel={(p) => p.title}
        editing={editing()}
        selectable={editing()}
        selected={selected()}
        onSelectedChange={setSelected}
        onReorder={(from, to) => setPins(reorderItems(pins(), from, to))}
        onRemove={(keys) => {
          const before = pins()
          setPins(before.filter((p) => !keys.includes(p.id)))
          return () => setPins(before)
        }}
      >
        {(p) => <ListRow icon={p.icon} title={p.title} href="#pinned" />}
      </RowList>
    </NavigationScreen>
  )
}
