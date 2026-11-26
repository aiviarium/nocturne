import {
  Avatar,
  EmptyState,
  FilterBar,
  FilterCount,
  ListRow,
  RowList,
  Select,
  State,
  Tabs,
  TextField,
} from "@aiviarium/nocturne"
import { createMemo, createSignal, For, Show } from "solid-js"
import { ISSUE_STATE, ISSUES } from "../_kit/issues"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Filter, list, and an empty state only for a filtered list",
  note: "Search and filters in one FilterBar; a RowList of ListRows with one State each, shown only for the exceptional states. Type “zzz” to see the filtered empty state.",
}

export default function IssueList() {
  const [query, setQuery] = createSignal("")
  const [scope, setScope] = createSignal("open")
  const [who, setWho] = createSignal("anyone")
  const rows = createMemo(() =>
    ISSUES.filter((i) =>
      scope() === "open" ? i.state !== "done" : scope() === "closed" ? i.state === "done" : true,
    )
      .filter((i) => (who() === "me" ? i.assignee === "Sarah Chen" : true))
      .filter((i) => i.title.toLowerCase().includes(query().toLowerCase())),
  )
  return (
    <div class="ex-col">
      <FilterBar
        search={
          <TextField
            variant="search"
            label="Search issues"
            placeholder="Search issues"
            value={query()}
            onInput={(e) => setQuery(e.currentTarget.value)}
          />
        }
        end={<FilterCount value={rows().length} unit="Issues" />}
      >
        <Tabs
          label="Scope"
          value={scope()}
          onChange={setScope}
          items={[
            { id: "open", label: "Open" },
            { id: "closed", label: "Closed" },
            { id: "all", label: "All" },
          ]}
        />
        <Select
          aria-label="Assignee"
          value={who()}
          onChange={setWho}
          options={[
            { value: "anyone", label: "Anyone" },
            { value: "me", label: "Assigned to me" },
          ]}
        />
      </FilterBar>
      <Show
        when={rows().length > 0}
        fallback={
          <EmptyState
            icon="filter"
            title="No issues match"
            description={`title contains “${query()}”`}
            size="sm"
          />
        }
      >
        <RowList label="Issues">
          <For each={rows()}>
            {(i) => {
              const st = ISSUE_STATE[i.state]
              return (
                <ListRow
                  leading={i.assignee ? <Avatar name={i.assignee} size="sm" /> : undefined}
                  icon={i.assignee ? undefined : "list"}
                  title={i.title}
                  secondary={i.key}
                  status={st ? <State status={st[0]}>{st[1]}</State> : undefined}
                  meta={i.updated}
                  unread={Boolean(i.unread)}
                  onClick={() => {}}
                />
              )
            }}
          </For>
        </RowList>
      </Show>
    </div>
  )
}
