import {
  ListRow,
  Nav,
  PropertyList,
  RowList,
  ShellPanel,
  State,
  Tabs,
  ViewHeader,
  ViewLayout,
} from "@aiviarium/nocturne"
import { createSignal, For, Show } from "solid-js"
import { ISSUE_STATE, ISSUES, STATE_NAME } from "../_kit/issues"
import { ISSUE_VIEWS, issuesIn } from "../_kit/projects"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Column states: docked, collapsed to the rail, over the main column",
  note: "Pick a width. Wide, the view sidebar docks beside the main column, with the details panel at the right. Narrower, the sidebar collapses behind its toggle. Opened by hand, it docks while the main column keeps 360px and opens over it below that. Select a row: the details follow the selection.",
  surface: "none",
}

const WIDTHS: Record<string, string> = { wide: "100%", medium: "640px", narrow: "440px" }

export default function Columns() {
  const [width, setWidth] = createSignal("wide")
  const [selected, setSelected] = createSignal("2")
  const issue = () => ISSUES.find((i) => i.id === selected())
  return (
    <div class="ex-columns">
      <Tabs
        label="Frame width"
        value={width()}
        onChange={setWidth}
        items={[
          { id: "wide", label: "Wide" },
          { id: "medium", label: "Medium" },
          { id: "narrow", label: "Narrow" },
        ]}
      />
      <div class="ex-view" style={{ height: "380px", "max-width": WIDTHS[width()] }}>
        <div class="ex-with-panel">
          <ViewLayout
            id="nav-columns"
            sidebarWidth={180}
            minMain={320}
            sidebarLabel="Issue views"
            sidebar={
              <Nav
                label="Issue views"
                groups={[
                  {
                    items: ISSUE_VIEWS.map((v) => ({
                      label: v.label,
                      icon: v.icon,
                      current: v.id === "active",
                      onClick: () => {},
                    })),
                  },
                ]}
              />
            }
            header={<ViewHeader title="Active" />}
          >
            <RowList label="Active issues">
              <For each={issuesIn("active")}>
                {(i) => {
                  const st = ISSUE_STATE[i.state]
                  return (
                    <ListRow
                      icon="list"
                      title={i.title}
                      secondary={i.key}
                      status={st ? <State status={st[0]}>{st[1]}</State> : undefined}
                      selected={selected() === i.id}
                      onClick={() => setSelected(i.id)}
                    />
                  )
                }}
              </For>
            </RowList>
          </ViewLayout>
          <ShellPanel at="right" title="Inspector">
            <Show when={issue()}>
              {(i) => (
                <div class="ex-col ex-pad">
                  <span class="label">{i().title}</span>
                  <PropertyList
                    items={[
                      { label: "State", value: STATE_NAME[i().state] },
                      { label: "Key", value: <span class="nc-mono">{i().key}</span> },
                    ]}
                  />
                </div>
              )}
            </Show>
          </ShellPanel>
        </div>
      </div>
    </div>
  )
}
