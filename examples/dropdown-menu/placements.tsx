import { Button, DropdownMenu, IconButton } from "@aiviarium/nocturne"
import { ISSUE_MENU } from "../_kit/data"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Placements",
  note: "Open each one, or use the keyboard: Tab to the button, Arrow Down, then arrows, Enter.",
  surface: "well",
}

export default function DropdownPlacements() {
  return (
    <div class="nc-row">
      <DropdownMenu
        label="Issue actions"
        items={ISSUE_MENU}
        trigger={(tp) => (
          <Button iconEnd="chevron-down" {...tp}>
            Actions
          </Button>
        )}
      />
      <DropdownMenu
        label="More"
        placement="bottom-end"
        items={ISSUE_MENU}
        trigger={(tp) => <IconButton label="More actions" icon="more" tooltip={false} {...tp} />}
      />
      <DropdownMenu
        label="Above"
        placement="top-start"
        items={ISSUE_MENU}
        trigger={(tp) => (
          <Button variant="ghost" iconEnd="chevron-down" {...tp}>
            Opens upwards
          </Button>
        )}
      />
    </div>
  )
}
