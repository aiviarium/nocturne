import { WindowControls } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Mac and Windows styles",
  note: "The library draws the window's buttons at the title bar's right end on every platform; the app passes the handlers. Neutral at rest: the mac dots take their colours only while the group is hovered, and close turns red on Windows.",
  surface: "none",
}

export default function WindowControlsStyles() {
  const [last, setLast] = createSignal("Nothing pressed yet")
  const handlers = {
    onMinimise: () => setLast("Minimise"),
    onMaximise: () => setLast("Maximise"),
    onClose: () => setLast("Close"),
  }
  return (
    <div class="ex-col">
      <div class="ex-titlebar">
        <span class="nc-meta">Atlas web</span>
        <span class="ex-grow" />
        <WindowControls style="mac" {...handlers} />
      </div>
      <div class="ex-titlebar">
        <span class="nc-meta">Atlas web</span>
        <span class="ex-grow" />
        <WindowControls style="win" {...handlers} />
      </div>
      <span class="nc-meta">{last()}</span>
    </div>
  )
}
