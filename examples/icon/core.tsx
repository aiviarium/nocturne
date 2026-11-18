import { ICON_PATHS, Icon, type IconName } from "@aiviarium/nocturne"
import { For } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Core set (48)", surface: "none" }

/** The core set: the icons drawn as path data. The rest of ICON_PATHS are Lucide icons @aiviarium/nocturne carries. */
const CORE = (Object.keys(ICON_PATHS) as IconName[]).filter((n) => typeof ICON_PATHS[n] === "string")

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
