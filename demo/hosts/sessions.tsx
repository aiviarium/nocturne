// Operate › Sessions: the host's sessions, and the open ones as terminals in a dock the person tiles. The bottom
// panel's Terminal shows the same open sessions as tabs, so the view covers it here.
import {
  type DataColumn,
  DataTable,
  Dock,
  type DockLayout,
  dockLayout,
  dockShow,
  dockSplit,
  dockSync,
  type ShellPanelSpec,
  type ShellRegistry,
  ShellViewHeader,
  type ShellViewProps,
  State,
  StatusDot,
  Truncate,
  usePhone,
  ViewHeader,
  ViewLayout,
} from "@aiviarium/nocturne"
import { createMemo, For, Show } from "solid-js"
import type { Host } from "../data"
import {
  closeSessions,
  dockOf,
  endSession,
  frontOf,
  type HostSession,
  newSession,
  openOf,
  openSession,
  renameSession,
  SESSION_DOT,
  SESSION_LABEL,
  sessionById,
  sessionsOf,
  setDockOf,
  setFrontOf,
  setOpenOf,
  tabStatus,
} from "./data"

const hostOf = (shell: ShellRegistry) => shell.loc().frame.item as Host

const COLUMNS: DataColumn<HostSession>[] = [
  {
    id: "title",
    header: "Session",
    accessor: (r) => r.title,
    sortable: true,
    cell: (r) => (
      <span class="dm-row">
        <StatusDot status={SESSION_DOT[r.state]} />
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
  const phone = usePhone()
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
        onRowClick={(r) => show(r.id)}
        rowMenu={(t) => [
          { id: "open", label: "Open", icon: "terminal" },
          ...(t.rows.some((r) => r.state === "running")
            ? [{ id: "end", label: "End session", icon: "square", danger: true } as const]
            : []),
        ]}
        onRowMenuSelect={(id, t) => {
          if (id === "open") for (const r of t.rows) show(r.id)
          else for (const r of t.rows) endSession(r.id)
        }}
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
            onSplit={phone() ? undefined : (frame, edge) => start(frame, edge)}
            menu={(id) => [
              { id: "rename", label: "Rename", icon: "edit" },
              {
                id: "end",
                label: "End session",
                icon: "square",
                disabled: sessionById(id)?.state !== "running",
              },
              { type: "separator" },
              { id: "close", label: "Close", icon: "close" },
            ]}
            onMenuSelect={(id, entry) => {
              if (entry === "close") close(id)
              else if (entry === "end") endSession(id)
              else if (entry === "rename")
                renameSession(id, `${sessionById(id)?.title ?? "session"} (renamed)`)
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
