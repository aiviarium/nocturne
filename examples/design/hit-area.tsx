import { IconButton } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Compact control, 44px hit area",
  verdict: "do",
  note: "The bar's buttons stay 30px to the eye; the dashed box is the invisible 44px area .nc-hit gives each on a phone. Neighbours are spaced so the areas do not overlap.",
}

export default function HitArea() {
  return (
    <div class="ex-phone-bar">
      <span class="ex-hit">
        <IconButton label="Back" icon="chevron-left" />
      </span>
      <span class="label ex-grow" style={{ "text-align": "center" }}>
        Launch plan
      </span>
      <span class="ex-hit">
        <IconButton label="Share" icon="link" />
      </span>
      <span class="ex-hit">
        <IconButton label="More" icon="more" />
      </span>
    </div>
  )
}
