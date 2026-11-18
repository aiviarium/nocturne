import { IconButton, ListRow, NavigationScreen, RowList, State } from "@aiviarium/nocturne"
import { createSignal, For } from "solid-js"
import { SESSIONS } from "../_kit/data"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Contextual actions on a phone",
  note: "The hover actions take no width on a touch screen: swipe a row to the left to reveal them, or press and hold it for a menu of them. Swipe the first row to the right to mark it read. Answer buttons (persistentActions) stay visible.",
  phone: true,
  screen: true,
  height: 520,
}

export default function TouchActions() {
  const [read, setRead] = createSignal<Record<string, boolean>>({})
  const [archived, setArchived] = createSignal<string[]>([])
  return (
    <NavigationScreen title="Sessions" largeTitle>
      <RowList label="Sessions">
        <For each={SESSIONS.filter((s) => !archived().includes(s.id))}>
          {(s, i) => (
            <ListRow
              lines={2}
              icon="sparkle"
              title={s.title}
              secondary={s.where}
              status={<State status={s.state}>{s.word}</State>}
              meta={s.when}
              unread={!read()[s.id]}
              onClick={() => setRead({ ...read(), [s.id]: true })}
              leadingActions={
                i() === 0
                  ? [
                      {
                        id: "read",
                        label: read()[s.id] ? "Unread" : "Read",
                        icon: "check",
                        tone: "accent",
                        onAction: () => setRead({ ...read(), [s.id]: !read()[s.id] }),
                      },
                    ]
                  : undefined
              }
              actions={
                <IconButton
                  size="sm"
                  label="Archive"
                  icon="archive"
                  onClick={() => setArchived([...archived(), s.id])}
                />
              }
            />
          )}
        </For>
      </RowList>
    </NavigationScreen>
  )
}
