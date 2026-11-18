import { Count, Nav, NavItem } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Sidebar",
  note: "Selection is an inset rounded fill, never an edge bar.",
  surface: "well",
}

export default function Sidebar() {
  return (
    <div class="ex-narrow">
      <Nav
        label="Workspace"
        groups={[
          {
            label: "Workspace",
            items: [
              { label: "Home", icon: "home", href: "#nav-item" },
              { label: "Inbox", icon: "inbox", href: "#nav-item", current: true, meta: <Count value={2} /> },
              {
                label: "Agents",
                icon: "agent",
                href: "#nav-item",
                meta: <span class="nc-state--warn">1 needs you</span>,
              },
              { label: "Projects", icon: "board", href: "#nav-item", meta: "12" },
            ],
          },
          { label: "Settings", items: [{ label: "Preferences", icon: "settings", href: "#nav-item" }] },
        ]}
      />
      <NavItem label="A button row" icon="bolt" onClick={() => {}} />
    </div>
  )
}
