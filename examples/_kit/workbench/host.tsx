// A host through the Operate lens: its terminal sessions as tabs, its logs and its files.
import {
  Badge,
  Button,
  type DataColumn,
  DataTable,
  EmptyState,
  ListRow,
  type LogEntry,
  LogViewer,
  MetaLine,
  RowList,
  type ShellRegistry,
  ShellViewHeader,
  type ShellViewProps,
  StatusDot,
  TabStrip,
  type TrailCrumb,
  ViewHeader,
  ViewLayout,
} from "@aiviarium/nocturne"
import { createSignal, For, Show } from "solid-js"
import { FILES, type Host, LOGS, SESSIONS, type Session, sessionsOf } from "./data"

const hostOf = (shell: ShellRegistry) => shell.loc().frame.item as Host

const DOT = { running: "live", exited: "neutral", failed: "error" } as const

const COLUMNS: DataColumn<Session>[] = [
  {
    id: "title",
    header: "Session",
    accessor: (r) => r.title,
    cell: (r) => (
      <span class="ex-row">
        <StatusDot status={DOT[r.state]} />
        {r.title}
        {r.state === "failed" ? <Badge tone="danger">Failed</Badge> : null}
      </span>
    ),
  },
  { id: "id", header: "ID", accessor: (r) => r.id, type: "mono", width: "96px" },
  { id: "user", header: "User", accessor: (r) => r.user, width: "120px" },
  { id: "started", header: "Started", accessor: (r) => r.started, type: "time", width: "88px" },
]

/** Operate › Sessions: the host's sessions, and the open ones as tabs of a terminal. */
export function SessionsView(props: ShellViewProps) {
  const s = props.shell
  const record = () => s.loc().record
  const [open, setOpen] = createSignal<string[]>([])
  const show = (id: string) => {
    if (!open().includes(id)) setOpen((o) => [...o, id])
    s.toPlace(undefined, "sessions", undefined, id)
  }
  const session = () => SESSIONS.find((x) => x.id === record())
  // A session the address names joins the tabs.
  const tabs = () => {
    const r = record()
    const ids = r && !open().includes(r) ? [...open(), r] : open()
    return ids.map((id) => SESSIONS.find((x) => x.id === id)!).filter(Boolean)
  }
  return (
    <ViewLayout
      id="workbench.sessions"
      header={
        <Show
          when={tabs().length}
          fallback={
            <ShellViewHeader
              actions={[{ id: "new", label: "New session", icon: "plus", onClick: () => {} }]}
            />
          }
        >
          <ViewHeader noPin actions={[{ id: "new", label: "New session", icon: "plus", onClick: () => {} }]}>
            <TabStrip
              label="Sessions"
              leading={
                <Button
                  variant="ghost"
                  size="sm"
                  icon="list"
                  onClick={() => s.toPlace(undefined, "sessions")}
                >
                  Sessions
                </Button>
              }
              items={tabs().map((t) => ({
                id: t.id,
                label: t.title,
                status: t.state === "failed" ? "failed" : t.state === "running" ? "running" : undefined,
              }))}
              value={record() ?? ""}
              onChange={show}
              onClose={(id) => {
                const left = tabs().filter((t) => t.id !== id)
                setOpen(left.map((t) => t.id))
                if (id === record()) s.toPlace(undefined, "sessions", undefined, left.at(-1)?.id)
              }}
            />
          </ViewHeader>
        </Show>
      }
    >
      <Show
        when={session()}
        fallback={
          <DataTable
            label="Sessions"
            bare
            rows={sessionsOf(hostOf(s).id)}
            columns={COLUMNS}
            getRowId={(r) => r.id}
            onRowClick={(r) => show(r.id)}
          />
        }
      >
        {(x) => (
          <div class="ex-reader">
            <MetaLine
              class="ex-pad"
              items={[{ label: x().id, mono: true }, `${x().user}@${x().host}`, `started ${x().started} ago`]}
            />
            <pre class="ex-term">{x().lines.join("\n")}</pre>
          </div>
        )}
      </Show>
    </ViewLayout>
  )
}

/** Operate › Logs: the host's log, live. */
export function LogsView(_: ShellViewProps) {
  const entries: LogEntry[] = LOGS.map((l, i) => ({
    id: i,
    at: l.t,
    level: l.level,
    text: `${l.src.padEnd(7)} ${l.msg}`,
  }))
  return (
    <ViewLayout id="workbench.logs" header={<ShellViewHeader />}>
      <LogViewer entries={entries} streamState="live" showTimestamps follow />
    </ViewLayout>
  )
}

/** Operate › Files: a folder's entries, and a trail of the folders above it. */
export function FilesView(props: ShellViewProps) {
  const s = props.shell
  const folder = () => s.loc().record ?? ""
  const parts = () => (folder() ? folder().split("/") : [])
  const goTo = (path: string) => s.toPlace(undefined, "files", undefined, path || undefined)
  const trail = (): TrailCrumb[] => {
    const p = parts()
    const parent = p.slice(0, -1).join("/")
    const siblings = (FILES[parent] ?? []).filter((e) => e.kind === "folder")
    return [
      { id: "files", label: "Files", onClick: () => goTo("") },
      ...p.map((name, i) => {
        const path = p.slice(0, i + 1).join("/")
        const last = i === p.length - 1
        return {
          id: path,
          label: name,
          onClick: last ? undefined : () => goTo(path),
          switcher: last
            ? {
                noun: "folder",
                sections: [
                  {
                    title: parent || "Files",
                    entries: siblings.map((e) => ({
                      id: parent ? `${parent}/${e.name}` : e.name,
                      label: e.name,
                      icon: "folder" as const,
                      current: e.name === name,
                    })),
                  },
                ],
                onPick: (e: { id: string }) => goTo(e.id),
              }
            : undefined,
        }
      }),
    ]
  }
  // At the home folder the header has a title; inside a folder, the trail of folders.
  const title = () => (parts().length ? undefined : "Files")
  const crumbs = () => (parts().length ? trail() : undefined)
  return (
    <ViewLayout
      id="workbench.files"
      header={
        <ViewHeader
          title={title()}
          trail={crumbs()}
          actions={[
            { id: "upload", label: "Upload", icon: "upload", onClick: () => {} },
            { id: "folder", label: "New folder", icon: "plus", onClick: () => {} },
          ]}
        />
      }
    >
      <Show when={FILES[folder()]?.length} fallback={<EmptyState title="This folder is empty" />}>
        <RowList label={folder() || "Files"}>
          <For each={FILES[folder()]}>
            {(e) => (
              <ListRow
                icon={e.kind === "folder" ? "folder" : "file"}
                title={e.name}
                meta={
                  <>
                    <Show when={e.size}>
                      <span>{e.size}</span>
                    </Show>
                    <span>{e.changed}</span>
                  </>
                }
                onClick={
                  e.kind === "folder" ? () => goTo(folder() ? `${folder()}/${e.name}` : e.name) : undefined
                }
              />
            )}
          </For>
        </RowList>
      </Show>
    </ViewLayout>
  )
}
