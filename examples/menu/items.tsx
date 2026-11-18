import { Menu } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import { ISSUE_MENU } from "../_kit/data"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Items, shortcuts, separator, danger", surface: "well" }

export default function MenuItems() {
  const [last, setLast] = createSignal("nothing yet")
  return (
    <div class="ex-col ex-narrow">
      <Menu label="Issue actions" items={ISSUE_MENU} autoFocus={false} onSelect={setLast} />
      <span class="nc-meta">Chose: {last()}</span>
    </div>
  )
}
