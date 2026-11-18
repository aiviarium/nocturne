import { FilterBar, Select, Switch, Tabs, TextField } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Search, segments, a select and a switch" }

export default function IssueFilters() {
  const [scope, setScope] = createSignal("open")
  const [unread, setUnread] = createSignal(false)
  return (
    <FilterBar
      search={<TextField variant="search" label="Search issues" placeholder="Search issues" />}
      end={<span>40 issues</span>}
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
        placeholder="Assignee"
        options={[
          { value: "me", label: "Assigned to me" },
          { value: "anyone", label: "Anyone" },
        ]}
      />
      <Switch label="Unread" checked={unread()} onChange={setUnread} />
    </FilterBar>
  )
}
