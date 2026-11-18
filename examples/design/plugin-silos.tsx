import { Nav } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Each module its own section",
  note: "The same things, filed by the module that made them: the person has to know which module holds the project's issues.",
  surface: "well",
}

export default function PluginSilos() {
  return (
    <div class="ex-narrow">
      <Nav
        label="Sidebar"
        groups={[
          {
            label: "Issues module",
            items: [
              { label: "All issues", icon: "list", href: "#silo", current: true },
              { label: "Atlas web issues", icon: "list", href: "#silo" },
            ],
          },
          { label: "Docs module", items: [{ label: "All pages", icon: "file", href: "#silo" }] },
          { label: "Agents module", items: [{ label: "Sessions", icon: "agent", href: "#silo" }] },
          { label: "Environments module", items: [{ label: "Hosts", icon: "server", href: "#silo" }] },
        ]}
      />
    </div>
  )
}
