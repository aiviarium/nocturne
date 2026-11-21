import { Dock, type DockLayout, dockAdd, dockLayout, dockRemove, dockSplit } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Tiled frames with tabs",
  note: "Drag a tab onto another frame's strip to move it, or onto a side of a frame to split it there. The split buttons open a new shell to the right or below. New tabs open in the focused frame, the one with the stronger edge.",
  surface: "well",
  height: 420,
}

const LINES: Record<string, string> = {
  build: "ops@build-01:~$ make release",
  logs: "ops@build-01:~$ journalctl -fu rookeryd",
  top: "ops@build-01:~$ htop",
}

export default function Tiles() {
  const [layout, setLayout] = createSignal<DockLayout>(
    (() => {
      const start = dockLayout(["build", "logs", "top"])
      return dockSplit(start, "logs", start.focused, "right")
    })(),
  )
  let next = 1
  const label = (id: string) => (LINES[id] ? id : `shell ${id.slice(1)}`)
  return (
    <div class="ex-dock">
      <Dock
        label="Shells on build-01"
        layout={layout()}
        onLayoutChange={setLayout}
        tab={(id) => ({ label: `ops · ${label(id)}` })}
        onClose={(id) => setLayout(dockRemove(layout(), id))}
        onNewTab={(frame) => setLayout(dockAdd(layout(), `s${next++}`, frame))}
        onSplit={(frame, edge) => {
          const id = `s${next++}`
          setLayout(dockSplit(dockAdd(layout(), id, frame), id, frame, edge))
        }}
      >
        {(id) => <pre class="nc-mono ex-pad">{LINES[id] ?? "ops@build-01:~$"}</pre>}
      </Dock>
    </div>
  )
}
