// Operate › Sessions: the host's sessions, and the open ones as terminals in a dock the person tiles. The bottom
// panel's Terminal shows the same open sessions as tabs, so the view covers it here.
import {
  Avatar,
  Button,
  type DataColumn,
  DataTable,
  Dock,
  type DockLayout,
  dockLayout,
  dockShow,
  dockSplit,
  dockSync,
  EntryGlyph,
  type RowMenuEntry,
  type ShellPanelSpec,
  type ShellRecord,
  type ShellRegistry,
  ShellViewHeader,
  type ShellViewProps,
  State,
  Truncate,
  toast,
  ViewHeader,
  ViewLayout,
} from "@aiviarium/nocturne"
import { createMemo, createSignal, For, Show } from "solid-js"
import { type Host, person } from "../data"
import { askName, copyLink, demoShell, named, renameEntry, undoable } from "../menus"
import {
  closeSessions,
  dockOf,
  endSession,
  frontOf,
  type HostSession,
  newSession,
  openOf,
  openSession,
  removeSessions,
  renameSession,
  SESSION_LABEL,
  sessionById,
  sessionsOf,
  setDockOf,
  setFrontOf,
  setOpenOf,
  tabStatus,
} from "./data"

const hostOf = (shell: ShellRegistry) => shell.loc().frame.item as Host

/** A session as a record: its entry in the sidebar and its row in the list draw the same mark and hover card. */
export const sessionRecord = (s: HostSession): ShellRecord => ({
  id: s.id,
  label: s.title,
  hint: SESSION_LABEL[s.state],
  // Who runs it: the agent or a person, not the place's terminal icon again.
  leading: () =>
    s.user === "agent" ? (
      <Avatar kind="agent" name={s.title} size="xs" />
    ) : (
      <Avatar name={person(s.user)?.name ?? s.user} hue={person(s.user)?.hue} size="xs" />
    ),
  status: s.state === "running" ? "live" : s.state === "failed" ? "error" : undefined,
  hover: () => ({
    title: s.title,
    meta: `${SESSION_LABEL[s.state]} · started ${s.started} ago`,
    rows: [
      {
        label: "Run by",
        value: s.user === "agent" ? "The agent" : (person(s.user)?.name ?? s.user),
      },
      ...(s.lines.length
        ? [{ label: "Last line", value: <span class="nc-mono nc-truncate">{s.lines.at(-1)}</span> }]
        : []),
    ],
  }),
  meta: s.started,
})

const COLUMNS: DataColumn<HostSession>[] = [
  {
    id: "title",
    header: "Session",
    accessor: (r) => r.title,
    sortable: true,
    cell: (r) => (
      <span class="dm-row">
        <EntryGlyph {...sessionRecord(r)} />
        {r.title}
      </span>
    ),
  },
  {
    id: "state",
    header: "State",
    accessor: (r) => r.state,
    width: "104px",
    // Running and exited are the usual; a failure shows.
    cell: (r) => (r.state === "failed" ? <State status="error">{SESSION_LABEL.failed}</State> : null),
  },
  {
    id: "command",
    header: "Command",
    accessor: (r) => r.command,
    cell: (r) => <Truncate text={r.command} mono />,
  },
  { id: "user", header: "User", accessor: (r) => r.user, width: "96px", sortable: true },
  { id: "id", header: "ID", accessor: (r) => r.id, type: "mono", width: "88px" },
  { id: "started", header: "Started", accessor: (r) => r.started, type: "time", width: "80px" },
]

const pathOf = (x: HostSession) => `/hosts/${x.host}/operate/sessions/${x.id}`
const titles = (list: HostSession[]) => (list.length === 1 ? list[0]!.title : `${list.length} sessions`)

const end = (list: HostSession[]) => {
  const running = list.filter((x) => x.state === "running")
  for (const x of running) endSession(x.id)
  if (running.length) toast({ title: `Ended ${titles(running)}` })
}
const remove = (list: HostSession[]) => {
  const shell = demoShell()
  const ids = list.map((x) => x.id)
  if (shell.loc().place?.id === "sessions" && ids.includes(shell.loc().record ?? ""))
    shell.toPlace(undefined, "sessions")
  undoable(
    `Deleted ${named(
      list.map((x) => x.title),
      "sessions",
    )}`,
    removeSessions(ids),
  )
}
const rename = (x: HostSession) =>
  askName({
    title: "Rename session",
    value: x.title,
    submit: "Rename",
    onSubmit: (title) => renameSession(x.id, title),
  })

/** The menu of a session, or of several: in the list, on its entry in the sidebar and on its terminal's tab. */
export function sessionMenu(list: HostSession[]): RowMenuEntry[] {
  const x = list[0]
  if (!x) return []
  const running = list.filter((s) => s.state === "running")
  const endEntry = (label: string): RowMenuEntry[] =>
    running.length ? [{ id: "end", label, icon: "square", onSelect: () => end(list) }] : []
  if (list.length > 1)
    return [
      { type: "label", label: `${list.length} selected` },
      ...endEntry(`End ${running.length}`),
      { type: "separator" },
      {
        id: "delete",
        label: `Delete ${list.length}`,
        icon: "trash",
        danger: true,
        onSelect: () => remove(list),
      },
    ]
  return [
    {
      id: "open",
      label: "Open",
      icon: "terminal",
      onSelect: () => {
        openSession(x.host, x.id)
        demoShell().go(pathOf(x))
      },
    },
    { id: "copy", label: "Copy link", icon: "link", onSelect: () => copyLink(x.title, pathOf(x)) },
    renameEntry(() => rename(x)),
    ...endEntry("End session"),
    { type: "separator" },
    { id: "delete", label: "Delete", icon: "trash", danger: true, onSelect: () => remove([x]) },
  ]
}

/** A session's terminal: its lines, then a prompt while it runs. */
function Terminal(props: { session: HostSession }) {
  const text = () => {
    const x = props.session
    const prompt = x.state === "running" ? [`${x.user}@${x.host}:~$ `] : []
    return [...x.lines, ...prompt].join("\n")
  }
  return (
    <pre class="dm-term" aria-label={`Terminal: ${props.session.title}`}>
      {text()}
    </pre>
  )
}

export function SessionsView(props: ShellViewProps) {
  const s = props.shell
  const host = () => hostOf(s).id
  const record = () => s.loc().record
  // The address names a session: it joins the open ones and comes to the front.
  const ids = createMemo(() => {
    const open = openOf(host())
    const r = record()
    return r && sessionById(r) && !open.includes(r) ? [...open, r] : open
  })
  const layout = createMemo((): DockLayout => {
    const base = dockSync(dockOf(host()) ?? dockLayout(), ids())
    const r = record()
    return r && ids().includes(r) ? dockShow(base, r) : base
  })
  const show = (id: string) => {
    openSession(host(), id)
    s.toPlace(undefined, "sessions", undefined, id)
  }
  const onLayout = (next: DockLayout) => {
    setDockOf(host(), next)
    const frame = next.columns.flatMap((c) => c.frames).find((f) => f.id === next.focused)
    if (frame?.active && frame.active !== record()) {
      setFrontOf(host(), frame.active)
      s.toPlace(undefined, "sessions", undefined, frame.active)
    }
  }
  const close = (id: string) => {
    const left = ids().filter((x) => x !== id)
    closeSessions(host(), [id])
    setOpenOf(host(), left)
    if (id === record()) s.toPlace(undefined, "sessions", undefined, left.at(-1))
  }
  const start = (frame?: string, edge?: "right" | "bottom") => {
    const id = newSession(host())
    if (frame && edge) setDockOf(host(), dockSplit(dockSync(layout(), [...ids(), id]), id, frame, edge))
    s.toPlace(undefined, "sessions", undefined, id)
  }
  const [selected, setSelected] = createSignal<string[]>([])
  const list = () => (
    <ViewLayout
      id="demo.hosts.sessions"
      header={
        <ShellViewHeader
          title="Sessions"
          actions={[{ id: "new", label: "New session", icon: "plus", onClick: () => start() }]}
        />
      }
    >
      <DataTable
        label="Sessions"
        bare
        rows={sessionsOf(host())}
        columns={COLUMNS}
        getRowId={(r) => r.id}
        rowLabel={(r) => r.title}
        selectable
        selected={selected()}
        onSelectionChange={setSelected}
        onRowClick={(r) => show(r.id)}
        onRemove={(ids) => removeSessions(ids)}
        rowMenu={(t) => sessionMenu(t.rows)}
        bulkActions={(rows) => (
          <Show when={rows.some((r) => r.state === "running")}>
            <Button size="sm" variant="ghost" icon="square" onClick={() => end(rows)}>
              End
            </Button>
          </Show>
        )}
        empty={{ title: "No sessions" }}
      />
    </ViewLayout>
  )
  return (
    <Show when={record() && sessionById(record())} fallback={list()}>
      <ViewLayout id="demo.hosts.dock" scroll={false}>
        <div class="dm-hosts-dock">
          <Dock
            label={`Sessions on ${hostOf(s).name}`}
            layout={layout()}
            onLayoutChange={onLayout}
            tab={(id) => {
              const x = sessionById(id)
              return { label: x?.title ?? id, status: x ? tabStatus(x) : undefined }
            }}
            onClose={close}
            onNewTab={(frame) => start(frame)}
            // On a phone the frames stack, so splitting has nothing to offer and its buttons take the tab's room.
            onSplit={(frame, edge) => start(frame, edge)}
            menu={(id) => {
              const x = sessionById(id)
              return [
                { id: "rename", label: "Rename", icon: "edit" },
                {
                  id: "end",
                  label: "End session",
                  icon: "square",
                  disabled: x?.state !== "running",
                },
                { type: "separator" },
                { id: "close", label: "Close", icon: "close" },
              ]
            }}
            onMenuSelect={(id, entry) => {
              const x = sessionById(id)
              if (entry === "close") close(id)
              else if (entry === "end" && x) end([x])
              else if (entry === "rename" && x) rename(x)
            }}
          >
            {(id) => (
              <Show when={sessionById(id)}>
                {(x) => (
                  <div class="dm-fill">
                    {/* Only actions: the dock draws them at the end of this tab's strip, so the frame has one bar. */}
                    <ViewHeader
                      noPin
                      actions={[
                        {
                          id: "all",
                          label: "All sessions",
                          icon: "list",
                          onClick: () => s.toPlace(undefined, "sessions"),
                        },
                        {
                          id: "end",
                          label: "End session",
                          icon: "square",
                          disabled: x().state !== "running",
                          onClick: () => endSession(x().id),
                        },
                      ]}
                    />
                    <Terminal session={x()} />
                  </div>
                )}
              </Show>
            )}
          </Dock>
        </div>
      </ViewLayout>
    </Show>
  )
}

/** The host whose terminals the panel shows: the one the person is in, else the first with open sessions. */
const panelHost = (shell: ShellRegistry) => {
  const item = shell.loc().frames.find((f) => f.scope.id === "host")?.item as Host | undefined
  return item?.id ?? "build-01"
}

/** The Terminal panel under the view: the host's open sessions as tabs. */
export const terminalPanel: ShellPanelSpec = {
  id: "terminal",
  label: "Terminal",
  icon: "terminal",
  at: "bottom",
  key: "t",
  tabs: (p) => {
    const host = panelHost(p.shell)
    return {
      label: `Sessions on ${host}`,
      items: openOf(host).flatMap((id) => {
        const x = sessionById(id)
        return x ? [{ id, label: x.title, status: tabStatus(x) }] : []
      }),
      value: frontOf(host),
      onChange: (id) => setFrontOf(host, id),
      newLabel: "New session",
      onNew: () => {
        newSession(host)
      },
      onClose: (ids) => closeSessions(host, ids),
      onRename: (id, name) => renameSession(id, name),
      onReorder: (ids) => setOpenOf(host, ids),
    }
  },
  render: (p) => {
    const host = () => panelHost(p.shell)
    const current = () => sessionById(frontOf(host()))
    return (
      <Show
        when={current()}
        fallback={
          <div class="dm-hosts-term-empty">
            <For each={[host()]}>{(h) => <span class="nc-meta">No open sessions on {h}</span>}</For>
          </div>
        }
      >
        {(x) => <Terminal session={x()} />}
      </Show>
    )
  },
}
