import { Checkbox, Count, Nav, RadioGroup, Switch, Tabs } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Tabs, selection, navigation" }

export default function SelectionAndNavigation() {
  const [tab, setTab] = createSignal("all")
  return (
    <div class="ex-col">
      <Tabs
        label="Filter"
        items={[
          { id: "active", label: "Active" },
          { id: "backlog", label: "Backlog" },
          { id: "all", label: "All issues" },
        ]}
        value={tab()}
        onChange={setTab}
      />
      <Tabs
        variant="underline"
        label="Inbox"
        items={[
          { id: "all", label: "All", count: 4 },
          { id: "m", label: "Mentions", count: 2 },
          { id: "c", label: "Comments" },
        ]}
      />
      <div class="nc-row ex-gap-lg">
        <Switch label="Unread only" defaultChecked />
        <Checkbox label="Notify assignee" defaultChecked />
        <RadioGroup
          label="View"
          defaultValue="board"
          options={[
            { value: "board", label: "Board" },
            { value: "list", label: "List" },
          ]}
        />
      </div>
      <Nav
        label="Sidebar"
        groups={[
          {
            label: "Workspace",
            items: [
              { label: "Home", icon: "home", href: "#/overview" },
              {
                label: "Inbox",
                icon: "inbox",
                href: "#/overview",
                current: true,
                meta: <Count value={2} />,
              },
            ],
          },
        ]}
      />
    </div>
  )
}
