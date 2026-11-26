import {
  Avatar,
  Button,
  createAppearance,
  createShell,
  EmptyState,
  ListRow,
  memoryRouter,
  memoryStorage,
  PropertyList,
  RowList,
  Shell,
  type ShellLens,
  type ShellPanelTab,
  type ShellPlace,
  type ShellRegistry,
  type ShellScope,
  ShellViewHeader,
  State,
  TitleBarItem,
  useShell,
} from "@aiviarium/nocturne"
import { createSignal, For, Show } from "solid-js"
import { ISSUE_STATE, ISSUES, type Issue, STATE_NAME } from "../_kit/issues"
import { LENSES } from "../_kit/shell"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "The app shell",
  note: "One registry (createShell) draws the whole window: the path and its switchers, the lens box, the sidebar for the scope you are in, the view header's trail and stepper, the rail and its panels, and the palette (⌘K). Switch lenses (⌘1…⌘3) and back: each lens remembers its place. Open an issue and step with J and K; Esc goes back up. Details (⌥D) drills to a related issue in its own header. On a host's Sessions the view is the terminal, so the rail drops the Terminal panel (⌘J) there.",
  surface: "none",
}

const STORAGE = memoryStorage()

interface Project {
  id: string
  name: string
  hue: "sky" | "orchid" | "mint"
}
const PROJECTS: Project[] = [
  { id: "atlas", name: "Atlas web", hue: "sky" },
  { id: "fleet", name: "Fleet agent", hue: "orchid" },
]
const HOSTS = [
  { id: "build-01", name: "build-01", ok: true },
  { id: "build-02", name: "build-02", ok: false },
]

const VIEWS = [
  { id: "active", label: "Active", test: (i: Issue) => i.state !== "done" && i.state !== "backlog" },
  { id: "backlog", label: "Backlog", test: (i: Issue) => i.state === "backlog" },
  { id: "all", label: "All issues", test: () => true },
]
const issuesIn = (view?: string) => ISSUES.filter((VIEWS.find((v) => v.id === view) ?? VIEWS[0]!).test)
const issue = (key: string) => ISSUES.find((i) => i.key === key)
/** The issue a Details panel links to from another: the next one in the list. */
const related = (key: string) => ISSUES[(ISSUES.findIndex((i) => i.key === key) + 1) % ISSUES.length]!

const LOGS = [
  "17:42:01 info  deploy  web@4f2a1c rolling out to 3 hosts",
  "17:42:09 info  deploy  build-01 healthy",
  "17:42:31 warn  deploy  build-02 healthcheck slow (28s)",
  "17:43:02 error deploy  build-03 healthcheck timed out after 30s",
  "17:43:04 info  deploy  rolled back build-03",
]

// ── Views: each place's, mounted once per place and fed from `shell.loc()` ─────────────────────────────

function Blank(props: { shell: ShellRegistry }) {
  return (
    <>
      <ShellViewHeader />
      <EmptyState
        title={`${props.shell.loc().place?.label ?? "This place"} is empty`}
        description="Nothing here yet."
      />
    </>
  )
}

function Issues(props: { shell: ShellRegistry }) {
  const loc = () => props.shell.loc()
  const list = () => issuesIn(loc().view?.id)
  return (
    <>
      <ShellViewHeader
        actions={[
          { id: "filter", label: "Filter", icon: "filter", onClick: () => {} },
          { id: "new", label: "New issue", icon: "plus", onClick: () => {} },
        ]}
      />
      <Show
        when={loc().record ? issue(loc().record!) : undefined}
        fallback={
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
                    selected={props.shell.selection() === i.key}
                    onClick={() => props.shell.toPlace(undefined, "issues", loc().view?.id, i.key)}
                  />
                )
              }}
            </For>
          </RowList>
        }
      >
        {(i) => (
          <article class="ex-record">
            <h1 class="heading">{i().title}</h1>
            <p class="nc-muted">
              {STATE_NAME[i().state]}. Updated {i().updated} ago. Press J or K for the next or previous issue
              in {loc().view?.label ?? "Active"}, Esc for the list.
            </p>
          </article>
        )}
      </Show>
    </>
  )
}

function Listing(props: {
  shell: ShellRegistry
  rows: Array<{ id: string; label: string; detail: string }>
}) {
  return (
    <>
      <ShellViewHeader />
      <RowList label={props.shell.loc().module.id}>
        <For each={props.rows}>
          {(r) => (
            <ListRow
              icon={props.shell.loc().module.icon}
              title={r.label}
              secondary={r.detail}
              onClick={() => props.shell.go(`/${props.shell.loc().module.id}/${r.id}`)}
            />
          )}
        </For>
      </RowList>
    </>
  )
}

function Terminal(props: { shell: ShellRegistry }) {
  return (
    <>
      <ShellViewHeader />
      <pre class="ex-term">{`mira@${String((props.shell.loc().frame.item as { id: string }).id)}:~$ tail -f deploy.log\n${LOGS.join("\n")}`}</pre>
    </>
  )
}

function Logs() {
  return (
    <>
      <ShellViewHeader />
      <pre class="ex-term">{LOGS.join("\n")}</pre>
    </>
  )
}

function IssueDetails(props: { id: string }) {
  const shell = useShell()
  const i = () => issue(props.id)
  return (
    <Show when={i()}>
      {(it) => (
        <div class="ex-pad">
          <PropertyList
            items={[
              { label: "Key", value: <span class="nc-mono">{it().key}</span> },
              { label: "State", value: STATE_NAME[it().state] },
              {
                label: "Assignee",
                value: it().assignee ? (
                  <span class="nc-person">
                    <Avatar name={it().assignee!} size="sm" />
                    <span>{it().assignee}</span>
                  </span>
                ) : (
                  "No one"
                ),
              },
              {
                label: "Related",
                value: (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => shell?.drill("details", related(it().key).key)}
                  >
                    {related(it().key).key}
                  </Button>
                ),
              },
            ]}
          />
        </div>
      )}
    </Show>
  )
}

// ── The registry ─────────────────────────────────────────────────────────────────────────────────────

const lens = (id: string, places: ShellPlace[], extra: Partial<ShellLens> = {}): ShellLens => ({
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
  inspect: (p) => <EmptyState size="sm" title={p.name} description="Open an issue to see its details." />,
  lenses: [
    lens("explore", [
      { id: "map", label: "Map", icon: "grid", view: Blank },
      { id: "notes", label: "Notes", icon: "file", view: Blank },
    ]),
    lens("product", [
      { id: "roadmap", label: "Roadmap", icon: "calendar", view: Blank },
      { id: "specs", label: "Specs", icon: "book-open", view: Blank },
    ]),
    lens(
      "build",
      [
        {
          id: "issues",
          label: "Issues",
          icon: "list",
          view: Issues,
          noun: "issue",
          views: VIEWS.map((v) => ({ id: v.id, label: v.label })),
          count: () => issuesIn("active").length,
          records: (_p, view) => issuesIn(view).map((i) => ({ id: i.key, label: i.key, hint: i.title })),
          recordLabel: (key) => issue(key)?.key,
          inspect: (key) => <IssueDetails id={key} />,
        },
        { id: "cycles", label: "Cycles", icon: "refresh-cw", view: Blank },
        { id: "prs", label: "Pull requests", icon: "git-pull-request", view: Blank, count: () => 2 },
      ],
      { open: { right: "details" } },
    ),
  ],
}

const host: ShellScope<(typeof HOSTS)[number]> = {
  id: "host",
  label: (h) => h.name,
  noun: "host",
  mark: (h) => ({ name: h.name, icon: "server", hue: h.ok ? "mint" : "amber" }),
  items: () => HOSTS,
  lenses: [
    lens("operate", [
      // The view is the terminal: the Terminal panel would show the same sessions.
      { id: "sessions", label: "Sessions", icon: "terminal", view: Terminal, covers: ["terminal"] },
      { id: "logs", label: "Logs", icon: "logs", view: Logs },
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
        id: "projects",
        label: "Projects",
        icon: "folder",
        child: project,
        view: (p) => (
          <Listing shell={p.shell} rows={PROJECTS.map((x) => ({ id: x.id, label: x.name, detail: x.id }))} />
        ),
      },
      {
        id: "hosts",
        label: "Hosts",
        icon: "server",
        child: host,
        view: (p) => (
          <Listing
            shell={p.shell}
            rows={HOSTS.map((h) => ({ id: h.id, label: h.name, detail: h.ok ? "Healthy" : "Degraded" }))}
          />
        ),
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

  // The accent follows the lens on this window only, so the rest of the page keeps its own.
  let frame: HTMLDivElement | undefined
  const appearance = createAppearance({ storage: STORAGE, root: () => frame })

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
          onAppearance: () => {},
          onSignOut: () => {},
        }}
      />
    </div>
  )
}
