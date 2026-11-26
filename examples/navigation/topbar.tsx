import {
  AppShell,
  ListRow,
  Nav,
  RowList,
  SidebarHeader,
  State,
  TitleBar,
  ViewHeader,
  ViewLayout,
} from "@aiviarium/nocturne"
import { createSignal, For } from "solid-js"
import { ISSUE_STATE } from "../_kit/issues"
import { ISSUE_VIEWS, issuesIn, PROJECTS } from "../_kit/projects"
import { projectPath } from "../_kit/shell"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "The title bar across the window",
  note: "The path, starting with the workspace and its switcher, sits in the title bar over the whole window; the sidebar under it holds only the places, and the view's header its title and actions. Choose a saved view: the view's title follows it.",
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
        sidebarLabel={project.name}
        foldBelow={0}
        titleBar={<TitleBar runsIn="browser" keys={false} path={projectPath(project.id, () => {})} />}
        sidebarHeader={<SidebarHeader />}
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
        <ViewLayout
          id="nav-topbar-issues"
          header={
            <ViewHeader
              title={label()}
              actions={[{ id: "new", label: "New issue", icon: "plus", onClick: () => {} }]}
            />
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
      </AppShell>
    </div>
  )
}
