import { Button, DropdownMenu } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "With descriptions", surface: "well" }

export default function ModeMenu() {
  return (
    <div class="ex-narrow">
      <DropdownMenu
        label="Mode"
        trigger={(t) => <Button {...t}>Mode</Button>}
        radio
        items={[
          { id: "ask", label: "Ask", description: "Answers without touching files", checked: true },
          { id: "plan", label: "Plan", description: "Proposes steps and waits" },
          { id: "edit", label: "Edit", description: "Changes files after approval" },
        ]}
      />
    </div>
  )
}
