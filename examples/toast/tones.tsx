import { Button, clearToasts, toast } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Tones", toasts: true }

export default function ToastTones() {
  return (
    <div class="nc-row">
      <Button onClick={() => toast({ title: "Copied link to clipboard" })}>Neutral</Button>
      <Button
        onClick={() =>
          toast({ tone: "success", title: "Host build-01 rebooted", description: "Back online in 42 s." })
        }
      >
        Success
      </Button>
      <Button
        onClick={() =>
          toast({
            tone: "warning",
            title: "Sessions still running",
            description: "3 agents will lose unsaved work.",
          })
        }
      >
        Warning
      </Button>
      <Button
        onClick={() =>
          toast({
            tone: "danger",
            title: "502 · Can't reach host build-01",
            description: "Last seen 4 min ago.",
            action: { label: "Retry", onClick: () => {} },
          })
        }
      >
        Danger
      </Button>
      <Button variant="ghost" onClick={clearToasts}>
        Clear all
      </Button>
    </div>
  )
}
