import { Card, type DataColumn, DataTable, NumberField, PropertyList } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import { createStore } from "solid-js/store"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Inline, in a property list and a table",
  note: "Text at rest, bg-3 on hover, the edge on focus: the row keeps its height. Drag the value sideways with a mouse to scrub; click to type.",
  surface: "well",
}

interface Pool {
  id: string
  name: string
  replicas: number
  memory: number
}

export default function InlineNumbers() {
  const [estimate, setEstimate] = createSignal<number | null>(3)
  const [budget, setBudget] = createSignal<number | null>(null)
  // A store keeps each row's identity through edits, so the field being edited stays mounted.
  const [pools, setPools] = createStore<Pool[]>([
    { id: "a", name: "eu-west", replicas: 3, memory: 4 },
    { id: "b", name: "us-east", replicas: 2, memory: 8 },
    { id: "c", name: "ap-south", replicas: 1, memory: 2 },
  ])
  const set = (id: string, patch: Partial<Pool>) => setPools((p) => p.id === id, patch)
  const columns: DataColumn<Pool>[] = [
    { id: "name", header: "Pool", accessor: (p) => p.name },
    {
      id: "replicas",
      header: "Replicas",
      type: "num",
      width: "120px",
      accessor: (p) => p.replicas,
      cell: (p) => (
        <NumberField
          variant="inline"
          aria-label={`Replicas of ${p.name}`}
          value={p.replicas}
          min={0}
          max={32}
          integer
          onChange={(v) => v !== null && set(p.id, { replicas: v })}
        />
      ),
    },
    {
      id: "memory",
      header: "Memory",
      type: "num",
      width: "120px",
      accessor: (p) => p.memory,
      cell: (p) => (
        <NumberField
          variant="inline"
          aria-label={`Memory of ${p.name}`}
          value={p.memory}
          min={1}
          unit="GB"
          onChange={(v) => v !== null && set(p.id, { memory: v })}
        />
      ),
    },
  ]
  return (
    <div class="ex-grid ex-grid--2">
      <Card title="Properties">
        <PropertyList
          items={[
            {
              label: "Estimate",
              value: (
                <NumberField
                  variant="inline"
                  aria-label="Estimate"
                  value={estimate()}
                  onChange={setEstimate}
                  min={0}
                  unit="pt"
                />
              ),
            },
            {
              label: "Budget",
              value: (
                <NumberField
                  variant="inline"
                  aria-label="Budget"
                  value={budget()}
                  onChange={setBudget}
                  min={0}
                  unit="h"
                />
              ),
            },
            { label: "Cycle", value: "Cycle 12" },
          ]}
        />
      </Card>
      <Card padding="none" title="Pools">
        <DataTable label="Pools" columns={columns} rows={pools} getRowId={(p) => p.id} />
      </Card>
    </div>
  )
}
