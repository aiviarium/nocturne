import { Count, Nav } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "The project is the hub",
  note: "Issues, docs, agent sessions and environments sit inside the project, contributed by the modules that own them.",
  surface: "well",
}

export default function ProjectHub() {
  return (
    <div class="ex-narrow">
      <Nav
        label="Sidebar"
        groups={[
          {
            label: "Atlas web",
            items: [
              { label: "Overview", icon: "home", href: "#hub" },
              { label: "Issues", icon: "list", href: "#hub", current: true, meta: <Count value={3} /> },
              { label: "Docs", icon: "file", href: "#hub" },
              {
                label: "Agent sessions",
                icon: "agent",
                href: "#hub",
                meta: <span class="nc-state--warn">1 needs you</span>,
              },
              { label: "Environments", icon: "server", href: "#hub" },
            ],
          },
          { label: "Projects", items: [{ label: "Hosts", icon: "board", href: "#hub" }] },
        ]}
      />
    </div>
  )
}
