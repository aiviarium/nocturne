import { AppShell, EmptyState, Nav, SidebarHeader, ViewHeader } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Sidebar and view",
  note: "The smallest shell: a sidebar with its header and places, and the raised view surface beside it. Drag the sidebar's edge below 140px or press its minimise button to fold it to the icon rail.",
  surface: "none",
}

export default function Shell() {
  return (
    <div class="ex-shell-demo" style={{ height: "320px" }}>
      <AppShell
        foldBelow={0}
        sidebarHeader={<SidebarHeader />}
        sidebar={
          <Nav
            label="Workspace"
            groups={[
              {
                items: [
                  { label: "Home", icon: "home", href: "#app-shell" },
                  { label: "Inbox", icon: "inbox", href: "#app-shell", current: true, count: 3 },
                  { label: "Agents", icon: "agent", href: "#app-shell" },
                ],
              },
            ]}
          />
        }
      >
        <ViewHeader title="Inbox" />
        <EmptyState title="Nothing new" description="Mentions and reviews land here." />
      </AppShell>
    </div>
  )
}
