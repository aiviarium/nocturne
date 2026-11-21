import { ICON_PATHS, Icon, type IconName } from "@aiviarium/nocturne"
import { For } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "The named set", surface: "none" }

/** Every icon @aiviarium/nocturne carries by name, each a Lucide icon. */
const CORE = (Object.keys(ICON_PATHS) as IconName[]).sort()

export default function CoreIcons() {
  return (
    <div class="ex-icons">
      <For each={CORE}>
        {(name) => (
          <div class="ex-tile">
            <Icon name={name} />
            <span class="nc-mono">{name}</span>
          </div>
        )}
      </For>
    </div>
  )
}
