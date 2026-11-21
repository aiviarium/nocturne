import { TabPanel, Tabs } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Underline, with counts and panels",
  note: "Moves between sections of one object. Arrow keys move and select.",
}

export default function UnderlineTabs() {
  const [section, setSection] = createSignal("all")
  return (
    <div class="ex-col">
      <Tabs
        variant="underline"
        label="Inbox"
        value={section()}
        onChange={setSection}
        items={[
          { id: "all", label: "All", count: 4 },
          { id: "mentions", label: "Mentions", count: 2 },
          { id: "assignments", label: "Assignments", count: 1 },
          { id: "comments", label: "Comments" },
          { id: "archived", label: "Archived", disabled: true },
        ]}
      >
        <TabPanel id="all">
          <span class="nc-muted">Everything addressed to you, newest first.</span>
        </TabPanel>
        <TabPanel id="mentions">
          <span class="nc-muted">Places where someone mentioned you.</span>
        </TabPanel>
        <TabPanel id="assignments">
          <span class="nc-muted">Work assigned to you.</span>
        </TabPanel>
        <TabPanel id="comments">
          <span class="nc-muted">Replies on threads you follow.</span>
        </TabPanel>
      </Tabs>
    </div>
  )
}
