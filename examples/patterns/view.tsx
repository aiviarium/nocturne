import {
  Avatar,
  ListRow,
  Nav,
  PropertyList,
  RowList,
  State,
  ViewHeader,
  ViewLayout,
} from "@aiviarium/nocturne"
import { createSignal, For, Show } from "solid-js"
import { ISSUE_STATE, ISSUES, STATE_NAME } from "../_kit/issues"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A view: sidebar, header, main column and panel",
  note: "ViewLayout lays out the view's own navigation, its main column and a secondary panel; ViewHeader holds crumbs and actions in one order. Drag the edge of the sidebar or the panel to resize it, and click an edge or a header toggle to hide or show it; opened by hand, a column docks beside the main column while the main column keeps 360px, and opens over it only below that. In the shell, Alt B and Alt Shift B toggle them.",
  surface: "none",
}

export default function IssuesView() {
  const [selected, setSelected] = createSignal("1")
  const issue = () => ISSUES.find((i) => i.id === selected())
  return (
    <div class="ex-view" style={{ height: "480px" }}>
      <ViewLayout
        id="docs-example-issues"
        sidebarLabel="Issue views"
        sidebar={
          <Nav
            label="Issue views"
            groups={[
              {
                items: [
                  { label: "Active", icon: "list", href: "#v", current: true },
                  { label: "Backlog", icon: "layers", href: "#v" },
                  { label: "Mine", icon: "user", href: "#v" },
                ],
              },
            ]}
          />
        }
        header={
          <ViewHeader
            crumbs={[{ label: "Atlas web", href: "#v" }, { label: "Active" }]}
            actions={[
              { id: "filter", label: "Filter", icon: "filter", onClick: () => {} },
              { id: "export", label: "Export as CSV", overflow: true, onClick: () => {} },
              { id: "new", label: "New issue", icon: "plus", onClick: () => {} },
            ]}
          />
        }
        asideLabel="Issue"
        aside={
          <Show when={issue()}>
            {(i) => (
              <div class="ex-col ex-pad">
                <span class="label">{i().title}</span>
                <PropertyList
                  items={[
                    { label: "State", value: STATE_NAME[i().state] },
                    {
                      label: "Assignee",
                      value: i().assignee ? (
                        <span class="nc-person">
                          <Avatar name={i().assignee!} size="sm" />
                          <span>{i().assignee}</span>
                        </span>
                      ) : (
                        ""
                      ),
                    },
                    { label: "Key", value: <span class="nc-mono">{i().key}</span> },
                  ]}
                />
              </div>
            )}
          </Show>
        }
      >
        <RowList label="Active issues">
          <For each={ISSUES.filter((i) => i.state !== "done" && i.state !== "backlog")}>
            {(i) => {
              const st = ISSUE_STATE[i.state]
              return (
                <ListRow
                  icon="list"
                  title={i.title}
                  secondary={i.key}
                  status={st ? <State status={st[0]}>{st[1]}</State> : undefined}
                  meta={i.updated}
                  unread={Boolean(i.unread)}
                  selected={selected() === i.id}
                  onClick={() => setSelected(i.id)}
                />
              )
            }}
          </For>
        </RowList>
      </ViewLayout>
    </div>
  )
}
