import { ListRow, Nav, PropertyList, RowList, State, Tabs, ViewHeader, ViewLayout } from "@aiviarium/nocturne"
import { createSignal, For, Show } from "solid-js"
import { ISSUE_STATE, ISSUES, STATE_NAME } from "../_kit/issues"
import { ISSUE_VIEWS, issuesIn } from "../_kit/projects"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Column states: docked, collapsed to the rail, over the main column",
  note: "Pick a width. Wide, the view sidebar and the inspector dock beside the main column. Narrower, the inspector collapses behind its toggle, and the sidebar collapses to its rail. Opened by hand, a column docks while the main column keeps 360px and opens over it below that. Select a row: the inspector follows the selection and the crumbs stay.",
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
          header={<ViewHeader crumbs={[{ label: "Atlas web", onClick: () => {} }, { label: "Active" }]} />}
          asideLabel="Inspector"
          asideWidth={220}
          aside={
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
          }
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
      </div>
    </div>
  )
}
