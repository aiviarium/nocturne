import { IssueBoardExample } from "../_kit/board"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "On a phone: grouped lists",
  note: "Narrower than 560px of its own width, the same board shows a section per lane and its cards as rows.",
  phone: true,
  height: 640,
}

export default function Phone() {
  return <IssueBoardExample />
}
