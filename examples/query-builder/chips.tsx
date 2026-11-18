import {
  FilterBar,
  FilterCount,
  ListRow,
  matchQuery,
  QueryBuilder,
  type QueryGroup,
  RowList,
  TextField,
  toWhere,
} from "@aiviarium/nocturne"
import { createMemo, createSignal, For, Show } from "solid-js"
import { PeoplePicker } from "../_kit/people-picker"
import { ISSUE_FIELDS, PEOPLE, QUERY_ISSUES, startingQuery } from "../_kit/query"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Chips in a filter bar",
  note: "A chip per rule opens a popover to edit it; Filter adds one, the sliders button opens the grouped builder and its text form. Arrow keys move between chips, Delete removes one. Assignee uses a picker of its own (renderPicker). Below, the store's where it maps to.",
}

const NOW = new Date("2026-11-16T12:00:00Z")

export default function QueryChips() {
  const [query, setQuery] = createSignal<QueryGroup>(startingQuery())
  const [search, setSearch] = createSignal("")
  const converted = createMemo(() => toWhere(query(), ISSUE_FIELDS, { now: NOW, utc: true }))
  const rows = createMemo(() =>
    QUERY_ISSUES.filter((i) => matchQuery(query(), ISSUE_FIELDS, i as never, { now: NOW, utc: true })).filter(
      (i) => i.title.toLowerCase().includes(search().toLowerCase()),
    ),
  )
  return (
    <div class="ex-col">
      <FilterBar
        search={
          <TextField
            variant="search"
            label="Search issues"
            placeholder="Search issues"
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
          />
        }
        end={<FilterCount value={rows().length} icon="list" unit="Issues" />}
      >
        <QueryBuilder
          fields={ISSUE_FIELDS}
          value={query()}
          onChange={setQuery}
          renderPicker={(ctx) => (ctx.field.type === "person" ? <PeoplePicker {...ctx} /> : undefined)}
        />
      </FilterBar>
      <RowList label="Issues">
        <For each={rows()}>
          {(i) => (
            <ListRow
              icon="list"
              title={i.title}
              secondary={i.key}
              meta={PEOPLE.find((p) => p.value === i.assignee)?.label.split(" ")[0] ?? "—"}
            />
          )}
        </For>
      </RowList>
      <pre class="nc-code ex-json" data-part="query-where">
        {JSON.stringify(converted().where, null, 2)}
        <Show when={converted().residual}>{"\n// and in memory: text contains"}</Show>
      </pre>
    </div>
  )
}
