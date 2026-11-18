import { IssueBoardExample } from "../_kit/board"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Lanes that scroll sideways",
  note: "Each lane is 272px whatever the room: when they do not fit, the board scrolls sideways inside itself. Drag a card to another lane; a click selects it.",
}

export default function Lanes() {
  return <IssueBoardExample />
}
