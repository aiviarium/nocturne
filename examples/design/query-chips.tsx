import { FilterBar, QueryBuilder } from "@aiviarium/nocturne"
import { ISSUE_FIELDS, startingQuery } from "../_kit/query"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Filters as chips in the bar",
  note: "Only the filters in use take room, each says what it does, and the rest is one Filter button away.",
}

export default function QueryChipsGood() {
  return (
    <FilterBar>
      <QueryBuilder fields={ISSUE_FIELDS} defaultValue={startingQuery()} />
    </FilterBar>
  )
}
