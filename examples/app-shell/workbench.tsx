import {
  AccountMenu,
  AppShell,
  Avatar,
  createHistory,
  EmptyState,
  ListRow,
  memoryRouter,
  memoryStorage,
  Nav,
  type NavGroup,
  PanelRail,
  PropertyList,
  type RailPanel,
  RowList,
  ShellPanel,
  type ShellPanelTab,
  SidebarHeader,
  State,
  type StopInfo,
  TitleBar,
  TitleBarItem,
  ViewHeader,
} from "@aiviarium/nocturne"
import { createMemo, createSignal, For, Show } from "solid-js"
import { ISSUE_STATE, ISSUES, type Issue, STATE_NAME } from "../_kit/issues"
import { PROJECTS } from "../_kit/projects"
import { LENSES, projectActions, projectPath, projectSearch } from "../_kit/shell"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "The app shell",
  note: "The title bar across the window; the sidebar with its header (↑, the filter, collapse all, minimise) and the lens's places; the raised view surface to the bottom edge; docked panels picked from the rail at the right edge. Drag the sidebar's edge below 140px, press ⌘B or its minimise button to fold it to the icon rail. Open an issue: its header is the trail with a record switcher and the ↑/↓ stepper. The Logs place covers the Logs panel, so the rail drops it there.",
  surface: "none",
}

const STORAGE = memoryStorage()

/** The places each lens shows in the sidebar. The first is where the lens opens. */
const PLACES: Record<
  string,
  Array<{ id: string; label: string; icon: NavGroup["items"][number]["icon"] }>
> = {
  explore: [
    { id: "map", label: "Map", icon: "grid" },
    { id: "notes", label: "Notes", icon: "file" },
  ],
  product: [
    { id: "roadmap", label: "Roadmap", icon: "calendar" },
    { id: "specs", label: "Specs", icon: "book-open" },
  ],
  build: [
    { id: "issues", label: "Issues", icon: "list" },
    { id: "cycles", label: "Cycles", icon: "refresh-cw" },
    { id: "prs", label: "Pull requests", icon: "git-pull-request" },
    { id: "agents", label: "Agents", icon: "agent" },
  ],
  operate: [
    { id: "hosts", label: "Hosts", icon: "server" },
    { id: "logs", label: "Logs", icon: "logs" },
  ],
}

const VIEWS = [
  { id: "active", label: "Active", test: (i: Issue) => i.state !== "done" && i.state !== "backlog" },
  { id: "backlog", label: "Backlog", test: (i: Issue) => i.state === "backlog" },
  { id: "all", label: "All issues", test: () => true },
]

const PANELS: RailPanel[] = [
  { id: "details", label: "Details", icon: "panel-right", at: "right", shortcut: "⌥ D" },
  { id: "comments", label: "Comments", icon: "chat", at: "right", shortcut: "⌥ C" },
  { id: "terminal", label: "Terminal", icon: "terminal", at: "bottom", shortcut: "⌃ `" },
  { id: "logs", label: "Logs", icon: "logs", at: "bottom", shortcut: "⌥ L" },
]

const LOGS = [
  "17:42:01 info  deploy  web@4f2a1c rolling out to 3 hosts",
  "17:42:09 info  deploy  build-01 healthy",
  "17:42:31 warn  deploy  build-02 healthcheck slow (28s)",
  "17:43:02 error deploy  build-03 healthcheck timed out after 30s",
  "17:43:04 info  deploy  rolled back build-03",
]

interface Where {
  project?: string
  lens: string
  place: string
  view?: string
  record?: string
}

/** `/atlas/build/issues/active/WEB-142`, or `/projects` for the workspace. */
function parse(path: string): Where {
  const [, project, lens = "build", place, view, record] = path.split("/")
  if (!project || project === "projects") return { lens: "", place: "projects" }
  return { project, lens, place: place ?? PLACES[lens]?.[0]?.id ?? "issues", view, record }
}

export default function AppShellWorkbench() {
  const router = memoryRouter("/atlas/build/issues/active")
  const describe = (path: string): StopInfo => {
    const w = parse(path)
    const project = PROJECTS.find((p) => p.id === w.project)
    const place = PLACES[w.lens]?.find((p) => p.id === w.place)
    const lens = LENSES.find((l) => l.id === w.lens)
    return {
      path,
      frame: w.project ?? "acme",
      label: w.record ?? [lens?.label, place?.label].filter(Boolean).join(" · ") ?? "Projects",
      scope: project?.name ?? "Acme",
    }
  }
  const history = createHistory({ router, describe, keys: false, storage: STORAGE })
  const here = createMemo(() => parse(history.here()?.path ?? router.path()))
  const go = (w: Partial<Where>) => {
    const next = { ...here(), ...w }
    if (!next.project) return history.navigate("/projects")
    const parts = [next.project, next.lens, next.place, next.view, next.record].filter(Boolean)
    history.navigate(`/${parts.join("/")}`)
  }

  // ── Panels: one open on each side, a terminal with its sessions as tabs ─────────────────────────────
  const [open, setOpen] = createSignal<{ right?: string; bottom?: string }>({ right: "details" })
  const toggle = (id: string) => {
    const p = PANELS.find((x) => x.id === id)
    if (!p) return
    setOpen((o) => ({ ...o, [p.at]: o[p.at] === id ? undefined : id }))
  }
  const close = (at: "right" | "bottom") => setOpen((o) => ({ ...o, [at]: undefined }))
  const covers = () => (here().place === "logs" ? ["logs"] : [])

  const [tabs, setTabs] = createSignal<ShellPanelTab[]>([
    { id: "s1", label: "Coding agent", status: "running" },
    { id: "s2", label: "npm test", status: "input" },
    { id: "s3", label: "build", status: "failed", detail: "exit 1" },
  ])
  const [tab, setTab] = createSignal("s1")
  let made = 0
  const newTab = () => {
    made += 1
    const id = `new${made}`
    setTabs((t) => [...t, { id, label: made === 1 ? "zsh" : `zsh ${made}`, status: "running" }])
    setTab(id)
  }
  const closeTabs = (ids: string[]) => {
    const left = tabs().filter((t) => !ids.includes(t.id))
    setTabs(left)
    if (ids.includes(tab())) setTab(left[0]?.id ?? "")
  }

  // ── The view: the lens's place, an issue list, or one issue ─────────────────────────────────────────
  const view = () => VIEWS.find((v) => v.id === here().view) ?? VIEWS[0]!
  const list = () => ISSUES.filter(view().test)
  const record = () => ISSUES.find((i) => i.key === here().record)
  const subject = () => record()
  const at = () => list().findIndex((i) => i.key === here().record)
  const placeLabel = () => PLACES[here().lens]?.find((p) => p.id === here().place)?.label ?? "Projects"

  // ── The sidebar: the lens's places; Issues holds its saved views ────────────────────────────────────
  const [filter, setFilter] = createSignal("")
  const [collapsed, setCollapsed] = createSignal<string[]>([])
  const groups = (): NavGroup[] => {
    const w = here()
    if (!w.project)
      return [
        {
          items: [
            { label: "Inbox", icon: "inbox", count: 3, href: "#app-shell" },
            { label: "Projects", icon: "folder", current: true, href: "#app-shell" },
          ],
        },
        {
          label: "Projects",
          items: PROJECTS.map((p) => ({
            label: p.name,
            icon: "folder" as const,
            drill: true,
            onClick: () =>
              go({ project: p.id, lens: "build", place: "issues", view: "active", record: undefined }),
          })),
        },
      ]
    return [
      {
        items: (PLACES[w.lens] ?? []).map((p) => ({
          id: p.id,
          label: p.label,
          icon: p.icon,
          count: p.id === "issues" ? ISSUES.filter(VIEWS[0]!.test).length : p.id === "prs" ? 2 : undefined,
          current: w.place === p.id && (p.id !== "issues" || !w.view || w.view === "active"),
          onClick: () =>
            go({ place: p.id, view: p.id === "issues" ? "active" : undefined, record: undefined }),
          items:
            p.id === "issues"
              ? VIEWS.slice(1).map((v) => ({
                  label: v.label,
                  current: w.place === "issues" && w.view === v.id,
                  onClick: () => go({ place: "issues", view: v.id, record: undefined }),
                }))
              : undefined,
        })),
      },
    ]
  }

  return (
    <div class="ex-app-window">
      <AppShell
        storage={STORAGE}
        covers={covers()}
        titleBar={
          <TitleBar
            icon="sparkle"
            history={history}
            path={
              here().project
                ? projectPath(here().project!, (id) => go({ project: id, record: undefined }))
                : [
                    { id: "acme", label: "Acme" },
                    { id: "projects", label: "Projects" },
                  ]
            }
            lenses={here().project ? LENSES : []}
            lens={here().lens || undefined}
            onLensChange={(id) => {
              const first = PLACES[id]?.[0]?.id
              history.switchLens(`/${here().project}/${id}/${first}${first === "issues" ? "/active" : ""}`)
            }}
            palette={{
              search: projectSearch(here().project ?? "atlas", here().lens, () => {}),
              actions: projectActions(() => {}),
              workspace: "Acme",
            }}
            status={
              <TitleBarItem icon="webhook" label="1 failing" tone="warning" tooltip="Webhooks: 1 failing" />
            }
          />
        }
        sidebarHeader={
          <SidebarHeader
            up={here().project ? { label: "Projects", onClick: () => go({ project: undefined }) } : undefined}
            filter={filter()}
            onFilterChange={setFilter}
            filterLabel={`Filter ${PROJECTS.find((p) => p.id === here().project)?.name ?? "Acme"}`}
            onCollapseAll={here().place ? () => setCollapsed(["issues"]) : undefined}
          />
        }
        sidebar={
          <Nav
            label="Places"
            groups={groups()}
            filter={filter()}
            collapsed={collapsed()}
            onCollapsedChange={setCollapsed}
          />
        }
        sidebarFoot={
          <AccountMenu
            name="Mira Okonkwo"
            detail="mira@acme.dev"
            items={[{ id: "profile", label: "Profile", icon: "user" }]}
            onAppearance={() => {}}
            onSignOut={() => {}}
          />
        }
        rail={<PanelRail panels={PANELS} open={open()} onToggle={toggle} />}
        right={
          <Show when={open().right} keyed>
            {(id) => (
              <ShellPanel
                id={id}
                at="right"
                storage={STORAGE}
                title={id === "details" ? "Details" : "Comments"}
                onClose={() => close("right")}
              >
                <Show
                  when={subject()}
                  fallback={<EmptyState size="sm" title="Open an issue to see its details" />}
                >
                  {(i) =>
                    id === "details" ? (
                      <div class="ex-pad">
                        <PropertyList
                          items={[
                            { label: "Key", value: <span class="nc-mono">{i().key}</span> },
                            { label: "State", value: STATE_NAME[i().state] },
                            {
                              label: "Assignee",
                              value: i().assignee ? (
                                <span class="nc-person">
                                  <Avatar name={i().assignee!} size="sm" />
                                  <span>{i().assignee}</span>
                                </span>
                              ) : (
                                "No one"
                              ),
                            },
                            { label: "Updated", value: `${i().updated} ago` },
                          ]}
                        />
                      </div>
                    ) : (
                      <EmptyState size="sm" title={`No comments on ${i().key}`} />
                    )
                  }
                </Show>
              </ShellPanel>
            )}
          </Show>
        }
        bottom={
          <Show when={open().bottom} keyed>
            {(id) => (
              <ShellPanel
                id={id}
                at="bottom"
                storage={STORAGE}
                title={id === "terminal" ? "Terminal" : "Logs"}
                closeShortcut="⌘ J"
                onClose={() => close("bottom")}
                tabs={
                  id === "terminal"
                    ? {
                        label: "Sessions",
                        items: tabs(),
                        value: tab(),
                        onChange: setTab,
                        onNew: newTab,
                        newLabel: "New session",
                        onClose: closeTabs,
                        onRename: (tid, name) =>
                          setTabs((t) => t.map((x) => (x.id === tid ? { ...x, label: name } : x))),
                        onReorder: (ids) =>
                          setTabs((t) => ids.map((tid) => t.find((x) => x.id === tid)!).filter(Boolean)),
                      }
                    : undefined
                }
              >
                <pre class="ex-term">
                  {id === "terminal"
                    ? `mira@build-01:~$ ${tabs().find((t) => t.id === tab())?.label ?? ""}\n`
                    : LOGS.join("\n")}
                </pre>
              </ShellPanel>
            )}
          </Show>
        }
      >
        <Show
          when={here().place === "issues"}
          fallback={
            <>
              <ViewHeader title={placeLabel()} />
              <Show
                when={here().place === "logs"}
                fallback={<EmptyState title={`${placeLabel()} is empty`} description="Nothing here yet." />}
              >
                <pre class="ex-term">{LOGS.join("\n")}</pre>
              </Show>
            </>
          }
        >
          <Show
            when={record()}
            fallback={
              <>
                <ViewHeader
                  title={view().id === "active" ? "Issues" : view().label}
                  actions={[
                    { id: "filter", label: "Filter", icon: "filter", onClick: () => {} },
                    { id: "new", label: "New issue", icon: "plus", onClick: () => {} },
                  ]}
                />
                <RowList label="Issues">
                  <For each={list()}>
                    {(i) => {
                      const st = ISSUE_STATE[i.state]
                      return (
                        <ListRow
                          icon="circle-dot"
                          title={i.title}
                          secondary={i.key}
                          status={st ? <State status={st[0]}>{st[1]}</State> : undefined}
                          meta={i.updated}
                          unread={Boolean(i.unread)}
                          onClick={() => go({ record: i.key })}
                        />
                      )
                    }}
                  </For>
                </RowList>
              </>
            }
          >
            {(i) => (
              <>
                <ViewHeader
                  trail={[
                    {
                      id: "list",
                      label: view().id === "active" ? "Issues" : view().label,
                      onClick: () => go({ record: undefined }),
                    },
                    {
                      id: "record",
                      label: i().key,
                      switcher: {
                        noun: "issue",
                        sections: [
                          {
                            title: view().label,
                            entries: list().map((x) => ({
                              id: x.key,
                              label: x.key,
                              hint: x.title,
                              current: x.key === i().key,
                            })),
                          },
                        ],
                        onPick: (e) => go({ record: e.id }),
                      },
                    },
                  ]}
                  stepper={{
                    index: at(),
                    total: list().length,
                    noun: "issue",
                    prev: () => go({ record: list()[at() - 1]?.key }),
                    next: () => go({ record: list()[at() + 1]?.key }),
                  }}
                  actions={[
                    { id: "link", label: "Copy link", icon: "link", onClick: () => {} },
                    { id: "more", label: "Archive", overflow: true, onClick: () => {} },
                  ]}
                />
                <article class="ex-record">
                  <h1 class="heading">{i().title}</h1>
                  <p class="nc-muted">
                    The arm64 deploy step times out about one run in five since the base image changed.
                  </p>
                </article>
              </>
            )}
          </Show>
        </Show>
      </AppShell>
    </div>
  )
}
