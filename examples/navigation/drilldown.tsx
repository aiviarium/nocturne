import {
  AppShell,
  Avatar,
  Button,
  IconButton,
  ListRow,
  MetaLine,
  Nav,
  PropertyList,
  RowList,
  SectionHeading,
  ShellPanel,
  SidebarHeader,
  State,
  ViewHeader,
  ViewLayout,
} from "@aiviarium/nocturne"
import { createSignal, For, Match, Show, Switch } from "solid-js"
import { ISSUE_STATE, ISSUES, type Issue, STATE_NAME } from "../_kit/issues"
import { ISSUE_VIEWS, issuesIn, PROJECTS } from "../_kit/projects"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Drilling down from projects to an issue",
  note: "Open Atlas web, then open an issue with its arrow. The sidebar drills down with the main column. Its header row has ↑ once you are inside a project, the filter and the minimise button, which folds the sidebar to its icon rail. Inside a project the sidebar shows the project's places. Each view keeps its title or trail and its actions in its own header.",
  surface: "none",
  frame: "A whole app window: the shared sidebar and a view beside it.",
  height: 560,
}

type Place = { at: "projects" } | { at: "issues"; view: string } | { at: "issue"; issue: string }

function Properties(props: { issue: Issue }) {
  return (
    <PropertyList
      items={[
        { label: "State", value: STATE_NAME[props.issue.state] },
        {
          label: "Assignee",
          value: props.issue.assignee ? (
            <span class="nc-person">
              <Avatar name={props.issue.assignee} size="sm" />
              <span>{props.issue.assignee}</span>
            </span>
          ) : (
            ""
          ),
        },
        { label: "Key", value: <span class="nc-mono">{props.issue.key}</span> },
      ]}
    />
  )
}

export default function Drilldown() {
  const [place, setPlace] = createSignal<Place>({ at: "projects" })
  const [selected, setSelected] = createSignal("1")
  const project = PROJECTS[0]!
  const issueOf = (id: string) => ISSUES.find((i) => i.id === id)
  const toProjects = () => setPlace({ at: "projects" })
  const toIssues = (view = "active") => setPlace({ at: "issues", view })
  const open = (id: string) => setPlace({ at: "issue", issue: id })

  // The sidebar drills down with the main column. Its header row holds ↑ (inside a project), the filter and the
  // minimise button; the title bar's path names the place.
  const view = () => {
    const p = place()
    return p.at === "issues" ? p.view : undefined
  }
  const inside = () => place().at !== "projects"
  const header = () => (
    <SidebarHeader up={inside() ? { label: "Projects", onClick: toProjects } : undefined} />
  )
  const appNav = () => (
    <Nav
      label="Workspace"
      groups={[
        {
          items: [
            { label: "Home", icon: "home", onClick: () => {} },
            { label: "Inbox", icon: "inbox", onClick: () => {} },
            { label: "Agents", icon: "agent", onClick: () => {} },
            { label: "Projects", icon: "board", current: true, onClick: toProjects },
          ],
        },
      ]}
    />
  )
  const projectNav = () => (
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
            onClick: () => toIssues(v.id),
          })),
        },
        {
          items: [
            { label: "Board", icon: "board", onClick: () => {} },
            { label: "Settings", icon: "settings", onClick: () => {} },
          ],
        },
      ]}
    />
  )

  return (
    <div class="ex-screen">
      <AppShell
        sidebarLabel="Workspace"
        foldBelow={0}
        sidebarHeader={header()}
        sidebar={inside() ? projectNav() : appNav()}
      >
        <Switch>
          <Match when={place().at === "projects"}>
            <ViewLayout
              id="nav-drill-projects"
              header={
                <ViewHeader
                  title="Projects"
                  actions={[{ id: "new", label: "New project", icon: "plus", onClick: () => {} }]}
                />
              }
            >
              <RowList label="Projects">
                <For each={PROJECTS}>
                  {(p) => (
                    <ListRow
                      icon="board"
                      title={p.name}
                      secondary={p.key}
                      meta={p.updated}
                      onClick={() => toIssues()}
                    />
                  )}
                </For>
              </RowList>
            </ViewLayout>
          </Match>
          <Match when={place().at === "issues" && (place() as { view: string }).view}>
            {(current) => (
              <div class="ex-with-panel">
                <ViewLayout
                  id="nav-drill-issues"
                  minMain={360}
                  header={
                    <ViewHeader
                      title={ISSUE_VIEWS.find((v) => v.id === current())!.label}
                      actions={[{ id: "new", label: "New issue", icon: "plus", onClick: () => {} }]}
                    />
                  }
                >
                  <RowList label="Issues">
                    <For each={issuesIn(current())}>
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
                            actions={
                              <IconButton
                                size="sm"
                                icon="arrow-up-right"
                                label={`Open ${i.key}`}
                                onClick={(e: MouseEvent) => {
                                  e.stopPropagation()
                                  open(i.id)
                                }}
                              />
                            }
                          />
                        )
                      }}
                    </For>
                  </RowList>
                </ViewLayout>
                <ShellPanel at="right" title="Issue">
                  <Show when={issueOf(selected())}>
                    {(i) => (
                      <div class="ex-col ex-pad">
                        <span class="label">{i().title}</span>
                        <Properties issue={i()} />
                        <Button size="sm" icon="arrow-up-right" onClick={() => open(i().id)}>
                          Open
                        </Button>
                      </div>
                    )}
                  </Show>
                </ShellPanel>
              </div>
            )}
          </Match>
          <Match when={place().at === "issue" && issueOf((place() as { issue: string }).issue)}>
            {(i) => (
              <div class="ex-with-panel">
                <ViewLayout
                  id="nav-drill-issue"
                  minMain={360}
                  reading
                  header={
                    <ViewHeader
                      trail={[{ label: "Issues", onClick: () => toIssues() }, { label: i().key }]}
                      actions={[{ id: "copy", label: "Copy link", icon: "link", onClick: () => {} }]}
                    />
                  }
                >
                  <div class="ex-col ex-pad">
                    <MetaLine items={[{ label: i().key, mono: true }, `updated ${i().updated} ago`]} />
                    <h2 class="heading ex-h">{i().title}</h2>
                    <SectionHeading title="Description" />
                    <p class="nc-muted">
                      The runner times out on the second deploy step about one run in five.
                    </p>
                  </div>
                </ViewLayout>
                <ShellPanel at="right" title="Properties">
                  <div class="ex-col ex-pad">
                    <Properties issue={i()} />
                  </div>
                </ShellPanel>
              </div>
            )}
          </Match>
        </Switch>
      </AppShell>
    </div>
  )
}
