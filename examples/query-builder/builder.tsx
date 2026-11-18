import { Card, emptyQuery, printQueryText, QueryBuilder, type QueryGroup } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import { ISSUE_FIELDS } from "../_kit/query"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "The grouped builder",
  note: 'variant="builder" shows the advanced view in place, for a saved view\'s settings or a dialog. A group nests one level, with its own and/or.',
  surface: "well",
}

export default function GroupedBuilder() {
  const [query, setQuery] = createSignal<QueryGroup>({
    ...emptyQuery(),
    rules: [
      { field: "archived", op: "is", value: false },
      {
        combinator: "or",
        rules: [
          { field: "assignee", op: "is", value: "user://sarah" },
          { field: "labels", op: "anyOf", value: ["label://bug", "label://auth"] },
        ],
      },
      { field: "updatedAt", op: "withinLast", value: 14 },
    ],
  })
  return (
    <Card title="Filter">
      <QueryBuilder variant="builder" fields={ISSUE_FIELDS} value={query()} onChange={setQuery} />
      <p class="nc-meta ex-note">
        As text:{" "}
        <code class="nc-mono">{printQueryText(query(), ISSUE_FIELDS) ?? "— (groups have no text form)"}</code>
      </p>
    </Card>
  )
}
