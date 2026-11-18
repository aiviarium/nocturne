import { IconButton, ListRow, RowList, State } from "@aiviarium/nocturne"
import { createSignal, For } from "solid-js"
import { SESSIONS } from "../_kit/data"
import { useDensity } from "../_kit/settings"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Compact (default), one line",
  note: "Secondary text follows the title on the same line. Actions show on hover, focus and selection.",
}

export default function OneLineRows() {
  const [selected, setSelected] = createSignal("s1")
  const density = useDensity()
  return (
    <RowList label="Sessions">
      <For each={SESSIONS}>
        {(s) => (
          <ListRow
            density={density()}
            icon="sparkle"
            title={s.title}
            secondary={s.where}
            status={<State status={s.state}>{s.word}</State>}
            meta={s.when}
            selected={selected() === s.id}
            onClick={() => setSelected(s.id)}
            actions={<IconButton size="sm" label="Archive" icon="archive" />}
          />
        )}
      </For>
    </RowList>
  )
}
