import { Mark } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Marks of places",
  note: "16px beside row icons, 20px in the sidebar header, 32px on a page. A letter, an icon or a logo; neutral, a hue, or filled for the product.",
}

export default function MarkSizes() {
  return (
    <div class="ex-col">
      <div class="nc-row ex-gap-lg">
        <Mark name="Rookery" hue="accent" solid size="sm" />
        <Mark name="Rookery" hue="accent" solid />
        <Mark name="Rookery" hue="accent" solid size="lg" />
      </div>
      <div class="nc-row ex-gap-lg">
        <Mark name="Design" />
        <Mark name="Atlas web" hue="sky" />
        <Mark name="Billing" hue="amber" />
        <Mark name="Research" hue="orchid" />
        <Mark name="Fleet" icon="server" hue="teal" />
        <Mark name="Ops" icon="terminal" />
      </div>
    </div>
  )
}
