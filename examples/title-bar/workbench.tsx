import {
  createHistory,
  type LensPrefs,
  memoryRouter,
  type StopInfo,
  Tabs,
  TitleBar,
  TitleBarItem,
} from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import { LENSES, projectActions, projectPath, projectSearch } from "../_kit/shell"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "The title bar",
  note: "The app icon, the history arrows (desktop only) and the path at the left; the scope box on the window's centre; status and the window controls at the right. Switch lenses (⌘1 to ⌘4): the line under the bar takes the lens's hue, strongest under the lens that is on. ⌘K or the magnifier opens the palette over the box. In a browser tab the arrows, the controls and the drag region go.",
  surface: "none",
}

export default function TitleBarWorkbench() {
  const [runsIn, setRunsIn] = createSignal<"desktop" | "browser">("desktop")
  const [style, setStyle] = createSignal<"mac" | "win">("mac")
  const [prefs, setPrefs] = createSignal<LensPrefs>({ order: [], hidden: [] })
  const [last, setLast] = createSignal("Nothing run yet")

  const router = memoryRouter("/atlas/build")
  const describe = (path: string): StopInfo => {
    const [, p, l] = path.split("/")
    return { path, frame: p, label: LENSES.find((x) => x.id === l)?.label ?? "Atlas web", scope: p }
  }
  const history = createHistory({ router, describe, keys: false })
  // The address is the truth: back and forward bring the project and the lens back with it.
  const parts = () => (history.here()?.path ?? "/atlas/build").split("/")
  const project = () => parts()[1] ?? "atlas"
  const lens = () => parts()[2] ?? "build"
  const wear = (id: string) => history.switchLens(`/${project()}/${id}`)

  return (
    <div class="ex-col">
      <div class="ex-window">
        <TitleBar
          runsIn={runsIn()}
          icon="sparkle"
          history={history}
          path={projectPath(project(), (id) => history.navigate(`/${id}/${lens()}`))}
          lenses={LENSES}
          lens={lens()}
          onLensChange={wear}
          lensPrefs={prefs()}
          onLensPrefsChange={setPrefs}
          palette={{
            search: projectSearch(project(), lens(), (what) => setLast(`Opened ${what}`)),
            actions: projectActions((what) => setLast(`Ran ${what}`)),
            workspace: "Acme",
          }}
          status={
            <TitleBarItem
              icon="webhook"
              label="1 failing"
              tone="warning"
              tooltip="Webhooks: 3 endpoints, 1 failing"
              onClick={() => setLast("Opened Webhooks")}
            />
          }
          windowControls={{ style: style() }}
        />
        <div class="ex-window__body nc-meta">{last()}</div>
      </div>
      <div class="ex-row ex-gap-lg">
        <Tabs
          label="Runs in"
          items={[
            { id: "desktop", label: "Desktop window" },
            { id: "browser", label: "Browser tab" },
          ]}
          value={runsIn()}
          onChange={(id) => setRunsIn(id as "desktop" | "browser")}
        />
        <Tabs
          label="Window controls"
          items={[
            { id: "mac", label: "macOS" },
            { id: "win", label: "Windows" },
          ]}
          value={style()}
          onChange={(id) => setStyle(id as "mac" | "win")}
        />
      </div>
    </div>
  )
}
