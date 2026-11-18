import { Icon } from "@aiviarium/nocturne"
import { ChartColumn, Clock, Folder, Search, Server, Settings } from "lucide"
import { For } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Core next to Lucide",
  note: "Each pair at 13, 16 and 20px: core icon, then the Lucide one. The strokes should read as one weight.",
}

export default function IconPairs() {
  return (
    <div class="ex-col" data-part="icon-pairs">
      <For each={["sm", "md", "lg"] as const}>
        {(size) => (
          <div class="nc-row ex-gap-lg">
            <Icon name="server" size={size} />
            <Icon node={Server} size={size} />
            <Icon name="chart" size={size} />
            <Icon node={ChartColumn} size={size} />
            <Icon name="clock" size={size} />
            <Icon node={Clock} size={size} />
            <Icon name="settings" size={size} />
            <Icon node={Settings} size={size} />
            <Icon name="folder" size={size} />
            <Icon node={Folder} size={size} />
            <Icon name="search" size={size} />
            <Icon node={Search} size={size} />
          </div>
        )}
      </For>
    </div>
  )
}
