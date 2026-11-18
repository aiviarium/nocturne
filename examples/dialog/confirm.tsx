import { Button, Dialog, TextField } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Destructive confirmation",
  note: "The dialog names what will be lost, and the button says exactly what happens. Focus moves in, Tab cycles inside, Escape closes and focus returns to the button.",
}

export default function DeleteHost() {
  const [open, setOpen] = createSignal(false)
  const [name, setName] = createSignal("")
  const [anchor, setAnchor] = createSignal<HTMLElement>()
  return (
    <div class="nc-row" ref={setAnchor}>
      <Button variant="danger" icon="trash" onClick={() => setOpen(true)}>
        Delete host…
      </Button>
      <Dialog
        open={open()}
        anchor={anchor()}
        onClose={() => setOpen(false)}
        title="Delete host build-01"
        description="This removes the host and ends 3 running sessions. Agents lose unsaved work."
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="danger" disabled={name() !== "build-01"} onClick={() => setOpen(false)}>
              Delete build-01
            </Button>
          </>
        }
      >
        <TextField
          label="Type the host name to confirm"
          mono
          placeholder="build-01"
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
        />
      </Dialog>
    </div>
  )
}
