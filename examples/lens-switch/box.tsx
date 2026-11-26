import { type LensPrefs, ScopeBox } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import { LENSES } from "../_kit/shell"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "The scope box and its lenses",
  note: "The magnifier at the box's left end opens the palette; the lenses follow. The lens that is on is a raised neutral segment with its icon in its hue; nothing else about it changes. The ⌄ menu lists the lenses that are hidden and opens Customise, where each can be hidden or moved (drag, or Alt and an arrow).",
  surface: "well",
}

export default function LensSwitchBox() {
  const [lens, setLens] = createSignal("build")
  const [prefs, setPrefs] = createSignal<LensPrefs>({ order: [], hidden: ["operate"] })
  const [searched, setSearched] = createSignal(0)
  return (
    <div class="ex-col">
      <div class="ex-row">
        <ScopeBox
          scope="Atlas web"
          lenses={LENSES}
          lens={lens()}
          onLensChange={setLens}
          lensPrefs={prefs()}
          onLensPrefsChange={setPrefs}
          onSearch={() => setSearched((n) => n + 1)}
          keys={false}
        />
      </div>
      <div class="ex-row">
        <ScopeBox
          scope="Atlas web"
          lenses={LENSES}
          lens={lens()}
          onLensChange={setLens}
          compact
          squeeze={2}
          keys={false}
        />
      </div>
      <div class="ex-row">
        <ScopeBox scope="Docs" onSearch={() => setSearched((n) => n + 1)} />
      </div>
      <span class="nc-meta">
        {LENSES.find((l) => l.id === lens())?.label} is on · search opened {searched()} times
      </span>
    </div>
  )
}
