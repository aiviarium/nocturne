import { createStoredWidth, memoryStorage, ResizeHandle } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Resizable borders",
  note: "Hover a border: after a moment its hairline brightens. Drag it, or focus it and use the arrow keys (Shift for bigger steps), Home and End. Double-click resets. Only the handle being dragged lights up, and each width is remembered in the store the app passes.",
  surface: "none",
}

const storage = memoryStorage()

export default function ResizeColumns() {
  const list = createStoredWidth("example/inbox-list", { initial: 220, min: 160, max: 360, storage })
  const props = createStoredWidth("example/properties", { initial: 200, min: 160, max: 320, storage })
  const bottom = createStoredWidth("example/bottom-panel", { initial: 96, min: 60, max: 180, storage })
  return (
    <div class="ex-view ex-resize">
      <div class="ex-resize__top">
        <div class="ex-resize__col" style={{ width: `${list.value()}px` }}>
          <span class="nc-meta">List · {list.value()}px</span>
          <ResizeHandle at="right" size={list} label="Resize list" />
        </div>
        <div class="ex-resize__main nc-muted">Reader</div>
        <div class="ex-resize__col ex-resize__col--end" style={{ width: `${props.value()}px` }}>
          <ResizeHandle at="left" size={props} label="Resize properties" />
          <span class="nc-meta">Properties · {props.value()}px</span>
        </div>
      </div>
      <div class="ex-resize__bottom" style={{ height: `${bottom.value()}px` }}>
        <ResizeHandle at="top" size={bottom} label="Resize bottom panel" />
        <span class="nc-meta">Bottom panel · {bottom.value()}px</span>
      </div>
    </div>
  )
}
