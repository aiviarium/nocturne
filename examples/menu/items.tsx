import { Button, DropdownMenu } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import { ISSUE_MENU } from "../_kit/data"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Items, shortcuts, separator, danger", surface: "well" }

export default function MenuItems() {
  const [last, setLast] = createSignal("nothing yet")
  return (
    <div class="ex-col ex-narrow">
      <DropdownMenu
        label="Issue actions"
        trigger={(t) => <Button {...t}>Issue actions</Button>}
        items={ISSUE_MENU}
        onSelect={setLast}
      />
      <span class="nc-meta">Chose: {last()}</span>
    </div>
  )
}
