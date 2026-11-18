import { Button } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Controls blown up to 44px",
  verdict: "dont",
  note: "Making the visible button as big as the finger: the bar's chrome outweighs the title, and three actions no longer fit.",
}

export default function InflatedControl() {
  return (
    <div class="ex-phone-bar">
      <Button size="lg" icon="chevron-left" class="ex-fat">
        Back
      </Button>
      <span class="label ex-grow" style={{ "text-align": "center" }}>
        Launch plan
      </span>
      <Button size="lg" class="ex-fat">
        Share
      </Button>
    </div>
  )
}
