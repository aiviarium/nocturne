import {
  createAppearance,
  createShell,
  EmptyState,
  memoryRouter,
  memoryStorage,
  Shell,
  type ShellLens,
  type ShellPanelTab,
  type ShellPlace,
  type ShellScope,
  ShellViewHeader,
  type ShellViewProps,
  TitleBarItem,
  ViewLayout,
} from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import { LENSES } from "../_kit/shell"
import type { ExampleMeta } from "../_kit/types"
import {
  HOSTS,
  type Host,
  INBOX,
  ISSUE_VIEWS,
  issueByKey,
  issuesIn,
  PROJECTS,
  type Project,
  REPORTS,
  SESSIONS,
  sessionsOf,
} from "../_kit/workbench/data"
import { FilesView, LogsView, SessionsView } from "../_kit/workbench/host"
import { InboxView, TriageView } from "../_kit/workbench/inbox"
import { IssueDetails, IssuesView } from "../_kit/workbench/issues"
import { HostsView, ProjectsView, settingsView } from "../_kit/workbench/settings"

export const meta: ExampleMeta = {
  title: "The app shell",
  note: "Switch lenses with ⌘1 to ⌘3; each lens remembers its place. Open an issue and step with J and K, and Esc goes back up. ⌥D opens Details. On a host, Sessions is the terminal, so the rail drops the Terminal panel there. ⌘K opens the palette.",
  surface: "none",
}

const STORAGE = memoryStorage()

function Blank(props: ShellViewProps) {
  return (
    <ViewLayout id="workbench.blank" header={<ShellViewHeader />}>
      <EmptyState
        title={`${props.shell.loc().place?.label ?? "This place"} is empty`}
        description="Nothing here yet."
      />
    </ViewLayout>
  )
}

const lens = <T,>(id: string, places: ShellPlace<T>[], extra: Partial<ShellLens<T>> = {}): ShellLens<T> => ({
  ...LENSES.find((l) => l.id === id)!,
  places,
  ...extra,
})

const project: ShellScope<Project> = {
  id: "project",
  label: (p) => p.name,
  noun: "project",
  mark: (p) => ({ name: p.name, hue: p.hue }),
  items: () => PROJECTS,
  inspect: (p) => <EmptyState size="sm" title={p.name} description="Select an issue to see its details." />,
  lenses: [
    lens<Project>("explore", [
      { id: "triage", label: "Triage", icon: "inbox", view: TriageView, count: () => REPORTS.length },
      { id: "ideas", label: "Ideas", icon: "star", view: Blank },
    ]),
    lens<Project>("product", [
      { id: "specs", label: "Specs", icon: "book-open", view: Blank },
      { id: "roadmap", label: "Roadmap", icon: "calendar", view: Blank },
    ]),
    lens<Project>("build", [
      {
        id: "issues",
        label: "Issues",
        icon: "list-todo",
        view: IssuesView,
        noun: "issue",
        views: ISSUE_VIEWS.map((v) => ({ id: v.id, label: v.label })),
        count: (p) => issuesIn(p.id, "active").length,
        records: (p, view) => issuesIn(p.id, view).map((i) => ({ id: i.key, label: i.key, hint: i.title })),
        recordLabel: (key) => issueByKey(key)?.key,
        inspect: (key) => <IssueDetails id={key} />,
      },
      { id: "cycles", label: "Cycles", icon: "refresh-cw", view: Blank },
      { id: "prs", label: "Pull requests", icon: "git-pull-request", view: Blank, count: () => 3 },
    ]),
  ],
}

const host: ShellScope<Host> = {
  id: "host",
  label: (h) => h.name,
  noun: "host",
  mark: (h) => ({ name: h.name, icon: "server", hue: h.state === "degraded" ? "amber" : "mint" }),
  items: () => HOSTS,
  lenses: [
    lens<Host>("operate", [
      {
        id: "sessions",
        label: "Sessions",
        icon: "terminal",
        view: SessionsView,
        noun: "session",
        count: (h) => sessionsOf(h.id).filter((s) => s.state === "running").length,
        records: (h) => sessionsOf(h.id).map((s) => ({ id: s.id, label: s.title, hint: s.id })),
        recordLabel: (id) => SESSIONS.find((s) => s.id === id)?.title,
        // The tabs name the open session: no trail. The view is the terminal, so the panel steps aside.
        trail: false,
        covers: ["terminal"],
      },
      {
        id: "files",
        label: "Files",
        icon: "folder",
        view: FilesView,
        // The view draws its own trail of folders.
        trail: false,
        recordLabel: (path) => path.split("/").at(-1),
      },
      { id: "logs", label: "Logs", icon: "logs", view: LogsView },
    ]),
  ],
}

export default function AppShellWorkbench() {
  // The terminal panel's sessions, as real tabs.
  const [tabs, setTabs] = createSignal<ShellPanelTab[]>([
    { id: "s1", label: "Coding agent", status: "running" },
    { id: "s2", label: "npm test", status: "input" },
    { id: "s3", label: "build", status: "failed", detail: "exit 1" },
  ])
  const [tab, setTab] = createSignal("s1")
  let made = 0

  // The accent follows the lens on this window only, so the rest of the page keeps its own.
  let frame: HTMLDivElement | undefined
  const appearance = createAppearance({ storage: STORAGE, root: () => frame })

  const shell = createShell({
    router: memoryRouter("/projects/atlas/build/issues"),
    storage: STORAGE,
    workspace: { id: "acme", name: "Acme" },
    workspaces: [
      { id: "acme", name: "Acme" },
      { id: "personal", name: "Personal", hue: "rose" },
    ],
    scopes: [
      {
        id: "inbox",
        label: "Inbox",
        icon: "inbox",
        view: InboxView,
        count: () => INBOX.filter((n) => n.unread).length,
      },
      { id: "projects", label: "Projects", icon: "board", child: project, view: ProjectsView },
      { id: "hosts", label: "Hosts", icon: "server", child: host, view: HostsView },
      {
        id: "settings",
        label: "Settings",
        icon: "settings",
        places: [
          { id: "general", label: "General", icon: "settings" },
          { id: "members", label: "Members", icon: "users" },
          { id: "appearance", label: "Appearance", icon: "monitor" },
        ],
        view: settingsView(appearance),
      },
    ],
    panels: [
      {
        id: "details",
        label: "Details",
        icon: "panel-right",
        at: "right",
        key: "d",
        render: (p) => p.shell.inspect() ?? <EmptyState size="sm" title="Nothing selected" />,
      },
      {
        id: "terminal",
        label: "Terminal",
        icon: "terminal",
        at: "bottom",
        key: "t",
        tabs: () => ({
          label: "Sessions",
          items: tabs(),
          value: tab(),
          onChange: setTab,
          newLabel: "New session",
          onNew: () => {
            made += 1
            const id = `new${made}`
            setTabs((t) => [...t, { id, label: made === 1 ? "zsh" : `zsh ${made}`, status: "running" }])
            setTab(id)
          },
          onClose: (ids) => {
            const left = tabs().filter((t) => !ids.includes(t.id))
            setTabs(left)
            if (ids.includes(tab())) setTab(left[0]?.id ?? "")
          },
          onRename: (id, name) => setTabs((t) => t.map((x) => (x.id === id ? { ...x, label: name } : x))),
          onReorder: (ids) => setTabs((t) => ids.map((id) => t.find((x) => x.id === id)!).filter(Boolean)),
        }),
        render: () => (
          <pre class="ex-term">{`mira@build-01:~$ ${tabs().find((t) => t.id === tab())?.label ?? ""}\n`}</pre>
        ),
      },
    ],
    commands: [{ id: "theme", label: "Switch theme", icon: "moon", run: () => appearance.toggleTheme() }],
  })

  return (
    <div
      class="ex-app-window"
      ref={(el) => {
        frame = el
        appearance.apply()
      }}
    >
      <Shell
        shell={shell}
        icon="sparkle"
        appearance={appearance}
        window={{ style: "mac" }}
        status={
          <TitleBarItem icon="webhook" label="1 failing" tone="warning" tooltip="Webhooks: 1 failing" />
        }
        account={{
          name: "Mira Okonkwo",
          detail: "mira@acme.dev",
          items: [{ id: "profile", label: "Profile", icon: "user" }],
          theme: { value: appearance.theme(), onChange: (v) => appearance.setTheme(v) },
          onAppearance: () => shell.go("/settings/appearance"),
          onSignOut: () => {},
        }}
      />
    </div>
  )
}
