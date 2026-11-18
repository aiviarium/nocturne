import { ListRow, RowList, reorderItems } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "The row is what moves",
  note: "No grip and no delete button: press a row and move it to drag it (a press that does not move opens it), Alt and an arrow moves it from the keyboard, and Delete is in its context menu and on the Delete key, with Undo. On a touch screen a long press opens the menu, and moving the finger then picks the row up.",
}

export default function DragTheRow() {
  const [steps, setSteps] = createSignal(["Build", "Test", "Deploy to staging", "Smoke test"])
  return (
    <RowList
      label="Pipeline steps"
      items={steps()}
      getKey={(s) => s}
      onReorder={(from, to) => setSteps(reorderItems(steps(), from, to))}
      onRemove={(keys) => {
        const before = steps()
        setSteps(before.filter((s) => !keys.includes(s)))
        return () => setSteps(before)
      }}
    >
      {(s) => <ListRow icon="bolt" title={s} meta="2m" onClick={() => {}} />}
    </RowList>
  )
}
