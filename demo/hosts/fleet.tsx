// Hosts: the fleet as a table, each row entering its host, and the dialog that adds one.
import {
  Button,
  type DataColumn,
  DataTable,
  Dialog,
  Select,
  ShellViewHeader,
  type ShellViewProps,
  State,
  TextField,
  ViewLayout,
} from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { Host } from "../data"
import { addHost, factsOf, hosts, REGIONS, sessionsOf } from "./data"

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

/** The Hosts module's view. */
export function FleetView(props: ShellViewProps) {
  const [adding, setAdding] = createSignal(false)
  return (
    <ViewLayout
      id="demo.hosts"
      header={
        <ShellViewHeader
          title="Hosts"
          actions={[{ id: "add", label: "Add host", icon: "plus", onClick: () => setAdding(true) }]}
        />
      }
    >
      <DataTable
        label="Hosts"
        bare
        rows={hosts()}
        columns={COLUMNS}
        getRowId={(h) => h.id}
        onRowClick={(h) => props.shell.go(`/hosts/${h.id}`)}
        rowMenu={() => [
          { id: "open", label: "Open", icon: "arrow-up-right" },
          { id: "logs", label: "Logs", icon: "logs" },
        ]}
        onRowMenuSelect={(id, t) =>
          props.shell.go(`/hosts/${t.ids[0]}${id === "logs" ? "/operate/logs" : ""}`)
        }
      />
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
