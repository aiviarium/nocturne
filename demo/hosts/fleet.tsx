// Hosts: the fleet as a table, each row entering its host, and the dialog that adds one.
import {
  Button,
  type DataColumn,
  DataTable,
  Dialog,
  EmptyState,
  type RowMenuEntry,
  reorderItems,
  Select,
  ShellViewHeader,
  type ShellViewProps,
  State,
  TextField,
  toast,
  ViewLayout,
} from "@aiviarium/nocturne"
import { createSignal, Show } from "solid-js"
import { useDemo } from "../context"
import type { Host } from "../data"
import { askName, copyLink, demoShell, named, renameEntry, undoable } from "../menus"
import { addHost, factsOf, hosts, REGIONS, removeHosts, renameHost, sessionsOf, setHosts } from "./data"
import { HostPanels } from "./panels"

const STATE = {
  online: { dot: "ok", label: "Online" },
  degraded: { dot: "warn", label: "Degraded" },
  offline: { dot: "off", label: "Offline" },
} as const

const COLUMNS: DataColumn<Host>[] = [
  { id: "name", header: "Host", accessor: (h) => h.name, type: "mono", sortable: true },
  {
    id: "state",
    header: "State",
    accessor: (h) => h.state,
    sortable: true,
    width: "120px",
    // Online is the usual: only the unusual states show.
    cell: (h) =>
      h.state === "online" ? null : <State status={STATE[h.state].dot}>{STATE[h.state].label}</State>,
  },
  { id: "region", header: "Region", accessor: (h) => h.region, sortable: true, width: "96px" },
  {
    id: "os",
    header: "System",
    accessor: (h) => `${factsOf(h.id).os} · ${factsOf(h.id).arch}`,
    width: "160px",
  },
  {
    id: "cpu",
    header: "CPU",
    accessor: (h) => (h.state === "offline" ? null : `${factsOf(h.id).cpu}%`),
    sortValue: (h) => factsOf(h.id).cpu,
    type: "num",
    sortable: true,
    width: "72px",
  },
  {
    id: "sessions",
    header: "Sessions",
    accessor: (h) => sessionsOf(h.id).filter((s) => s.state === "running").length || null,
    type: "num",
    width: "88px",
  },
]

const remove = (list: Host[]) =>
  undoable(
    `Removed ${named(
      list.map((h) => h.name),
      "hosts",
    )}`,
    removeHosts(list.map((h) => h.id)),
  )
const restart = (list: Host[]) =>
  toast({ title: `Restarting ${list.length === 1 ? list[0]!.name : `${list.length} hosts`}` })

/** The menu of a host, or of several: in the fleet's table and on its entry in the sidebar. */
export function hostMenu(list: Host[]): RowMenuEntry[] {
  const h = list[0]
  if (!h) return []
  if (list.length > 1)
    return [
      { type: "label", label: `${list.length} selected` },
      { id: "restart", label: `Restart ${list.length}`, icon: "rotate-ccw", onSelect: () => restart(list) },
      { type: "separator" },
      {
        id: "delete",
        label: `Remove ${list.length}`,
        icon: "trash",
        danger: true,
        onSelect: () => remove(list),
      },
    ]
  return [
    { id: "open", label: "Open", icon: "arrow-up-right", onSelect: () => demoShell().go(`/hosts/${h.id}`) },
    {
      id: "logs",
      label: "Logs",
      icon: "logs",
      onSelect: () => demoShell().go(`/hosts/${h.id}/operate/logs`),
    },
    { id: "copy", label: "Copy link", icon: "link", onSelect: () => copyLink(h.name, `/hosts/${h.id}`) },
    renameEntry(() =>
      askName({
        title: "Rename host",
        value: h.name,
        submit: "Rename",
        onSubmit: (n) => renameHost(h.id, n),
      }),
    ),
    { id: "restart", label: "Restart", icon: "rotate-ccw", onSelect: () => restart([h]) },
    { type: "separator" },
    { id: "delete", label: "Remove", icon: "trash", danger: true, onSelect: () => remove([h]) },
  ]
}

/** The address names a host that is gone: the shell falls back to the module's view with it left over. */
const gone = (props: ShellViewProps) => {
  const id = props.shell.options.router.path().split(/[/?#]/).filter(Boolean)[1]
  return !!id && !id.startsWith("@") && !hosts().some((h) => h.id === id)
}

const LAYOUTS = [
  { value: "table", label: "Table" },
  { value: "panels", label: "Panels" },
]
const LAYOUT_KEY = "demo/hosts/layout"

/** The Hosts module's view: the fleet as a table, or as a panel per host with its live meters. */
export function FleetView(props: ShellViewProps) {
  const demo = useDemo()
  const [layout, setLayout] = createSignal(demo.storage.get(LAYOUT_KEY) === "panels" ? "panels" : "table")
  const [adding, setAdding] = createSignal(false)
  const [selected, setSelected] = createSignal<string[]>([])
  return (
    <ViewLayout
      id="demo.hosts"
      header={
        <ShellViewHeader
          title="Hosts"
          actions={[{ id: "add", label: "Add host", icon: "plus", onClick: () => setAdding(true) }]}
        >
          <Select
            label="Layout"
            inline
            options={LAYOUTS}
            value={layout()}
            onChange={(v) => {
              setLayout(v)
              demo.storage.set(LAYOUT_KEY, v)
            }}
          />
        </ShellViewHeader>
      }
    >
      <Show when={!gone(props)} fallback={<EmptyState title="This host was removed" />}>
        <Show when={layout() === "table"} fallback={<HostPanels shell={props.shell} />}>
          <DataTable
            label="Hosts"
            bare
            rows={hosts()}
            columns={COLUMNS}
            getRowId={(h) => h.id}
            rowLabel={(h) => h.name}
            selectable
            selected={selected()}
            onSelectionChange={setSelected}
            onRowClick={(h) => props.shell.go(`/hosts/${h.id}`)}
            onReorder={(from, to) => setHosts(reorderItems(hosts(), from, to))}
            onRemove={(ids) => removeHosts(ids)}
            rowMenu={(t) => hostMenu(t.rows)}
            bulkActions={(rows) => (
              <Button size="sm" variant="ghost" icon="rotate-ccw" onClick={() => restart(rows)}>
                Restart {rows.length}
              </Button>
            )}
            empty={{ title: "No hosts" }}
          />
        </Show>
      </Show>
      <AddHost
        open={adding()}
        onClose={() => setAdding(false)}
        onAdd={(id) => {
          setAdding(false)
          props.shell.go(`/hosts/${id}`)
        }}
      />
    </ViewLayout>
  )
}

function AddHost(props: { open: boolean; onClose: () => void; onAdd: (id: string) => void }) {
  const [name, setName] = createSignal("")
  const [region, setRegion] = createSignal(REGIONS[0]!)
  const taken = () => hosts().some((h) => h.name === name().trim())
  const submit = () => {
    if (!name().trim() || taken()) return
    const id = addHost(name().trim(), region())
    setName("")
    props.onAdd(id)
  }
  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title="Add host"
      size="sm"
      closeOnBackdrop={!name()}
      footer={
        <>
          <Button variant="ghost" onClick={props.onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!name().trim() || taken()} onClick={submit}>
            Add host
          </Button>
        </>
      }
    >
      <form
        class="dm-col"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <TextField
          label="Name"
          mono
          placeholder="build-03"
          value={name()}
          error={taken() ? "A host has this name" : undefined}
          onInput={(e) => setName(e.currentTarget.value)}
        />
        <Select
          label="Region"
          options={REGIONS.map((r) => ({ value: r, label: r }))}
          value={region()}
          onChange={setRegion}
        />
      </form>
    </Dialog>
  )
}
