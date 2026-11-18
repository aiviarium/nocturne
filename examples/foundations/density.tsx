import { Button, IconButton, ListRow, RowList, State, TextField } from "@aiviarium/nocturne"
import { For } from "solid-js"
import { useDensity } from "../_kit/settings"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Controls and rows at their sizes",
  note: "Buttons 24, 28 and 32; icon buttons 24 and 28; fields 30; rows 30 compact or 36 comfortable (the panel above switches the rows). Every size is a token: --control-*, --row-*, --header.",
}

const ROWS = [
  {
    title: "Fix the sign-in redirect loop",
    get state() {
      return <State status="warn">Needs you</State>
    },
    meta: "4m",
  },
  { title: "Add a test for the task list", meta: "12m" },
  { title: "Profile the activity page", meta: "1h" },
]

export default function Density() {
  const density = useDensity()
  return (
    <div class="ex-grid ex-grid--2">
      <div class="ex-col">
        <span class="nc-meta">Buttons: sm 24 · md 28 · lg 32</span>
        <div class="nc-row">
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">Large</Button>
          <IconButton size="sm" label="Filter" icon="filter" />
          <IconButton label="Filter" icon="filter" />
        </div>
        <span class="nc-meta">Fields: 30</span>
        <TextField label="Host name" defaultValue="build-01" />
      </div>
      <div class="ex-col">
        <span class="nc-meta">Rows: {density() === "compact" ? "compact 30" : "comfortable 36"}</span>
        <RowList label="Sessions">
          <For each={ROWS}>
            {(r) => (
              <ListRow
                density={density()}
                icon="sparkle"
                title={r.title}
                status={r.state}
                meta={r.meta}
                onClick={() => {}}
              />
            )}
          </For>
        </RowList>
      </div>
    </div>
  )
}
