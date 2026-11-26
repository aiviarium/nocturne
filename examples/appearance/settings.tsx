import {
  AppearanceSettings,
  Button,
  createAppearance,
  type LensHue,
  memoryStorage,
  Switch,
  Tabs,
} from "@aiviarium/nocturne"
import { createSignal, onSettled } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Appearance",
  note: "Settings › Appearance. The theme applies at once; the accent follows the lens that is on unless it is turned off. Here the settings apply to this box; an app leaves `root` out and they apply to the whole window.",
  surface: "none",
}

const LENSES: Array<{ id: string; label: string; hue: LensHue }> = [
  { id: "explore", label: "Explore", hue: "sky" },
  { id: "product", label: "Product", hue: "orchid" },
  { id: "build", label: "Build", hue: "mint" },
]

export default function AppearanceExample() {
  let box: HTMLDivElement | undefined
  const [lens, setLens] = createSignal("build")
  const appearance = createAppearance({ storage: memoryStorage(), root: () => box })
  appearance.follow(() => LENSES.find((l) => l.id === lens())?.hue)
  // The box starts in the theme of the page around it, then takes what the settings choose.
  onSettled(() => {
    box?.setAttribute(
      "data-theme",
      box.parentElement?.closest("[data-theme]")?.getAttribute("data-theme") ?? "dark",
    )
    appearance.apply()
  })
  return (
    <div
      class="ex-view ex-appearance"
      ref={(el) => {
        box = el
      }}
    >
      <div class="ex-view__body">
        <AppearanceSettings appearance={appearance} />
        <div class="ex-row">
          <Tabs label="Lens" items={LENSES} value={lens()} onChange={setLens} />
          <span class="ex-grow" />
          <Switch aria-label="Example switch" defaultChecked />
          <Button variant="accent" size="sm">
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}
