import { Icon } from "@aiviarium/nocturne"
import { Camera, Cloud, Cpu, Database, Globe, Zap } from "lucide"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Sizes and Lucide fallback",
  note: "13px in chips, menus and cells, 16px in buttons and navigation, 20px in empty states. Lucide icons are drawn with the same stroke weight as the core set at every size.",
}

export default function IconSizes() {
  return (
    <div class="nc-row ex-gap-lg">
      <Icon name="server" size="sm" />
      <Icon name="server" />
      <Icon name="server" size="lg" />
      <Icon node={Camera} />
      <Icon node={Cloud} />
      <Icon node={Cpu} />
      <Icon node={Database} />
      <Icon node={Globe} size="lg" />
      <Icon node={Zap} label="Lucide zap" />
    </div>
  )
}
