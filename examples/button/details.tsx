import { Button } from "@aiviarium/nocturne"
import { Server } from "lucide"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Shortcut, icons, link and loading" }

export default function ButtonDetails() {
  const [loading, setLoading] = createSignal(false)
  return (
    <div class="nc-row">
      <Button kbd="Ctrl ↵">Send</Button>
      <Button iconEnd="chevron-down" variant="secondary">
        Columns
      </Button>
      <Button iconNode={Server} variant="secondary">
        Lucide icon
      </Button>
      <Button href="#button" variant="secondary">
        As a link
      </Button>
      <Button
        variant="primary"
        loading={loading()}
        onClick={() => {
          setLoading(true)
          setTimeout(() => setLoading(false), 1500)
        }}
      >
        {loading() ? "Rebooting…" : "Reboot now"}
      </Button>
    </div>
  )
}
