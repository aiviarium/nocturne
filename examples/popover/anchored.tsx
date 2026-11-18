import { Button, DropdownMenu, Popover, TextField } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import { ISSUE_MENU } from "../_kit/data"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Anchored content",
  note: "It flips when there is no room, clamps to the viewport and closes on Escape or an outside press.",
}

export default function Notifications() {
  const [open, setOpen] = createSignal(false)
  const [anchor, setAnchor] = createSignal<HTMLElement>()
  return (
    <div class="nc-row">
      <Button ref={setAnchor} iconEnd="chevron-down" onClick={() => setOpen(!open())}>
        Notifications
      </Button>
      <Popover open={open()} anchor={anchor()} onClose={() => setOpen(false)} placement="bottom-start">
        <div class="nc-menu ex-pop">
          <span class="nc-menu__label">Notify me about</span>
          <TextField label="Keyword" placeholder="deploy" />
          <Button size="sm" variant="primary" onClick={() => setOpen(false)}>
            Save
          </Button>
        </div>
      </Popover>
      <DropdownMenu
        label="Context"
        items={ISSUE_MENU}
        placement="right-start"
        trigger={(tp) => <Button {...tp}>Opens to the right</Button>}
      />
    </div>
  )
}
