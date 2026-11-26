import { TitleBar } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import { LENSES, projectPath } from "../_kit/shell"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A narrow window",
  note: "The box keeps the window's centre until it would come within 16px of the path or the right-hand items, then moves just enough. With still no room the path folds from the start into “…”, then the lenses drop their labels, then they fold into +N. The lens that is on always stays.",
  surface: "none",
}

export default function TitleBarNarrow() {
  const [width, setWidth] = createSignal(620)
  const [lens, setLens] = createSignal("build")
  return (
    <div class="ex-col">
      <div class="ex-window" style={{ width: `${width()}px`, "max-width": "100%" }}>
        <TitleBar
          path={projectPath("atlas", () => {}, ["Agents", "Review agent"])}
          lenses={LENSES}
          lens={lens()}
          onLensChange={setLens}
          windowControls={{ style: "mac" }}
          keys={false}
        />
        <div class="ex-window__body nc-meta">{width()}px</div>
      </div>
      <label class="ex-row nc-meta">
        Window width
        <input
          type="range"
          min="360"
          max="1100"
          value={width()}
          onInput={(e) => setWidth(Number(e.currentTarget.value))}
        />
      </label>
    </div>
  )
}
