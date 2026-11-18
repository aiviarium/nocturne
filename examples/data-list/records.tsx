import { Button, DataList, type DataListField } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Records edited as a table",
  note: 'variant="table" with selectable: the checkbox, a click on a row\'s edge (Cmd or Ctrl toggles, Shift extends), or Space on a focused row selects; the bar at the foot shows only while something is selected. Right-click a row, or press the Menu key or Shift+F10: on a row of the selection the menu acts on all of it. Escape leaves a field for its row; Delete removes, with Undo.',
  toasts: true,
}

interface Variable {
  name: string
  value: string
  scope: string
}

const FIELDS: DataListField<Variable>[] = [
  {
    id: "name",
    label: "Name",
    placeholder: "NAME",
    mono: true,
    width: "minmax(0, 2fr)",
    value: (v) => v.name,
    set: (v, name) => ({ ...v, name: name.toUpperCase().replace(/[^A-Z0-9_]/g, "_") }),
  },
  {
    id: "value",
    label: "Value",
    placeholder: "value",
    mono: true,
    width: "minmax(0, 3fr)",
    value: (v) => v.value,
    set: (v, value) => ({ ...v, value }),
  },
  {
    id: "scope",
    label: "Scope",
    placeholder: "all",
    width: "minmax(0, 1fr)",
    value: (v) => v.scope,
    set: (v, scope) => ({ ...v, scope }),
  },
]

export default function Records() {
  const [env, setEnv] = createSignal<Variable[]>([
    { name: "NODE_ENV", value: "production", scope: "all" },
    { name: "APP_BIND", value: "0.0.0.0:8080", scope: "web" },
    { name: "DATABASE_URL", value: "postgres://app@db/app", scope: "web" },
    { name: "RUST_LOG", value: "info,app=debug", scope: "worker" },
    { name: "S3_BUCKET", value: "app-uploads", scope: "all" },
  ])
  const scope = (indices: number[], to: string) =>
    setEnv(env().map((v, i) => (indices.includes(i) ? { ...v, scope: to } : v)))
  return (
    <DataList
      variant="table"
      label="Environment"
      itemName="Variable"
      itemLabel={(v, i) => v.name || `Variable ${i + 1}`}
      value={env()}
      onChange={setEnv}
      create={() => ({ name: "", value: "", scope: "" })}
      fields={FIELDS}
      selectable
      bulkActions={(_, indices) => (
        <Button size="sm" variant="ghost" onClick={() => scope(indices, "web")}>
          Scope to web
        </Button>
      )}
      rowMenu={({ indices }) => {
        const n = indices.length
        const count = n > 1 ? ` ${n}` : ""
        return [
          ...(n > 1 ? [{ type: "label" as const, label: `${n} selected` }] : []),
          { id: "web", label: `Scope to web${count}`, onSelect: () => scope(indices, "web") },
          { id: "all", label: `Scope to all${count}`, onSelect: () => scope(indices, "all") },
          { type: "separator" },
          // The list's own Delete (with Undo): an entry with id "delete" and no onSelect.
          { id: "delete", label: `Delete${count}`, icon: "trash", danger: true },
        ]
      }}
    />
  )
}
