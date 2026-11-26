import {
  Button,
  createHistory,
  HistoryArrows,
  memoryRouter,
  type StopInfo,
  Tabs,
  Trail,
} from "@aiviarium/nocturne"
import { For } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Back and forward over the stops",
  note: "Walk the places, switch lenses, then go back. A run of lens switches is one stop, and switching back to where the run began undoes it. The arrows name where they go; a long press or a right click lists the last ten stops. ⌘[ and ⌘] walk the same list.",
}

const LENSES = [
  { id: "explore", label: "Explore" },
  { id: "product", label: "Product" },
  { id: "build", label: "Build" },
]
const PLACES: Record<string, string[]> = {
  explore: ["map"],
  product: ["roadmap"],
  build: ["issues", "agents"],
}
const label = (id: string) => id[0]!.toUpperCase() + id.slice(1)

export default function HistoryWalk() {
  const router = memoryRouter("/projects")
  // A scope's address without a lens means "the lens worn last"; describe spells it out in full.
  let worn = "build"
  const describe = (path: string): StopInfo | undefined => {
    const [, root, item, lens, place, record] = path.split("/")
    if (root !== "projects") return undefined
    if (!item) return { path, frame: "projects", label: "Projects", icon: "folder" }
    const l = lens ?? worn
    worn = l
    const p = place ?? PLACES[l]![0]!
    const full = `/projects/${item}/${l}/${p}${record ? `/${record}` : ""}`
    return {
      path: full,
      frame: `projects/${item}`,
      label: record ?? `${label(l)} · ${label(p)}`,
      scope: "Atlas web",
      mark: { name: "Atlas web", hue: "sky" },
    }
  }
  const history = createHistory({ router, describe })
  const parts = () => router.path().split("/").slice(1)
  const lens = () => parts()[2]
  const go = (path: string) => history.navigate(path)
  return (
    <div class="ex-col">
      <div class="ex-row">
        <HistoryArrows history={history} />
        <Trail
          label="Path"
          crumbs={[
            { label: "Projects", onClick: () => go("/projects") },
            ...(parts()[1] ? [{ label: "Atlas web", onClick: () => go("/projects/atlas") }] : []),
            ...(parts()[3]
              ? [{ label: label(parts()[3]!), onClick: () => go(`/projects/atlas/${lens()}/${parts()[3]}`) }]
              : []),
            ...(parts()[4] ? [{ label: parts()[4]! }] : []),
          ]}
        />
      </div>
      <div class="ex-row">
        <Button size="sm" onClick={() => go("/projects/atlas")}>
          Atlas web
        </Button>
        <Button size="sm" onClick={() => go("/projects/atlas/build/issues/WEB-139")}>
          WEB-139
        </Button>
        <Button size="sm" onClick={() => go("/projects/atlas/build/agents")}>
          Agents
        </Button>
        <Button size="sm" onClick={() => go("/projects/atlas/build/agents/Review agent")}>
          Review agent
        </Button>
      </div>
      <Tabs
        label="Lens"
        items={LENSES}
        value={lens() ?? ""}
        onChange={(id) => (parts()[1] ? history.switchLens(`/projects/atlas/${id}`) : undefined)}
      />
      <ol class="ex-stops nc-meta">
        <For each={history.stops()}>
          {(s, i) => (
            <li data-here={i() === history.index() ? "" : undefined}>
              {s.label} <span class="nc-mono">{s.path}</span>
            </li>
          )}
        </For>
      </ol>
    </div>
  )
}
