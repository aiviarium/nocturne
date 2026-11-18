import {
  FilterBar,
  ListRow,
  matchQuery,
  QueryBuilder,
  type QueryGroup,
  RowList,
  TextField,
} from "@aiviarium/nocturne"
import { createMemo, createSignal, For } from "solid-js"
import { ISSUE_FIELDS, QUERY_ISSUES, startingQuery } from "../_kit/query"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "On a phone",
  note: "Chips scroll sideways under the search field, Filter first. A chip or Filter opens one sheet of grouped rows: a page per rule with its condition and value; swipe a rule to remove it.",
  phone: true,
  height: 640,
}

const NOW = new Date("2026-11-16T12:00:00Z")

export default function PhoneQuery() {
  const [query, setQuery] = createSignal<QueryGroup>(startingQuery())
  const rows = createMemo(() =>
    QUERY_ISSUES.filter((i) => matchQuery(query(), ISSUE_FIELDS, i as never, { now: NOW, utc: true })),
  )
  return (
    <div class="ex-col">
      <FilterBar search={<TextField variant="search" label="Search issues" placeholder="Search issues" />}>
        <QueryBuilder fields={ISSUE_FIELDS} value={query()} onChange={setQuery} />
      </FilterBar>
      <RowList label="Issues">
        <For each={rows()}>{(i) => <ListRow icon="list" title={i.title} secondary={i.key} />}</For>
      </RowList>
    </div>
  )
}
