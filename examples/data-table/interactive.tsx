import { Button, DataTable, IconButton, type RowDensity, Tabs, TextField } from "@aiviarium/nocturne"
import { createEffect, createSignal } from "solid-js"
import { HOST_SESSIONS, SESSION_COLUMNS } from "../_kit/sessions"
import { useDensity } from "../_kit/settings"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Interactive",
  note: "Select a row to turn the toolbar into the bulk bar. Esc clears. Sort by state, started or output.",
  surface: "none",
}

export default function SessionsTable() {
  const pageDensity = useDensity()
  const [density, setDensity] = createSignal<RowDensity>(pageDensity())
  createEffect(pageDensity, (density) => {
    setDensity(density)
  })
  const [query, setQuery] = createSignal("")
  const rows = () => HOST_SESSIONS.filter((s) => s.title.toLowerCase().includes(query().toLowerCase()))
  return (
    <DataTable
      label="Sessions"
      rows={rows()}
      columns={SESSION_COLUMNS}
      getRowId={(r) => r.id}
      selectable
      density={density()}
      empty={{
        title: "No sessions match",
        description: `name contains “${query()}”`,
        onClearFilters: () => setQuery(""),
      }}
      toolbar={
        <div class="nc-row ex-toolbar">
          <TextField
            variant="search"
            label="Filter sessions"
            placeholder="Filter…"
            value={query()}
            onInput={(e) => setQuery(e.currentTarget.value)}
          />
          <span class="ex-spacer" />
          <Tabs
            label="Density"
            items={[
              { id: "compact", label: "Compact" },
              { id: "comfortable", label: "Comfortable" },
            ]}
            value={density()}
            onChange={(id) => setDensity(id as RowDensity)}
          />
          <IconButton label="New session" icon="plus" />
        </div>
      }
      bulkActions={() => (
        <>
          <Button size="sm">Send signal</Button>
          <Button size="sm">Copy IDs</Button>
          <Button size="sm" variant="danger">
            Delete
          </Button>
        </>
      )}
      footer={<span class="nc-meta">1–{rows().length} of 124</span>}
    />
  )
}
