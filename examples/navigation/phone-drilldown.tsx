import {
  AppShell,
  InsetGroup,
  InsetList,
  InsetRow,
  Nav,
  NavigationScreen,
  NavigationStack,
  PropertyList,
  State,
} from "@aiviarium/nocturne"
import { createSignal, For, Match, Switch } from "solid-js"
import { ISSUE_STATE, ISSUES, STATE_NAME } from "../_kit/issues"
import { issuesIn, PROJECTS } from "../_kit/projects"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "The same drill-down on a phone",
  note: "The shared sidebar is a drawer behind the bar's sidebar button. Each level is a screen of the stack, the list has a large title, and the back control names the screen before. No crumbs are shown.",
  phone: true,
  screen: true,
  height: 760,
}

type Level = { id: string; title: string; kind: "projects" | "issues" | "issue"; issue?: string }

export default function PhoneDrilldown() {
  const [drawer, setDrawer] = createSignal(false)
  const [stack, setStack] = createSignal<Level[]>([{ id: "projects", title: "Projects", kind: "projects" }])
  const push = (level: Level) => setStack((s) => [...s, level])
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s))
  const issueOf = (id?: string) => ISSUES.find((i) => i.id === id)
  return (
    <div class="ex-phone-app">
      <AppShell
        fill
        sidebarLabel="Workspace"
        drawerOpen={drawer()}
        onDrawerClose={() => setDrawer(false)}
        sidebar={
          <Nav
            label="Workspace"
            groups={[
              {
                items: [
                  { label: "Home", icon: "home", onClick: () => setDrawer(false) },
                  { label: "Inbox", icon: "inbox", onClick: () => setDrawer(false) },
                  { label: "Agents", icon: "agent", onClick: () => setDrawer(false) },
                  { label: "Projects", icon: "board", current: true, onClick: () => setDrawer(false) },
                ],
              },
            ]}
          />
        }
      >
        <NavigationStack items={stack()} getKey={(s) => s.id} onBack={back} label="Projects">
          {(s, i) => (
            <NavigationScreen
              title={s().title}
              largeTitle={s().kind !== "issue"}
              level={i() === 0 ? "index" : "main"}
              back={i() > 0 ? { label: stack()[i() - 1]!.title, onClick: back } : undefined}
              actions={
                i() === 0
                  ? [
                      {
                        id: "sidebar",
                        label: "Show the sidebar",
                        icon: "sidebar",
                        onClick: () => setDrawer(true),
                      },
                    ]
                  : []
              }
            >
              <Switch>
                <Match when={s().kind === "projects"}>
                  <InsetList>
                    <InsetGroup>
                      <For each={PROJECTS}>
                        {(p) => (
                          <InsetRow
                            label={p.name}
                            detail={p.key}
                            value={p.updated}
                            onClick={() => push({ id: p.id, title: p.name, kind: "issues" })}
                          />
                        )}
                      </For>
                    </InsetGroup>
                  </InsetList>
                </Match>
                <Match when={s().kind === "issues"}>
                  <InsetList>
                    <InsetGroup title="Active">
                      <For each={issuesIn("active")}>
                        {(issue) => {
                          const st = ISSUE_STATE[issue.state]
                          return (
                            <InsetRow
                              label={issue.title}
                              detail={issue.key}
                              value={st ? <State status={st[0]}>{st[1]}</State> : undefined}
                              onClick={() =>
                                push({ id: issue.id, title: issue.key, kind: "issue", issue: issue.id })
                              }
                            />
                          )
                        }}
                      </For>
                    </InsetGroup>
                  </InsetList>
                </Match>
                <Match when={issueOf(s().issue)}>
                  {(issue) => (
                    <div class="ex-screen-body">
                      <p class="ex-phone-body">{issue().title}</p>
                      <PropertyList
                        items={[
                          { label: "State", value: STATE_NAME[issue().state] },
                          { label: "Assignee", value: issue().assignee ?? "" },
                        ]}
                      />
                    </div>
                  )}
                </Match>
              </Switch>
            </NavigationScreen>
          )}
        </NavigationStack>
      </AppShell>
    </div>
  )
}
