import {
  AppShell,
  Frame,
  ListRow,
  Nav,
  RowList,
  State,
  TextField,
  ViewHeader,
  ViewLayout,
} from "@aiviarium/nocturne"
import { createSignal, For } from "solid-js"
import { ISSUE_STATE } from "../_kit/issues"
import { ISSUE_VIEWS, issuesIn, PROJECTS } from "../_kit/projects"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A top bar across the window",
  note: "For a workspace that needs room for its own columns, such as an editor. The path, starting with the workspace and its switcher, a search in the middle and the view's actions sit in one bar over the whole window, and the sidebar under it holds only the places. Choose a saved view: the path in the bar follows it.",
  surface: "none",
  frame: "A whole app window: the top bar, the sidebar and a view.",
  height: 460,
}

export default function Topbar() {
  const [view, setView] = createSignal("active")
  const project = PROJECTS[0]!
  const label = () => ISSUE_VIEWS.find((v) => v.id === view())!.label
  return (
    <div class="ex-screen">
      <AppShell
        fill
        headerPlacement="across"
        sidebarLabel={project.name}
        sidebarWidth={200}
        sidebar={
          <Nav
            label={project.name}
            groups={[
              {
                label: "Issues",
                items: ISSUE_VIEWS.map((v) => ({
                  label: v.label,
                  icon: v.icon,
                  current: v.id === view(),
                  meta: String(issuesIn(v.id).length),
                  onClick: () => setView(v.id),
                })),
              },
            ]}
          />
        }
      >
        <Frame flush class="ex-app-frame">
          <ViewLayout
            id="nav-topbar-issues"
            header={
              <ViewHeader
                variant="shell"
                crumbs={[
                  {
                    label: "Acme",
                    mark: <span class="nc-nav-item__mark">A</span>,
                    switcher: {
                      label: "Switch workspace",
                      items: [
                        { id: "acme", label: "Acme" },
                        { id: "personal", label: "Personal" },
                      ],
                      onSelect: () => {},
                    },
                  },
                  { label: "Projects", onClick: () => {} },
                  { label: project.name, onClick: () => setView("active") },
                  { label: label() },
                ]}
                actions={[{ id: "new", label: "New issue", icon: "plus", onClick: () => {} }]}
              >
                <TextField
                  variant="search"
                  label="Search"
                  placeholder="Search issues and commands"
                  kbd="Ctrl K"
                />
              </ViewHeader>
            }
          >
            <RowList label="Issues">
              <For each={issuesIn(view())}>
                {(i) => {
                  const st = ISSUE_STATE[i.state]
                  return (
                    <ListRow
                      icon="list"
                      title={i.title}
                      secondary={i.key}
                      status={st ? <State status={st[0]}>{st[1]}</State> : undefined}
                    />
                  )
                }}
              </For>
            </RowList>
          </ViewLayout>
        </Frame>
      </AppShell>
    </div>
  )
}
