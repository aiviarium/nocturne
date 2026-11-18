import { Button, Kbd, Tooltip } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Tooltip",
  note: "Hover or focus a button. The tooltip inverts: a light chip on dark, with the shortcut beside the label.",
}

export default function Tooltips() {
  return (
    <div class="nc-row">
      <span class="nc-tooltip">
        Toggle sidebar <Kbd keys="[" />
      </span>
      <Tooltip content="Search" shortcut="Ctrl K" placement="bottom">
        <Button>Hover me</Button>
      </Tooltip>
    </div>
  )
}
