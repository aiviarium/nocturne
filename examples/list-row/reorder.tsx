import { ListRow, RowList, reorderItems } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Reorder by drag or keyboard",
  note: "Press a row and move it to drag it (a press that does not move is a click); the line is where it lands, and the list scrolls at its edges. From the keyboard, Alt and an arrow on a row moves it, and the move is announced. On a touch screen, press and hold a row: its menu opens, and moving the finger picks the row up and closes the menu.",
}

const STEPS = [
  { id: "lint", title: "Lint", secondary: "biome ci", meta: "12s", icon: "check" },
  { id: "types", title: "Type-check", secondary: "tsc --noEmit", meta: "41s", icon: "file" },
  { id: "unit", title: "Unit tests", secondary: "bun test", meta: "1m 4s", icon: "list" },
  { id: "build", title: "Build the web app", secondary: "vite build", meta: "38s", icon: "layers" },
  { id: "e2e", title: "End-to-end tests", secondary: "playwright", meta: "6m", icon: "play" },
  { id: "deploy", title: "Deploy preview", secondary: "docker compose up", meta: "2m", icon: "send" },
] as const

export default function Reorder() {
  const [steps, setSteps] = createSignal<readonly (typeof STEPS)[number][]>(STEPS)
  return (
    <RowList
      label="Pipeline steps"
      items={steps()}
      getKey={(s) => s.id}
      onReorder={(from, to) => setSteps(reorderItems(steps(), from, to))}
    >
      {(s) => <ListRow icon={s.icon} title={s.title} secondary={s.secondary} meta={s.meta} />}
    </RowList>
  )
}
