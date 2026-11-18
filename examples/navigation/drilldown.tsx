import {
  AppShell,
  Avatar,
  Button,
  Frame,
  IconButton,
  ListRow,
  MetaLine,
  Nav,
  PropertyList,
  RowList,
  SectionHeading,
  State,
  ViewHeader,
  ViewLayout,
} from "@aiviarium/nocturne"
import { createSignal, For, type JSX, Match, Show, Switch } from "solid-js"
import { ISSUE_STATE, ISSUES, type Issue, STATE_NAME } from "../_kit/issues"
import { ISSUE_VIEWS, issuesIn, PROJECTS } from "../_kit/projects"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Drilling down from projects to an issue",
  note: "Open Atlas web, then open an issue with its arrow. The shared sidebar stays and keeps its width (drag its edge); only the main column changes. The issues view has its own sidebar of saved views, and a selected row fills the inspector without changing the path. The crumbs show the full path on the list and a folded one on the issue.",
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
  const [width, setWidth] = createSignal(200)
  const [selected, setSelected] = createSignal("1")
  const project = PROJECTS[0]!
  const issueOf = (id: string) => ISSUES.find((i) => i.id === id)
  const toProjects = () => setPlace({ at: "projects" })
  const toIssues = (view = "active") => setPlace({ at: "issues", view })
  const open = (id: string) => setPlace({ at: "issue", issue: id })

  const projectCrumbs = [
    { label: "Projects", onClick: toProjects },
    { label: project.name, onClick: () => toIssues() },
  ]

  const views = (current?: string): JSX.Element => (
    <Nav
      label="Issue views"
      groups={[
        {
          items: ISSUE_VIEWS.map((v) => ({
            label: v.label,
            icon: v.icon,
            current: v.id === current,
            meta: String(issuesIn(v.id).length),
            onClick: () => toIssues(v.id),
          })),
        },
      ]}
    />
  )

  return (
    <div class="ex-screen">
      <AppShell
        fill
        sidebarLabel="Workspace"
        sidebarWidth={width()}
        onSidebarResize={setWidth}
        sidebar={
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
        }
      >
        <Frame flush class="ex-app-frame">
          <Switch>
            <Match when={place().at === "projects"}>
              <ViewLayout
                id="nav-drill-projects"
                header={
                  <ViewHeader
                    crumbs={[{ label: "Projects" }]}
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
              {(view) => (
                <ViewLayout
                  id="nav-drill-issues"
                  sidebarWidth={180}
                  minMain={360}
                  sidebarLabel="Issue views"
                  sidebar={views(view())}
                  header={
                    <ViewHeader
                      crumbs={[...projectCrumbs, { label: ISSUE_VIEWS.find((v) => v.id === view())!.label }]}
                      actions={[{ id: "new", label: "New issue", icon: "plus", onClick: () => {} }]}
                    />
                  }
                  asideLabel="Issue"
                  aside={
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
              )}
            </Match>
            <Match when={place().at === "issue" && issueOf((place() as { issue: string }).issue)}>
              {(i) => (
                <ViewLayout
                  id="nav-drill-issue"
                  sidebarWidth={180}
                  minMain={360}
                  sidebarLabel="Issue views"
                  sidebar={views()}
                  reading
                  header={
                    <ViewHeader
                      fold={1}
                      crumbs={[...projectCrumbs, { label: i().key }]}
                      actions={[{ id: "copy", label: "Copy link", icon: "link", onClick: () => {} }]}
                    />
                  }
                  asideLabel="Properties"
                  aside={
                    <div class="ex-col ex-pad">
                      <Properties issue={i()} />
                    </div>
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
              )}
            </Match>
          </Switch>
        </Frame>
      </AppShell>
    </div>
  )
}
