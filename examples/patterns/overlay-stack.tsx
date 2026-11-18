import { Button, Dialog, Select, TextField, Tooltip, toast } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Overlays stack in one order",
  note: "drawer < dialog scrim < popovers < tooltips < toasts. Open the dialog, then the Select inside it, hover the help button, and raise a toast: each shows above the one before. Escape closes only the topmost.",
  toasts: true,
}

export default function OverlayStack() {
  const [open, setOpen] = createSignal(false)
  const [anchor, setAnchor] = createSignal<HTMLElement>()
  return (
    <div class="nc-row" ref={setAnchor}>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Invite people…
      </Button>
      <Dialog
        open={open()}
        anchor={anchor()}
        onClose={() => setOpen(false)}
        title="Invite to Atlas web"
        footer={
          <>
            <Button
              onClick={() =>
                toast({ title: "Draft saved", description: "The toast shows above the dialog." })
              }
            >
              Save draft
            </Button>
            <Button variant="primary" onClick={() => setOpen(false)}>
              Send invite
            </Button>
          </>
        }
      >
        <div class="ex-col">
          <TextField label="Email" placeholder="name@example.com" />
          <div class="nc-row">
            <div class="ex-grow">
              <Select
                label="Role"
                defaultValue="member"
                options={[
                  { value: "admin", label: "Admin", description: "Manages members and settings" },
                  { value: "member", label: "Member", description: "Works in projects" },
                  { value: "guest", label: "Guest", description: "Sees what is shared with them" },
                ]}
              />
            </div>
            <Tooltip content="Roles can be changed later in Members" placement="top">
              <Button size="sm" variant="ghost">
                What do roles do?
              </Button>
            </Tooltip>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
